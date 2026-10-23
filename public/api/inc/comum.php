<?php

declare(strict_types=1);

/*
 * Código comum do agendamento da aula experimental (api/agendamento.php e painel/).
 * Só declara funções: aberto direto pelo navegador, responde 404 (e a pasta
 * api/inc/ também é bloqueada pelo .htaccess dela).
 *
 * Requer PHP 8.0+ com PDO MySQL e mbstring.
 */

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

const FUSO_ACADEMIA = 'America/Sao_Paulo';

// Endereços do site que sempre podem enviar (com e sem www). O config pode acrescentar outros.
const ORIGENS_DO_SITE = ['https://www.academiascuzziato.com.br', 'https://academiascuzziato.com.br'];

const STATUS_AGENDAMENTO = [
    'agendado' => 'Agendado',
    'compareceu' => 'Compareceu',
    'faltou' => 'Faltou',
    'cancelado' => 'Cancelado',
];

const EXPERIENCIAS = ['nunca' => 'Nunca treinou', 'ja-treinou' => 'Já treinou'];

const DIAS_SEMANA = [1 => 'seg', 2 => 'ter', 3 => 'qua', 4 => 'qui', 5 => 'sex', 6 => 'sab', 7 => 'dom'];
const DIAS_LONGOS = [
    'seg' => 'segunda', 'ter' => 'terça', 'qua' => 'quarta', 'qui' => 'quinta',
    'sex' => 'sexta', 'sab' => 'sábado', 'dom' => 'domingo',
];

date_default_timezone_set(FUSO_ACADEMIA);

/**
 * config.local.php fica FORA da pasta pública, um nível acima de public_html
 * (ver server/config.local.example.php). Daqui: public_html/api/inc → 3 níveis acima.
 */
function carregarConfig(): array
{
    $caminho = dirname(__DIR__, 3) . '/config.local.php';
    if (!is_file($caminho)) {
        throw new RuntimeException('config.local.php não encontrado em ' . $caminho);
    }
    $config = require $caminho;
    if (!is_array($config)) {
        throw new RuntimeException('config.local.php não retornou um array');
    }
    return $config;
}

function conectar(array $config): PDO
{
    $db = $config['db'];
    return new PDO(
        "mysql:host={$db['host']};dbname={$db['nome']};charset=utf8mb4",
        $db['usuario'],
        $db['senha'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

/** Turmas e regras da agenda, geradas no build a partir de src/data (plugins/agenda.ts). */
function carregarAgenda(): array
{
    $caminho = dirname(__DIR__) . '/turmas.json';
    $agenda = is_file($caminho) ? json_decode((string) file_get_contents($caminho), true) : null;
    if (!is_array($agenda) || !isset($agenda['turmas'])) {
        throw new RuntimeException('api/turmas.json ausente ou inválido (é gerado pelo npm run build)');
    }
    return $agenda;
}

function turmaPorId(array $agenda, string $id): ?array
{
    foreach ($agenda['turmas'] as $turma) {
        if ($turma['id'] === $id) {
            return $turma;
        }
    }
    return null;
}

function agora(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone(FUSO_ACADEMIA));
}

function minutosDoDia(string $hhmm): int
{
    [$h, $m] = array_map('intval', explode(':', $hhmm));
    return $h * 60 + $m;
}

/**
 * Próximas aulas de uma turma que ainda podem ser agendadas.
 * Mesma regra de src/lib/aulas.ts (proximasAulas). Mudou lá, mude aqui.
 *
 * @return list<string> datas 'AAAA-MM-DD'
 */
function proximasAulas(array $turma, array $agenda, DateTimeImmutable $agora): array
{
    $hoje = $agora->setTime(12, 0);
    $minutosAgora = (int) $agora->format('G') * 60 + (int) $agora->format('i');
    $datas = [];

    for ($i = 0; $i < (int) $agenda['diasAFrente']; $i++) {
        $dia = $hoje->modify("+{$i} days");
        $data = $dia->format('Y-m-d');
        if (!in_array(DIAS_SEMANA[(int) $dia->format('N')], $turma['dias'], true)) {
            continue;
        }
        if (in_array($data, $agenda['diasSemAula'], true)) {
            continue;
        }
        if ($i === 0 && minutosDoDia($turma['inicio']) - (int) $agenda['antecedenciaMinutos'] <= $minutosAgora) {
            continue;
        }
        $datas[] = $data;
    }

    return $datas;
}

/** Vagas já ocupadas por aula: ['turma|data' => n]. Cancelados liberam a vaga. */
function vagasOcupadas(PDO $pdo, string $de, string $ate): array
{
    $consulta = $pdo->prepare(
        "SELECT turma_id, data_aula, COUNT(*) AS n FROM agendamentos
         WHERE data_aula BETWEEN ? AND ? AND status <> 'cancelado'
         GROUP BY turma_id, data_aula"
    );
    $consulta->execute([$de, $ate]);
    $ocupadas = [];
    foreach ($consulta as $linha) {
        $ocupadas[$linha['turma_id'] . '|' . $linha['data_aula']] = (int) $linha['n'];
    }
    return $ocupadas;
}

/** Hash do IP com segredo: serve para limitar envios sem guardar o IP. */
function hashIp(array $config): string
{
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $config['ip_segredo']);
}

/** 'Maria  da Silva ' → 'maria da silva' (para comparar nomes). */
function chaveNome(string $nome): string
{
    return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $nome)));
}

function limparNome(string $nome): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $nome));
}

/** '41999998888' → '(41) 99999-8888' */
function formatarWhatsapp(string $digitos): string
{
    return '(' . substr($digitos, 0, 2) . ') ' . substr($digitos, 2, -4) . '-' . substr($digitos, -4);
}

/** '21:00' → '21h', '21:30' → '21h30' */
function horaCurta(string $hhmm): string
{
    [$h, $m] = explode(':', substr($hhmm, 0, 5));
    return (int) $h . 'h' . ($m !== '00' ? $m : '');
}

/** '2026-10-27' → 'terça, 27/10' */
function dataPorExtenso(string $data): string
{
    $dia = new DateTimeImmutable($data . ' 12:00', new DateTimeZone(FUSO_ACADEMIA));
    return DIAS_LONGOS[DIAS_SEMANA[(int) $dia->format('N')]] . ', ' . $dia->format('d/m');
}

function enviarEmail(array $config, string $assunto, string $corpo): void
{
    $destino = trim((string) ($config['email']['destino'] ?? ''));
    if ($destino === '') {
        return;
    }
    $cabecalhos = implode("\r\n", [
        'From: Site Academia Scuzziato <' . $config['email']['remetente'] . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]);
    if (!mail($destino, mb_encode_mimeheader($assunto, 'UTF-8'), $corpo, $cabecalhos)) {
        error_log('agendamento: falha ao enviar e-mail de aviso.');
    }
}
