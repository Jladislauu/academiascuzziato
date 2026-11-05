<?php

declare(strict_types=1);

/*
 * Cancela matrículas abandonadas: `aguardando_pagamento` há mais de
 * `matricula.diasAbandono` dias (padrão 7, em src/data/matricula.ts). Cancela
 * a assinatura no Asaas e marca a matrícula como `cancelada` no banco.
 *
 * Antes de cancelar, confere no Asaas se alguma cobrança da assinatura já foi
 * paga (RECEIVED, CONFIRMED ou RECEIVED_IN_CASH): se foi, o webhook nunca
 * chegou (ou falhou) — em vez de cancelar, grava a cobrança e ativa a
 * matrícula com a mesma lógica do webhook (ativarMatriculaPaga, em
 * public/api/inc/matriculas.php), e registra no log que o webhook não tinha chegado.
 *
 * Só roda por linha de comando (cron da Hostinger — ver DEPLOY.md). Pela web,
 * responde 404 como qualquer outro arquivo de servidor.
 *
 * Idempotente: se a consulta ao Asaas falhar, ou se a assinatura já não
 * existir (cancelada noutro lugar), ou se o cancelamento falhar por qualquer
 * outro motivo, a matrícula NÃO é marcada como cancelada agora — fica para a
 * próxima execução, para nunca perder de vista uma assinatura que ainda
 * possa estar cobrando.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../inc/comum.php';
require __DIR__ . '/../inc/asaas.php';
require __DIR__ . '/../inc/matriculas.php';

try {
    $config = carregarConfig();
    $matricula = carregarMatricula();
    $pdo = conectar($config);
} catch (Throwable $e) {
    fwrite(STDERR, 'cancelar-matriculas-abandonadas: ' . $e->getMessage() . "\n");
    exit(1);
}

$agora = agora();
$diasAbandono = (int) ($matricula['diasAbandono'] ?? 7);
$limite = $agora->modify("-{$diasAbandono} days")->format('Y-m-d H:i:s');

$pendentes = $pdo->prepare(
    "SELECT id, asaas_subscription_id FROM matriculas WHERE status = 'aguardando_pagamento' AND criado_em < ?"
);
$pendentes->execute([$limite]);
$linhas = $pendentes->fetchAll();

$agoraTexto = $agora->format('Y-m-d H:i:s');

$canceladas = 0;
$reativadas = 0;
$falhas = 0;

foreach ($linhas as $linha) {
    $matriculaId = (int) $linha['id'];
    $subscriptionId = (string) $linha['asaas_subscription_id'];

    try {
        $cobrancasAsaas = asaasCobrancasDaAssinatura($config, $subscriptionId);
    } catch (Throwable $e) {
        $falhas++;
        error_log("cancelar-matriculas-abandonadas: falha ao consultar as cobranças da assinatura {$subscriptionId} (matrícula {$matriculaId}) no Asaas: " . $e->getMessage());
        continue; // não decide sem saber o estado real: tenta de novo na próxima execução
    }

    $cobrancaPaga = null;
    foreach ($cobrancasAsaas as $cobranca) {
        if (in_array($cobranca['status'] ?? '', ASAAS_STATUS_PAGO, true)) {
            $cobrancaPaga = $cobranca;
            break;
        }
    }

    if ($cobrancaPaga !== null) {
        // O Asaas já tem o pagamento confirmado, mas o webhook nunca chegou (ou falhou):
        // ativa a matrícula aqui mesmo, em vez de cancelar uma assinatura que já foi paga.
        try {
            $pdo->beginTransaction();
            $idMatriculaAchada = garantirCobranca($pdo, $cobrancaPaga, $agoraTexto);
            $emailMatricula = $idMatriculaAchada !== false
                ? ativarMatriculaPaga($pdo, $idMatriculaAchada, (string) ($cobrancaPaga['id'] ?? ''), $agoraTexto)
                : null;
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $falhas++;
            error_log("cancelar-matriculas-abandonadas: falha ao ativar a matrícula {$matriculaId} (assinatura {$subscriptionId}) com pagamento já aprovado no Asaas: " . $e->getMessage());
            continue; // tenta de novo na próxima execução; não cancela
        }

        error_log("cancelar-matriculas-abandonadas: matrícula {$matriculaId} (assinatura {$subscriptionId}) estava com a cobrança paga no Asaas, mas o webhook não tinha chegado — ativada agora pelo cron.");
        $reativadas++;

        if ($emailMatricula) {
            avisarMatriculaConfirmada($config, $emailMatricula);
        }
        continue; // não cancela: a matrícula foi ativada
    }

    try {
        asaasCancelarAssinatura($config, $subscriptionId);
    } catch (Throwable $e) {
        $falhas++;
        error_log("cancelar-matriculas-abandonadas: falha ao cancelar a assinatura {$subscriptionId} (matrícula {$matriculaId}): " . $e->getMessage());
        continue; // não marca como cancelada: tenta de novo na próxima execução
    }

    $pdo->prepare("UPDATE matriculas SET status = 'cancelada', cancelada_em = ? WHERE id = ? AND status = 'aguardando_pagamento'")
        ->execute([$agoraTexto, $matriculaId]);
    $canceladas++;
}

echo "Matrículas abandonadas (mais de {$diasAbandono} dias aguardando pagamento): " . count($linhas) . "\n";
echo "Canceladas: {$canceladas}\n";
echo "Ativadas (pagas no Asaas, mas o webhook não tinha chegado): {$reativadas}\n";
echo "Falharam (ficam para a próxima execução): {$falhas}\n";
