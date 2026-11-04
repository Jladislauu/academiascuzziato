<?php

declare(strict_types=1);

/*
 * Webhook do Asaas (matrícula online): confirma pagamento, marca inadimplência
 * e cancelamento. Configurar em Integrações → Webhooks no Asaas, apontando
 * para esta URL (ver DEPLOY.md para os eventos a marcar).
 *
 * Segurança: só aceita POST com o cabeçalho asaas-access-token igual ao
 * token_webhook do config.local.php. Idempotente pela tabela asaas_eventos:
 * o mesmo evento (pelo id mandado pelo Asaas) nunca é processado duas vezes.
 * Responde 200 rápido; o e-mail de aviso sai depois, sem atrasar a resposta.
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

if ($eventoId === '') {
    // Sem id para checar duplicidade: processa, mas não há como ser idempotente.
    error_log('asaas-webhook.php: evento sem id (' . $tipo . ')');
} else {
    try {
        $pdo->prepare('INSERT INTO asaas_eventos (id, tipo, recebido_em) VALUES (?, ?, ?)')
            ->execute([$eventoId, $tipo, $agora->format('Y-m-d H:i:s')]);
    } catch (PDOException $e) {
        if ((string) $e->getCode() === '23000') {
            // Evento já processado antes: responde ok sem repetir o efeito.
            responder(200, ['ok' => true]);
        }
        error_log('asaas-webhook.php: erro ao gravar evento: ' . $e->getMessage());
        responder(500, ['ok' => false]);
    }
}

$agoraTexto = $agora->format('Y-m-d H:i:s');
$emailMatricula = null; // definido só quando uma matrícula é ativada por este evento

try {
    switch ($tipo) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
            $paymentId = (string) ($corpo['payment']['id'] ?? '');
            $status = (string) ($corpo['payment']['status'] ?? $tipo);
            if ($paymentId !== '') {
                $pdo->prepare('UPDATE cobrancas SET status = ?, pago_em = COALESCE(pago_em, ?) WHERE asaas_payment_id = ?')
                    ->execute([$status, $agoraTexto, $paymentId]);

                $cobranca = $pdo->prepare('SELECT matricula_id FROM cobrancas WHERE asaas_payment_id = ?');
                $cobranca->execute([$paymentId]);
                $matriculaId = $cobranca->fetchColumn();

                if ($matriculaId !== false) {
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
            }
            break;

        case 'PAYMENT_OVERDUE':
            $paymentId = (string) ($corpo['payment']['id'] ?? '');
            if ($paymentId !== '') {
                $pdo->prepare('UPDATE cobrancas SET status = ? WHERE asaas_payment_id = ?')->execute(['OVERDUE', $paymentId]);

                $cobranca = $pdo->prepare('SELECT matricula_id FROM cobrancas WHERE asaas_payment_id = ?');
                $cobranca->execute([$paymentId]);
                $matriculaId = $cobranca->fetchColumn();
                if ($matriculaId !== false) {
                    $pdo->prepare("UPDATE matriculas SET status = 'inadimplente' WHERE id = ? AND status = 'ativa'")
                        ->execute([$matriculaId]);
                }
            }
            break;

        case 'PAYMENT_CREATED':
            $paymentId = (string) ($corpo['payment']['id'] ?? '');
            $subscriptionId = (string) ($corpo['payment']['subscription'] ?? '');
            if ($paymentId !== '' && $subscriptionId !== '') {
                $matriculaExistente = $pdo->prepare('SELECT id FROM matriculas WHERE asaas_subscription_id = ?');
                $matriculaExistente->execute([$subscriptionId]);
                $matriculaId = $matriculaExistente->fetchColumn();

                if ($matriculaId !== false) {
                    $jaExiste = $pdo->prepare('SELECT COUNT(*) FROM cobrancas WHERE asaas_payment_id = ?');
                    $jaExiste->execute([$paymentId]);
                    if ((int) $jaExiste->fetchColumn() === 0) {
                        $pdo->prepare(
                            'INSERT INTO cobrancas (matricula_id, asaas_payment_id, vencimento, valor, status, link_fatura, criado_em)
                             VALUES (?, ?, ?, ?, ?, ?, ?)'
                        )->execute([
                            $matriculaId,
                            $paymentId,
                            (string) ($corpo['payment']['dueDate'] ?? $agora->format('Y-m-d')),
                            (string) ($corpo['payment']['value'] ?? '0'),
                            (string) ($corpo['payment']['status'] ?? 'PENDING'),
                            (string) ($corpo['payment']['invoiceUrl'] ?? ''),
                            $agoraTexto,
                        ]);
                    }
                }
            }
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
} catch (Throwable $e) {
    error_log("asaas-webhook.php: falha ao processar {$tipo}: " . $e->getMessage());
    // O evento já ficou gravado em asaas_eventos; responde 200 para o Asaas não reenviar
    // (reenvio reprocessaria o mesmo estado e cairia no mesmo erro).
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
