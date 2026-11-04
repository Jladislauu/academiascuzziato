<?php

declare(strict_types=1);

/*
 * Código comum da matrícula online (api/matricula.php e api/asaas-webhook.php).
 * Só declara funções: aberto direto pelo navegador, responde 404 (igual a comum.php).
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
