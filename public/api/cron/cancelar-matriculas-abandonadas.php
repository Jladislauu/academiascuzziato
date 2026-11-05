<?php

declare(strict_types=1);

/*
 * Cancela matrículas abandonadas: `aguardando_pagamento` há mais de
 * `matricula.diasAbandono` dias (padrão 7, em src/data/matricula.ts). Cancela
 * a assinatura no Asaas e marca a matrícula como `cancelada` no banco.
 *
 * Só roda por linha de comando (cron da Hostinger — ver DEPLOY.md). Pela web,
 * responde 404 como qualquer outro arquivo de servidor.
 *
 * Idempotente: se a assinatura já não existir no Asaas (cancelada noutro
 * lugar), ou se o cancelamento falhar por qualquer outro motivo, a matrícula
 * NÃO é marcada como cancelada agora — fica para a próxima execução, para
 * nunca perder de vista uma assinatura que ainda possa estar cobrando.
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

$canceladas = 0;
$falhas = 0;

foreach ($linhas as $linha) {
    $matriculaId = (int) $linha['id'];
    $subscriptionId = (string) $linha['asaas_subscription_id'];

    try {
        asaasCancelarAssinatura($config, $subscriptionId);
    } catch (Throwable $e) {
        $falhas++;
        error_log("cancelar-matriculas-abandonadas: falha ao cancelar a assinatura {$subscriptionId} (matrícula {$matriculaId}): " . $e->getMessage());
        continue; // não marca como cancelada: tenta de novo na próxima execução
    }

    $pdo->prepare("UPDATE matriculas SET status = 'cancelada', cancelada_em = ? WHERE id = ? AND status = 'aguardando_pagamento'")
        ->execute([$agora->format('Y-m-d H:i:s'), $matriculaId]);
    $canceladas++;
}

echo "Matrículas abandonadas (mais de {$diasAbandono} dias aguardando pagamento): " . count($linhas) . "\n";
echo "Canceladas: {$canceladas}\n";
echo "Falharam (ficam para a próxima execução): {$falhas}\n";
