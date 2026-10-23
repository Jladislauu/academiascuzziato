<?php

declare(strict_types=1);

/*
 * Formulário "Turmas em formação" (Academia Scuzziato).
 *
 * Recebe JSON do site, valida, grava na tabela `interesses` (MySQL) e avisa a
 * academia por e-mail. Requer PHP 8.0+ com PDO MySQL e mbstring.
 *
 * Credenciais: config.local.php FORA da pasta pública, um nível acima de
 * public_html. Formato em server/config.local.example.php (no repositório).
 *
 * As regras de validação são as mesmas de src/lib/interesse.ts. Mudou lá, mude aqui.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// Modalidades aceitas: as marcadas como emFormacao em src/data/modalidades.ts.
const MODALIDADES = ['muay-thai' => 'Muay Thai', 'boxe' => 'Boxe'];
const PUBLICOS = ['adulto' => 'Adulto', 'infantil' => 'Infantil'];
const DIAS = ['seg' => 'Segunda', 'ter' => 'Terça', 'qua' => 'Quarta', 'qui' => 'Quinta', 'sex' => 'Sexta'];
const PERIODOS = ['manha' => 'Manhã', 'tarde' => 'Tarde', 'noite' => 'Noite'];
// Endereços do site que sempre podem enviar (com e sem www). O config pode acrescentar outros.
const ORIGENS_DO_SITE = ['https://www.academiascuzziato.com.br', 'https://academiascuzziato.com.br'];
const IDADE_MIN = 1;
const IDADE_MAX = 17;

const ERRO_SERVIDOR = 'Não conseguimos registrar agora. Tente de novo mais tarde ou fale com a gente no WhatsApp.';

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

// ---------- Configuração (fora da pasta pública) ----------

$caminhoConfig = __DIR__ . '/../../config.local.php';
if (!is_file($caminhoConfig)) {
    error_log('interesse.php: config.local.php não encontrado em ' . $caminhoConfig);
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}
$config = require $caminhoConfig;

date_default_timezone_set('America/Sao_Paulo');

// Só aceita envios vindos do próprio site.
$origem = $_SERVER['HTTP_ORIGIN'] ?? '';
$origensPermitidas = array_merge(ORIGENS_DO_SITE, (array) ($config['origens_permitidas'] ?? []));
if ($origem !== '' && !in_array($origem, $origensPermitidas, true)) {
    responder(403, ['ok' => false, 'erro' => 'Origem não permitida.']);
}

// ---------- Leitura ----------

$bruto = file_get_contents('php://input', false, null, 0, 10000);
$dados = json_decode($bruto === false ? '' : $bruto, true);
if (!is_array($dados)) {
    responder(400, ['ok' => false, 'erro' => 'Envio inválido.']);
}

// Honeypot preenchido = robô. Responde "ok" para não dar pista, mas não grava nada.
if (trim((string) ($dados['empresa'] ?? '')) !== '') {
    responder(200, ['ok' => true]);
}

// ---------- Validação ----------

$erros = [];

$nome = trim((string) preg_replace('/\s+/u', ' ', (string) ($dados['nome'] ?? '')));
if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) {
    $erros['nome'] = 'Informe seu nome.';
}

$whatsapp = (string) preg_replace('/\D/', '', (string) ($dados['whatsapp'] ?? ''));
if (strlen($whatsapp) >= 12 && str_starts_with($whatsapp, '55')) {
    $whatsapp = substr($whatsapp, 2);
}
if (!preg_match('/^[1-9]{2}9?\d{8}$/', $whatsapp)) {
    $erros['whatsapp'] = 'Informe um WhatsApp com DDD.';
}

$modalidade = (string) ($dados['modalidade'] ?? '');
if (!array_key_exists($modalidade, MODALIDADES)) {
    $erros['modalidade'] = 'Escolha a modalidade.';
}

$publico = (string) ($dados['publico'] ?? '');
if (!array_key_exists($publico, PUBLICOS)) {
    $erros['publico'] = 'Escolha para quem é a turma.';
}

$idadeCrianca = null;
if ($publico === 'infantil') {
    $idadeCrianca = filter_var($dados['idadeCrianca'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => IDADE_MIN, 'max_range' => IDADE_MAX],
    ]);
    if ($idadeCrianca === false) {
        $erros['idadeCrianca'] = 'Informe a idade da criança.';
    }
}

$dias = $dados['dias'] ?? [];
if (!is_array($dias)) {
    $dias = [];
}
$dias = array_values(array_unique(array_filter(
    $dias,
    fn ($dia) => is_string($dia) && array_key_exists($dia, DIAS)
)));
if (count($dias) === 0) {
    $erros['dias'] = 'Escolha pelo menos um dia.';
}
// Ordem da semana, para gravar e mostrar sempre igual.
$dias = array_values(array_intersect(array_keys(DIAS), $dias));

$periodo = (string) ($dados['periodo'] ?? '');
if (!array_key_exists($periodo, PERIODOS)) {
    $erros['periodo'] = 'Escolha um período.';
}

if (($dados['consentimento'] ?? false) !== true) {
    $erros['consentimento'] = 'Para enviar, é preciso concordar com o uso dos dados.';
}

if ($erros) {
    responder(422, ['ok' => false, 'erro' => 'Confira os campos destacados.', 'campos' => $erros]);
}

// ---------- Banco ----------

try {
    $db = $config['db'];
    $pdo = new PDO(
        "mysql:host={$db['host']};dbname={$db['nome']};charset=utf8mb4",
        $db['usuario'],
        $db['senha'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    // Limite de envios por IP. Guarda só o hash do IP (com segredo), nunca o IP.
    $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $config['ip_segredo']);
    $limite = (int) ($config['limite']['envios'] ?? 5);
    $janelaMinutos = (int) ($config['limite']['janela_minutos'] ?? 60);

    $consulta = $pdo->prepare('SELECT COUNT(*) FROM interesses WHERE ip_hash = ? AND criado_em > ?');
    $consulta->execute([$ipHash, date('Y-m-d H:i:s', time() - $janelaMinutos * 60)]);
    if ((int) $consulta->fetchColumn() >= $limite) {
        responder(429, [
            'ok' => false,
            'erro' => 'Recebemos vários envios seguidos daqui. Tente de novo mais tarde ou fale com a gente no WhatsApp.',
        ]);
    }

    $agora = date('Y-m-d H:i:s');
    $insercao = $pdo->prepare(
        'INSERT INTO interesses
            (criado_em, nome, whatsapp, modalidade, publico, idade_crianca, dias, periodo, consentimento_em, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insercao->execute([
        $agora,
        $nome,
        $whatsapp,
        $modalidade,
        $publico,
        $idadeCrianca,
        implode(',', $dias),
        $periodo,
        $agora,
        $ipHash,
    ]);
} catch (PDOException $e) {
    error_log('interesse.php: erro no banco: ' . $e->getMessage());
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

// ---------- E-mail de aviso (falha aqui não perde o cadastro) ----------

$destino = trim((string) ($config['email']['destino'] ?? ''));
if ($destino !== '') {
    $turma = MODALIDADES[$modalidade] . ' ' . mb_strtolower(PUBLICOS[$publico]);
    $assunto = "Novo interesse: {$turma}";
    $corpo = implode("\n", array_filter([
        "Nova pessoa interessada na turma de {$turma}.",
        '',
        "Nome: {$nome}" . ($publico === 'infantil' ? ' (responsável)' : ''),
        'WhatsApp: (' . substr($whatsapp, 0, 2) . ') ' . substr($whatsapp, 2, -4) . '-' . substr($whatsapp, -4),
        "Conversar: https://wa.me/55{$whatsapp}",
        $idadeCrianca !== null ? "Idade da criança: {$idadeCrianca} anos" : null,
        'Dias: ' . implode(', ', array_map(fn ($dia) => DIAS[$dia], $dias)),
        'Período: ' . PERIODOS[$periodo],
        '',
        'Enviado pelo site em ' . date('d/m/Y') . ' às ' . date('H:i') . '.',
    ], fn ($linha) => $linha !== null));

    $cabecalhos = implode("\r\n", [
        'From: Site Academia Scuzziato <' . $config['email']['remetente'] . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);

    if (!mail($destino, mb_encode_mimeheader($assunto, 'UTF-8'), $corpo, $cabecalhos)) {
        error_log('interesse.php: falha ao enviar e-mail de aviso.');
    }
}

responder(201, ['ok' => true]);
