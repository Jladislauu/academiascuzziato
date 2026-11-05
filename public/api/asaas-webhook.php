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
            $matriculaId = garantirCobranca($pdo, $payment, $agoraTexto);
            if ($matriculaId !== false) {
                $emailMatricula = ativarMatriculaPaga($pdo, $matriculaId, (string) ($payment['id'] ?? ''), $agoraTexto);
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
    avisarMatriculaConfirmada($config, $emailMatricula);
}
exit;
