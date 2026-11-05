<?php

declare(strict_types=1);

/*
 * Chamadas à API do Asaas (matrícula online): cliente, assinatura mensal e cobrança.
 * Documentação oficial: https://docs.asaas.com
 *
 * Autenticação: cabeçalho access_token com a chave da conta (config.local.php → asaas.chave_api).
 * Ambiente: 'sandbox' (https://api-sandbox.asaas.com/v3) ou 'producao' (https://api.asaas.com/v3).
 *
 * Erro do Asaas vai para o log sem dado pessoal (só o status HTTP e a descrição do
 * campo recusado); quem está se matriculando recebe uma mensagem genérica.
 */

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

function asaasBaseUrl(array $config): string
{
    $ambiente = (string) ($config['asaas']['ambiente'] ?? 'sandbox');
    return $ambiente === 'producao' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

/**
 * Chamada de baixo nível à API do Asaas. Lança RuntimeException em qualquer
 * falha (conexão ou status >= 400); quem chama decide a mensagem para a pessoa.
 */
function asaasRequisicao(array $config, string $metodo, string $caminho, ?array $corpo = null): array
{
    $chave = (string) ($config['asaas']['chave_api'] ?? '');
    if ($chave === '') {
        throw new RuntimeException('asaas.chave_api não configurada em config.local.php');
    }

    $ch = curl_init(asaasBaseUrl($config) . $caminho);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'User-Agent: AcademiaScuzziato-matricula/1.0',
            'access_token: ' . $chave,
        ],
    ]);
    if ($corpo !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($corpo, JSON_UNESCAPED_UNICODE));
    }

    $resposta = curl_exec($ch);
    $erroCurl = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resposta === false) {
        error_log("asaas: {$metodo} {$caminho} -> falha de conexão: {$erroCurl}");
        throw new RuntimeException('Asaas: falha de conexão.');
    }

    $json = json_decode((string) $resposta, true);

    if ($status >= 400) {
        $mensagem = is_array($json) && isset($json['errors'][0]['description'])
            ? (string) $json['errors'][0]['description']
            : "status {$status}";
        error_log("asaas: {$metodo} {$caminho} -> {$status} {$mensagem}");
        throw new RuntimeException('Asaas recusou a requisição: ' . $mensagem);
    }

    return is_array($json) ? $json : [];
}

/**
 * Busca o cliente pelo CPF/CNPJ e reaproveita; se não existir, cria.
 *
 * @param array{nome: string, cpfCnpj: string, email: string, whatsapp: string} $pagador
 * @return string id do cliente no Asaas
 */
function asaasBuscarOuCriarCliente(array $config, array $pagador): string
{
    $existentes = asaasRequisicao($config, 'GET', '/customers?cpfCnpj=' . urlencode($pagador['cpfCnpj']));
    foreach ($existentes['data'] ?? [] as $cliente) {
        if (($cliente['cpfCnpj'] ?? '') === $pagador['cpfCnpj']) {
            return (string) $cliente['id'];
        }
    }

    $criado = asaasRequisicao($config, 'POST', '/customers', [
        'name' => $pagador['nome'],
        'cpfCnpj' => $pagador['cpfCnpj'],
        'email' => $pagador['email'],
        'mobilePhone' => $pagador['whatsapp'],
    ]);

    return (string) $criado['id'];
}

/**
 * Cria a assinatura mensal. billingType 'UNDEFINED': a pessoa escolhe Pix, boleto
 * ou cartão na fatura. Vencimento no dia da matrícula (confirmado pelo Rhaue).
 * Sem multa nem juros (confirmado pelo Rhaue): não passar 'fine' nem 'interest'.
 *
 * @return array resposta do Asaas (tem 'id', o id da assinatura)
 */
function asaasCriarAssinatura(array $config, string $customerId, float $valor, string $descricao): array
{
    return asaasRequisicao($config, 'POST', '/subscriptions', [
        'customer' => $customerId,
        'billingType' => 'UNDEFINED',
        'cycle' => 'MONTHLY',
        'value' => $valor,
        'nextDueDate' => date('Y-m-d'),
        'description' => $descricao,
    ]);
}

/**
 * Todas as cobranças já geradas por uma assinatura.
 *
 * @return array<int, array> cobranças do Asaas (cada uma com 'id', 'invoiceUrl', 'dueDate', 'value', 'status', 'subscription')
 */
function asaasCobrancasDaAssinatura(array $config, string $subscriptionId): array
{
    $lista = asaasRequisicao($config, 'GET', '/payments?subscription=' . urlencode($subscriptionId));
    return $lista['data'] ?? [];
}

/**
 * Primeira cobrança gerada pela assinatura (a de vencimento mais próximo).
 * O Asaas pode levar um instante para gerar a cobrança depois da assinatura
 * criada: tenta até 3 vezes, com ~1s de intervalo, antes de desistir.
 *
 * @return array cobrança do Asaas (tem 'id', 'invoiceUrl', 'dueDate', 'value', 'status')
 */
function asaasPrimeiraCobranca(array $config, string $subscriptionId): array
{
    for ($tentativa = 1; $tentativa <= 3; $tentativa++) {
        $cobrancas = asaasCobrancasDaAssinatura($config, $subscriptionId);
        if ($cobrancas) {
            usort($cobrancas, fn ($a, $b) => strcmp((string) $a['dueDate'], (string) $b['dueDate']));
            return $cobrancas[0];
        }
        if ($tentativa < 3) {
            sleep(1);
        }
    }
    throw new RuntimeException('Asaas: assinatura criada sem nenhuma cobrança.');
}

function asaasCancelarAssinatura(array $config, string $subscriptionId): void
{
    asaasRequisicao($config, 'DELETE', '/subscriptions/' . urlencode($subscriptionId));
}
