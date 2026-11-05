<?php

declare(strict_types=1);

/*
 * Código comum da matrícula online (api/matricula.php, api/asaas-webhook.php e
 * api/cron/cancelar-matriculas-abandonadas.php). Só declara funções: aberto
 * direto pelo navegador, responde 404 (igual a comum.php).
 */

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

/** Planos, turmas e regras da matrícula, gerados no build a partir de src/data (plugins/matricula.ts). */
function carregarMatricula(): array
{
    $caminho = dirname(__DIR__) . '/matricula.json';
    $dados = is_file($caminho) ? json_decode((string) file_get_contents($caminho), true) : null;
    if (!is_array($dados) || !isset($dados['planos'], $dados['turmas'])) {
        throw new RuntimeException('api/matricula.json ausente ou inválido (é gerado pelo npm run build)');
    }
    return $dados;
}

function planoMatriculaPorId(array $matricula, string $id): ?array
{
    foreach ($matricula['planos'] as $plano) {
        if ($plano['id'] === $id) {
            return $plano;
        }
    }
    return null;
}

function turmaMatriculaPorId(array $matricula, string $id): ?array
{
    foreach ($matricula['turmas'] as $turma) {
        if ($turma['id'] === $id) {
            return $turma;
        }
    }
    return null;
}

/** Algoritmo padrão de validação de CPF (dígitos verificadores). Mesma regra em src/lib/matricula.ts. */
function cpfValido(string $cpf): bool
{
    $cpf = (string) preg_replace('/\D/', '', $cpf);
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $soma = 0;
        for ($i = 0; $i < $t; $i++) {
            $soma += (int) $cpf[$i] * (($t + 1) - $i);
        }
        $digito = (10 * $soma) % 11;
        if ($digito >= 10) {
            $digito = 0;
        }
        if ((int) $cpf[$t] !== $digito) {
            return false;
        }
    }
    return true;
}

/** Idade completa numa data ('1990-05-20' num 'hoje' de 2026-11-04 → 36); null se a data for inválida ou futura. */
function calcularIdade(string $dataNascimento, DateTimeImmutable $agora): ?int
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataNascimento)) {
        return null;
    }
    try {
        $nascimento = new DateTimeImmutable($dataNascimento, $agora->getTimezone());
    } catch (Exception) {
        return null;
    }
    if ($nascimento > $agora) {
        return null;
    }
    return (int) $nascimento->diff($agora)->y;
}

/** Status do Asaas que significam "cobrança paga" (cobre Pix/cartão e dinheiro registrado à mão). */
const ASAAS_STATUS_PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

/*
 * ---------- Efeito de uma cobrança do Asaas (webhook e cron de abandono) ----------
 *
 * As duas funções abaixo são o mesmo efeito que uma cobrança paga produz,
 * venha ele do webhook (public/api/asaas-webhook.php) ou do cron de
 * matrículas abandonadas (public/api/cron/cancelar-matriculas-abandonadas.php),
 * quando ele encontra no Asaas um pagamento que o webhook nunca avisou.
 */

/**
 * Garante a linha da cobrança a partir do objeto `payment` do Asaas, achando a
 * matrícula pela assinatura (payment.subscription). Cobrança que já existe
 * (mesmo asaas_payment_id) é atualizada.
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

/**
 * Marca a cobrança como paga e ativa a matrícula (`aguardando_pagamento` ou
 * `inadimplente` → `ativa`) — o mesmo efeito do webhook quando a cobrança é
 * confirmada ou recebida.
 *
 * @return array|null dados do aluno para o e-mail "matrícula confirmada", só na primeira ativação; null nas demais vezes (ou se a matrícula não estava elegível).
 */
function ativarMatriculaPaga(PDO $pdo, int $matriculaId, string $paymentId, string $agoraTexto): ?array
{
    if ($paymentId !== '') {
        $pdo->prepare('UPDATE cobrancas SET pago_em = COALESCE(pago_em, ?) WHERE asaas_payment_id = ?')
            ->execute([$agoraTexto, $paymentId]);
    }

    $matriculaAtual = $pdo->prepare('SELECT status, ativada_em FROM matriculas WHERE id = ?');
    $matriculaAtual->execute([$matriculaId]);
    $linha = $matriculaAtual->fetch();

    if (!$linha || !in_array($linha['status'], ['aguardando_pagamento', 'inadimplente'], true)) {
        return null;
    }

    $pdo->prepare('UPDATE matriculas SET status = ?, ativada_em = COALESCE(ativada_em, ?) WHERE id = ?')
        ->execute(['ativa', $agoraTexto, $matriculaId]);

    if ($linha['ativada_em'] !== null) {
        return null; // já tinha sido ativada antes (ex.: outro evento chegou primeiro): não repete o e-mail
    }

    $aluno = $pdo->prepare(
        'SELECT a.nome, a.whatsapp, a.responsavel_nome, m.plano_id, m.valor
         FROM alunos a JOIN matriculas m ON m.aluno_id = a.id WHERE m.id = ?'
    );
    $aluno->execute([$matriculaId]);
    return $aluno->fetch() ?: null;
}

/** Avisa a academia por e-mail que uma matrícula foi ativada (o retorno de ativarMatriculaPaga, se não for null). */
function avisarMatriculaConfirmada(array $config, array $emailMatricula): void
{
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
