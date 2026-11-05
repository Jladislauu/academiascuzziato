<?php

declare(strict_types=1);

/*
 * Webhook do Asaas (matrícula online): confirma pagamento, marca inadimplência
 * e cancelamento. Configurar em Integrações → Webhooks no Asaas, apontando
 * para esta URL (ver DEPLOY.md para os eventos a marcar).
 *
 * Segurança: só aceita POST com o cabeçalho asaas-access-token igual ao
 * token_webhook do config.local.php.
 *
 * Idempotente e atômico: grava o evento em asaas_eventos e aplica o efeito na
 * MESMA transação. Evento já processado (mesmo id) responde 200 sem repetir o
 * efeito; se o efeito falhar, a transação desfaz tudo (nem o evento fica
 * gravado) e responde 500, para o Asaas reenviar depois.
 */

require __DIR__ . '/inc/comum.php';
require __DIR__ . '/inc/matriculas.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function responder(int $status, array $corpo): void
{
    http_response_code($status);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Garante a linha da cobrança a partir do objeto `payment` do webhook, achando
 * a matrícula pela assinatura (payment.subscription). Cobrança que já existe
 * (mesmo asaas_payment_id) é atualizada; o resto dos eventos (cobrança
 * confirmada, recebida, vencida) só aplica o efeito depois de garantir que a
 * cobrança está gravada, mesmo que o evento "cobrança criada" nunca tenha chegado.
 *
 * @return int|false id da matrícula, ou false se a assinatura não é nossa (ex.: link antigo) — regista e ignora.
 */
function garantirCobranca(PDO $pdo, array $payment, string $agoraTexto): int|false
{
    $subscriptionId = (string) ($payment['subscription'] ?? '');
    $paymentId = (string) ($payment['id'] ?? '');
    if ($subscriptionId === '' || $paymentId === '') {
        return false;
    }

    $matricula = $pdo->prepare('SELECT id FROM matriculas WHERE asaas_subscription_id = ?');
    $matricula->execute([$subscriptionId]);
    $matriculaId = $matricula->fetchColumn();
    if ($matriculaId === false) {
        return false;
    }

    $pdo->prepare(
        'INSERT INTO cobrancas (matricula_id, asaas_payment_id, vencimento, valor, status, link_fatura, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE vencimento = VALUES(vencimento), valor = VALUES(valor),
             status = VALUES(status), link_fatura = VALUES(link_fatura)'
    )->execute([
        $matriculaId,
        $paymentId,
        (string) ($payment['dueDate'] ?? date('Y-m-d')),
        (string) ($payment['value'] ?? '0'),
        (string) ($payment['status'] ?? 'PENDING'),
        (string) ($payment['invoiceUrl'] ?? ''),
        $agoraTexto,
    ]);

    return (int) $matriculaId;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responder(405, ['ok' => false, 'erro' => 'Método não permitido.']);
}

try {
    $config = carregarConfig();
    $pdo = conectar($config);
} catch (Throwable $e) {
    error_log('asaas-webhook.php: ' . $e->getMessage());
    responder(500, ['ok' => false]);
}

$tokenEsperado = (string) ($config['asaas']['token_webhook'] ?? '');
$tokenRecebido = $_SERVER['HTTP_ASAAS_ACCESS_TOKEN'] ?? '';
if ($tokenEsperado === '' || !hash_equals($tokenEsperado, (string) $tokenRecebido)) {
    error_log('asaas-webhook.php: token inválido ou ausente');
    responder(401, ['ok' => false]);
}

$bruto = file_get_contents('php://input', false, null, 0, 100000);
$corpo = json_decode($bruto === false ? '' : $bruto, true);
if (!is_array($corpo) || !isset($corpo['event'])) {
    responder(400, ['ok' => false]);
}

$eventoId = (string) ($corpo['id'] ?? '');
$tipo = (string) $corpo['event'];
$agora = agora();
$agoraTexto = $agora->format('Y-m-d H:i:s');
$emailMatricula = null; // definido só quando uma matrícula é ativada por este evento

try {
    $pdo->beginTransaction();

    if ($eventoId === '') {
        // Sem id para checar duplicidade: aplica o efeito, mas não há como ser idempotente.
        error_log('asaas-webhook.php: evento sem id (' . $tipo . ')');
    } else {
        try {
            $pdo->prepare('INSERT INTO asaas_eventos (id, tipo, recebido_em) VALUES (?, ?, ?)')
                ->execute([$eventoId, $tipo, $agoraTexto]);
        } catch (PDOException $e) {
            if ((string) $e->getCode() === '23000') {
                // Evento já processado antes: desfaz (nada tinha sido gravado) e responde ok sem repetir o efeito.
                $pdo->rollBack();
                responder(200, ['ok' => true]);
            }
            throw $e;
        }
    }

    switch ($tipo) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
            $payment = (array) ($corpo['payment'] ?? []);
            $paymentId = (string) ($payment['id'] ?? '');
            $matriculaId = garantirCobranca($pdo, $payment, $agoraTexto);

            if ($matriculaId !== false && $paymentId !== '') {
                $pdo->prepare('UPDATE cobrancas SET pago_em = COALESCE(pago_em, ?) WHERE asaas_payment_id = ?')
                    ->execute([$agoraTexto, $paymentId]);

                $matriculaAtual = $pdo->prepare('SELECT status, ativada_em FROM matriculas WHERE id = ?');
                $matriculaAtual->execute([$matriculaId]);
                $linha = $matriculaAtual->fetch();

                if ($linha && in_array($linha['status'], ['aguardando_pagamento', 'inadimplente'], true)) {
                    $pdo->prepare('UPDATE matriculas SET status = ?, ativada_em = COALESCE(ativada_em, ?) WHERE id = ?')
                        ->execute(['ativa', $agoraTexto, $matriculaId]);

                    if ($linha['ativada_em'] === null) {
                        $aluno = $pdo->prepare(
                            'SELECT a.nome, a.whatsapp, a.responsavel_nome, m.plano_id, m.valor
                             FROM alunos a JOIN matriculas m ON m.aluno_id = a.id WHERE m.id = ?'
                        );
                        $aluno->execute([$matriculaId]);
                        $emailMatricula = $aluno->fetch() ?: null;
                    }
                }
            }
            break;

        case 'PAYMENT_OVERDUE':
            $payment = (array) ($corpo['payment'] ?? []);
            $matriculaId = garantirCobranca($pdo, $payment, $agoraTexto);
            if ($matriculaId !== false) {
                $pdo->prepare("UPDATE matriculas SET status = 'inadimplente' WHERE id = ? AND status = 'ativa'")
                    ->execute([$matriculaId]);
            }
            break;

        case 'PAYMENT_CREATED':
            // Só garante que a cobrança está gravada; o efeito É a própria gravação.
            garantirCobranca($pdo, (array) ($corpo['payment'] ?? []), $agoraTexto);
            break;

        case 'SUBSCRIPTION_DELETED':
            $subscriptionId = (string) ($corpo['subscription']['id'] ?? '');
            if ($subscriptionId !== '') {
                $pdo->prepare("UPDATE matriculas SET status = 'cancelada', cancelada_em = COALESCE(cancelada_em, ?) WHERE asaas_subscription_id = ? AND status <> 'cancelada'")
                    ->execute([$agoraTexto, $subscriptionId]);
            }
            break;

        default:
            // Evento reconhecido pelo Asaas mas sem efeito aqui: fica registrado em asaas_eventos e é ignorado.
            break;
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("asaas-webhook.php: falha ao processar {$tipo}: " . $e->getMessage());
    // Nada ficou gravado (nem o evento em asaas_eventos): responde 500 para o Asaas reenviar.
    responder(500, ['ok' => false]);
}

responderEContinuar(200, ['ok' => true]);

if ($emailMatricula) {
    enviarEmail(
        $config,
        "Matrícula confirmada: {$emailMatricula['nome']}",
        implode("\n", array_filter([
            'O pagamento da primeira mensalidade foi aprovado — a matrícula está ativa.',
            '',
            "Aluno: {$emailMatricula['nome']}",
            $emailMatricula['responsavel_nome'] ? "Responsável: {$emailMatricula['responsavel_nome']}" : null,
            'Plano: ' . $emailMatricula['plano_id'],
            'Valor: R$ ' . number_format((float) $emailMatricula['valor'], 2, ',', '.') . '/mês',
            'WhatsApp: ' . formatarWhatsapp((string) $emailMatricula['whatsapp']),
            "Conversar: https://wa.me/55{$emailMatricula['whatsapp']}",
        ], fn ($linha) => $linha !== null))
    );
}
exit;
