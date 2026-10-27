<?php

declare(strict_types=1);

/*
 * Painel de agendamentos da aula experimental (www.academiascuzziato.com.br/painel/).
 *
 * Mostra quem agendou em cada aula da semana e deixa marcar se a pessoa
 * compareceu, faltou ou cancelou (cancelar libera a vaga no site).
 *
 * Acesso por senha (config.local.php → painel.senha). Sessão de até 12 horas,
 * cookie só desta pasta, proteção contra CSRF e limite de tentativas de senha.
 */

require __DIR__ . '/../api/inc/comum.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

const SESSAO_HORAS = 12;
const TENTATIVAS_MAX = 5;
const TENTATIVAS_JANELA_MINUTOS = 15;

function e(mixed $texto): string
{
    return htmlspecialchars((string) $texto, ENT_QUOTES, 'UTF-8');
}

function pagina(string $titulo, string $conteudo): void
{
    $titulo = e($titulo);
    echo <<<HTML
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0E0F12">
<link rel="icon" type="image/svg+xml" href="/brand/academia-scuzziato-favicon.svg">
<title>{$titulo} · Academia Scuzziato</title>
<style>
  :root { --preto:#0e0f12; --vermelho:#e10600; --vermelho-escuro:#b80500; --cinza-50:#f5f6f7; --cinza-100:#e9ebee; --cinza-200:#d9dbe0; --cinza-500:#5c6270; --cinza-700:#2c3038; --verde:#137333; }
  * { box-sizing:border-box; }
  body { margin:0; font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; background:var(--cinza-50); color:var(--preto); }
  a { color:inherit; }
  :focus-visible { outline:3px solid var(--preto); outline-offset:2px; }
  .topo { background:var(--preto); color:#fff; }
  .topo .dentro { display:flex; align-items:center; gap:12px; justify-content:space-between; }
  .marca { font-weight:800; letter-spacing:.06em; text-transform:uppercase; font-size:15px; white-space:nowrap; }
  .topo .botao { white-space:nowrap; }
  @media (max-width:480px) { .marca { font-size:13px; } .topo .dentro { gap:6px; } .topo .botao { min-height:36px; padding:0 10px; font-size:14px; } }
  .marca b { color:var(--vermelho); }
  .dentro { max-width:1180px; margin:0 auto; padding:14px 16px; }
  h1 { font-size:26px; line-height:1.1; margin:8px 0 4px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.08em; color:var(--cinza-500); margin:28px 0 10px; }
  .sub { color:var(--cinza-500); margin:0 0 14px; }
  .nav { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:14px 0 4px; }
  .botao { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 14px; border-radius:8px; border:2px solid var(--cinza-200); background:#fff; color:var(--preto); font:inherit; font-weight:600; text-decoration:none; cursor:pointer; }
  .botao:hover { border-color:var(--preto); }
  .botao.principal { background:var(--vermelho); border-color:var(--vermelho); color:#fff; }
  .botao.principal:hover { background:var(--vermelho-escuro); border-color:var(--vermelho-escuro); }
  .botao.claro { background:transparent; color:#fff; border-color:var(--cinza-700); }
  input[type=date], input[type=password] { min-height:40px; border:2px solid var(--cinza-500); border-radius:8px; padding:0 10px; font:inherit; background:#fff; }
  .aula { background:#fff; border:1px solid var(--cinza-200); border-radius:14px; margin:0 0 12px; overflow:hidden; }
  .aula-topo { display:flex; flex-wrap:wrap; gap:4px 12px; align-items:baseline; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--cinza-100); }
  .aula-topo strong { font-size:18px; }
  .vagas { font-size:14px; font-weight:600; color:var(--cinza-500); }
  .vagas.lotada { color:var(--vermelho); }
  ul.pessoas { list-style:none; margin:0; padding:0; }
  .pessoa { padding:14px 16px; border-top:1px solid var(--cinza-100); }
  .pessoa:first-child { border-top:0; }
  .pessoa.cancelado .nome { text-decoration:line-through; color:var(--cinza-500); }
  .nome { font-weight:700; font-size:17px; }
  .detalhes { color:var(--cinza-500); font-size:14px; margin-top:2px; }
  .selos { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .selo { font-size:13px; font-weight:600; padding:2px 8px; border-radius:999px; background:var(--cinza-100); }
  .selo.alerta { background:#fde7e6; color:var(--vermelho-escuro); }
  .acoes { display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-top:12px; }
  @media (min-width:560px) { .acoes { grid-template-columns:repeat(4, 1fr); } }
  .acoes .botao { min-height:38px; font-size:14px; padding:0 8px; }
  .acoes .botao[aria-pressed=true] { background:var(--preto); border-color:var(--preto); color:#fff; cursor:default; }
  .zap { color:var(--verde); font-weight:700; }
  .vazio { background:#fff; border:1px dashed var(--cinza-200); border-radius:14px; padding:28px 16px; text-align:center; color:var(--cinza-500); }
  .aviso { background:#fde7e6; color:var(--vermelho-escuro); border-radius:10px; padding:10px 14px; font-weight:600; }
  .aviso.ok { background:#e6f4ea; color:var(--verde); }
  .aviso.alerta { background:#fef7e0; color:#7a5a00; }
  .login { max-width:380px; margin:12vh auto 0; padding:0 16px; }
  .login form { background:#fff; border:1px solid var(--cinza-200); border-radius:14px; padding:22px; display:grid; gap:12px; }
  .login label { font-weight:600; }
  .resumo { display:flex; flex-wrap:wrap; gap:8px; margin:6px 0 4px; padding:0; list-style:none; }
  .resumo li { background:#fff; border:1px solid var(--cinza-200); border-left-width:4px; border-radius:10px; padding:6px 12px; font-size:14px; }
  .resumo b { font-size:17px; }
  select, input[type=search] { min-height:40px; border:2px solid var(--cinza-200); border-radius:8px; padding:0 10px; font:inherit; background:#fff; max-width:100%; }
  input[type=search] { min-width:0; flex:1; }

  /* barra: abas + busca */
  .barra { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin:16px 0 6px; }
  .abas { display:inline-flex; background:#fff; border:2px solid var(--cinza-200); border-radius:10px; padding:3px; gap:3px; }
  .abas a { padding:7px 16px; border-radius:7px; text-decoration:none; font-weight:700; color:var(--cinza-500); }
  .abas a[aria-current=page] { background:var(--preto); color:#fff; }
  .busca { display:flex; gap:6px; flex:1; max-width:420px; min-width:240px; }
  .cabeca { display:flex; flex-wrap:wrap; gap:10px 16px; align-items:center; justify-content:space-between; margin:10px 0 8px; }
  .cabeca h1 { margin:0; }
  .hoje { display:inline-block; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; background:var(--vermelho); color:#fff; border-radius:999px; padding:2px 8px; vertical-align:middle; }
  .nav { margin:0; }

  /* cores por status */
  .st-agendado { --cor:#3b5bdb; --fundo:#e7ecfd; }
  .st-compareceu { --cor:var(--verde); --fundo:#e6f4ea; }
  .st-faltou { --cor:#b45309; --fundo:#fef3e2; }
  .st-cancelado { --cor:var(--cinza-500); --fundo:var(--cinza-100); }
  .resumo li[class^=st-] { border-left-color:var(--cor); }
  .status { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--cor); background:var(--fundo); border-radius:999px; padding:3px 9px; white-space:nowrap; }
  .pessoa-topo { display:flex; gap:10px; align-items:center; justify-content:space-between; }
  .acoes .botao[aria-pressed=true] { background:var(--cor); border-color:var(--cor); }
  .lista-solta { background:#fff; border:1px solid var(--cinza-200); border-radius:14px; overflow:hidden; }

  /* dia */
  .aula.vazia { display:flex; flex-wrap:wrap; gap:4px 12px; justify-content:space-between; padding:10px 16px; background:transparent; border-style:dashed; color:var(--cinza-500); font-size:15px; }
  .aula.vazia b { color:var(--preto); }
  .vazio .botao { text-decoration:none; }

  /* semana */
  .semana { display:grid; gap:10px; margin-top:12px; }
  @media (min-width:980px) { .semana { grid-template-columns:repeat(7, minmax(0, 1fr)); } }
  .coluna { background:#fff; border:1px solid var(--cinza-200); border-radius:12px; padding:10px; min-height:90px; }
  .coluna.e-hoje { border:2px solid var(--vermelho); }
  .coluna-topo { display:flex; justify-content:space-between; align-items:center; text-decoration:none; color:var(--cinza-500); font-size:14px; padding:2px 2px 8px; border-bottom:1px solid var(--cinza-100); margin-bottom:8px; }
  .coluna-topo b { color:var(--preto); font-size:16px; }
  .nada { color:var(--cinza-200); font-size:13px; margin:6px 2px; }
  .mini-aula { display:block; text-decoration:none; border-radius:8px; padding:7px 8px; margin-bottom:6px; background:var(--cinza-50); }
  .mini-aula:hover { background:var(--cinza-100); }
  .mini-topo { display:block; font-size:13px; line-height:1.3; }
  .mini-vagas { display:block; font-size:12px; color:var(--cinza-500); font-weight:600; margin-top:2px; }
  .mini-vagas.lotada { color:var(--vermelho); }
  .chips { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .chip { font-size:12px; font-weight:600; border-radius:6px; padding:2px 6px; background:var(--fundo); color:var(--cor); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .chip.st-cancelado { text-decoration:line-through; }

  /* mês */
  .mes { display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:4px; margin-top:12px; }
  .mes-cab { text-align:center; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--cinza-500); padding:4px 0; }
  .casa { display:flex; flex-direction:column; justify-content:space-between; align-items:flex-start; min-height:58px; background:#fff; border:1px solid var(--cinza-200); border-radius:10px; text-decoration:none; padding:5px 6px; }
  .casa:hover { border-color:var(--preto); }
  .casa.fora { opacity:.35; }
  .casa.e-hoje { border:2px solid var(--vermelho); }
  .casa .num { font-weight:700; font-size:14px; }
  .casa .qtd { align-self:flex-end; min-width:22px; height:22px; border-radius:999px; background:var(--preto); color:#fff; font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0 6px; }
  @media (min-width:700px) { .casa { min-height:78px; padding:6px 8px; } .casa .qtd { min-width:32px; height:32px; font-size:16px; } }
  .legenda { color:var(--cinza-500); font-size:13px; margin:8px 0 0; }
  .tabela-rolagem { overflow-x:auto; }
  .tabela { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--cinza-200); border-radius:12px; overflow:hidden; font-size:14px; }
  .tabela th, .tabela td { padding:9px 12px; text-align:left; border-bottom:1px solid var(--cinza-100); white-space:nowrap; }
  .tabela th { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--cinza-500); }
  .tabela td:not(:first-child), .tabela th:not(:first-child) { text-align:center; }
</style>
</head>
<body>
{$conteudo}
</body>
</html>
HTML;
}

function irPara(string $url): void
{
    header('Location: ' . $url, true, 303);
    exit;
}

function dataValida(string $data): bool
{
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $data);
    return $d !== false && $d->format('Y-m-d') === $data;
}

// ---------- Configuração ----------

try {
    $config = carregarConfig();
    $pdo = conectar($config);
} catch (Throwable $ex) {
    error_log('painel: ' . $ex->getMessage());
    http_response_code(500);
    pagina('Painel indisponível', '<main class="login"><p class="aviso">O painel não conseguiu acessar o banco de dados. Confira o config.local.php (ver DEPLOY.md).</p></main>');
    exit;
}

$senhaConfig = (string) ($config['painel']['senha'] ?? '');
if (mb_strlen($senhaConfig) < 12 || str_starts_with($senhaConfig, 'TROQUE')) {
    http_response_code(503);
    pagina('Painel sem senha', '<main class="login"><p class="aviso">Defina a senha do painel (com pelo menos 12 caracteres) em <code>painel.senha</code> no config.local.php.</p></main>');
    exit;
}

// ---------- Sessão ----------

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

session_name('scuzziato_painel');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/painel/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

$logado = isset($_SESSION['logado_em']) && time() - (int) $_SESSION['logado_em'] < SESSAO_HORAS * 3600;
if (!$logado && isset($_SESSION['logado_em'])) {
    $_SESSION = [];
    session_regenerate_id(true);
}

function csrfOk(): bool
{
    return isset($_SESSION['csrf'], $_POST['csrf']) && hash_equals($_SESSION['csrf'], (string) $_POST['csrf']);
}

$acao = $_SERVER['REQUEST_METHOD'] === 'POST' ? (string) ($_POST['acao'] ?? '') : '';
$erroLogin = '';

// ---------- Entrar ----------

if ($acao === 'entrar') {
    $ipHash = hashIp($config);
    $desde = agora()->modify('-' . TENTATIVAS_JANELA_MINUTOS . ' minutes')->format('Y-m-d H:i:s');
    $tentativas = $pdo->prepare('SELECT COUNT(*) FROM painel_tentativas WHERE ip_hash = ? AND criado_em > ?');
    $tentativas->execute([$ipHash, $desde]);

    if ((int) $tentativas->fetchColumn() >= TENTATIVAS_MAX) {
        $erroLogin = 'Muitas tentativas erradas. Espere ' . TENTATIVAS_JANELA_MINUTOS . ' minutos e tente de novo.';
    } elseif (hash_equals($senhaConfig, (string) ($_POST['senha'] ?? ''))) {
        session_regenerate_id(true);
        $_SESSION['logado_em'] = time();
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        irPara('/painel/');
    } else {
        $pdo->prepare('INSERT INTO painel_tentativas (ip_hash, criado_em) VALUES (?, ?)')
            ->execute([$ipHash, agora()->format('Y-m-d H:i:s')]);
        sleep(1);
        $erroLogin = 'Senha incorreta.';
    }
}

if (!$logado) {
    $aviso = $erroLogin !== '' ? '<p class="aviso" role="alert">' . e($erroLogin) . '</p>' : '';
    http_response_code($erroLogin !== '' ? 401 : 200);
    pagina('Entrar', <<<HTML
<main class="login">
  <p class="marca">Academia <b>Scuzziato</b></p>
  <h1>Agendamentos</h1>
  <p class="sub">Aulas experimentais agendadas pelo site.</p>
  <form method="post" action="./">
    {$aviso}
    <input type="hidden" name="acao" value="entrar">
    <label for="senha">Senha</label>
    <input id="senha" name="senha" type="password" autocomplete="current-password" required autofocus>
    <button class="botao principal" type="submit">Entrar</button>
  </form>
</main>
HTML);
    exit;
}

// ---------- Ações (logado) ----------

if ($acao !== '' && !csrfOk()) {
    http_response_code(400);
    pagina('Sessão expirada', '<main class="login"><p class="aviso">A página ficou aberta por muito tempo. <a href="./">Recarregue o painel</a> e tente de novo.</p></main>');
    exit;
}

if ($acao === 'sair') {
    $_SESSION = [];
    session_destroy();
    irPara('/painel/');
}

if ($acao === 'testar-email') {
    $resultado = enviarEmail(
        $config,
        'Teste de e-mail do painel',
        "Este é um teste do painel de agendamentos da Academia Scuzziato.\n\n"
            . 'Se você recebeu, os avisos de novos agendamentos vão chegar aqui.\n\n'
            . 'Enviado em ' . agora()->format('d/m/Y \à\s H:i') . '.'
    );
    $destino = (string) ($config['email']['destino'] ?? '');
    $_SESSION['aviso'] = match (true) {
        $resultado['ok'] && $resultado['via'] === 'gmail' => ['ok', "E-mail de teste enviado pelo Gmail para {$destino}."],
        $resultado['ok'] => ['alerta', "O Gmail não enviou ({$resultado['erro']}). O teste saiu pelo servidor para {$destino}, mas pode cair no spam."],
        default => ['erro', "Não foi possível enviar: {$resultado['erro']}"],
    };
    irPara('/painel/');
}

// Volta para a mesma tela depois de uma ação (só aceita uma query string do próprio painel).
function voltarPara(string $voltar, string $ancora = ''): void
{
    $voltar = preg_match('/^\?[A-Za-z0-9=&%._\-]*$/', $voltar) ? $voltar : '';
    irPara('/painel/' . $voltar . $ancora);
}

if ($acao === 'status') {
    $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $status = (string) ($_POST['status'] ?? '');
    if ($id !== false && array_key_exists($status, STATUS_AGENDAMENTO)) {
        $pdo->prepare('UPDATE agendamentos SET status = ?, status_em = ? WHERE id = ?')
            ->execute([$status, agora()->format('Y-m-d H:i:s'), $id]);
    }
    voltarPara((string) ($_POST['voltar'] ?? ''), $id !== false ? '#agendamento-' . $id : '');
}

// ---------- O que mostrar ----------

const VISOES = ['dia' => 'Dia', 'semana' => 'Semana', 'mes' => 'Mês'];
const MESES = [1 => 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_CURTOS = ['seg' => 'Seg', 'ter' => 'Ter', 'qua' => 'Qua', 'qui' => 'Qui', 'sex' => 'Sex', 'sab' => 'Sáb', 'dom' => 'Dom'];

$fuso = new DateTimeZone(FUSO_ACADEMIA);
$hoje = agora()->format('Y-m-d');

$ver = (string) ($_GET['ver'] ?? 'dia');
if (!array_key_exists($ver, VISOES)) {
    $ver = 'dia';
}
$data = (string) ($_GET['data'] ?? ($_GET['de'] ?? ''));
if (!dataValida($data)) {
    $data = $hoje;
}
$busca = trim((string) ($_GET['busca'] ?? ''));
$buscando = mb_strlen($busca) >= 2;

try {
    $agendaPainel = carregarAgenda();
    $vagasPorAula = (int) $agendaPainel['vagasPorAula'];
} catch (Throwable) {
    $agendaPainel = ['turmas' => [], 'diasSemAula' => []];
    $vagasPorAula = 5;
}
$turmaFiltro = (string) ($_GET['turma'] ?? '');
if ($turmaFiltro !== '' && turmaPorId($agendaPainel, $turmaFiltro) === null) {
    $turmaFiltro = '';
}

/** Link do painel mantendo os filtros atuais. */
function linkPainel(array $mudar): string
{
    global $ver, $data, $turmaFiltro;
    $params = array_filter(
        array_merge(['ver' => $ver, 'data' => $data, 'turma' => $turmaFiltro], $mudar),
        fn ($v) => $v !== '' && $v !== null
    );
    return '?' . http_build_query($params);
}

$dia = new DateTimeImmutable($data . ' 12:00', $fuso);
$chaveDia = fn (DateTimeImmutable $d): string => DIAS_SEMANA[(int) $d->format('N')];

// Período da visão e navegação anterior / próximo.
switch ($ver) {
    case 'semana':
        $inicio = $dia->modify('-' . ((int) $dia->format('N') - 1) . ' days');
        $fim = $inicio->modify('+6 days');
        $anterior = $dia->modify('-7 days');
        $proximo = $dia->modify('+7 days');
        $titulo = $inicio->format('d/m') . ' a ' . $fim->format('d/m/Y');
        $rotuloNav = ['Semana anterior', 'Próxima semana'];
        break;
    case 'mes':
        $inicio = $dia->modify('first day of this month');
        $fim = $dia->modify('last day of this month');
        $anterior = $inicio->modify('-1 month');
        $proximo = $inicio->modify('+1 month');
        $titulo = ucfirst(MESES[(int) $dia->format('n')]) . ' de ' . $dia->format('Y');
        $rotuloNav = ['Mês anterior', 'Próximo mês'];
        break;
    default:
        $inicio = $fim = $dia;
        $anterior = $dia->modify('-1 day');
        $proximo = $dia->modify('+1 day');
        $titulo = ucfirst(DIAS_LONGOS[$chaveDia($dia)]) . ', ' . (int) $dia->format('j') . ' de ' . MESES[(int) $dia->format('n')];
        $rotuloNav = ['Dia anterior', 'Próximo dia'];
}

// ---------- Agendamentos ----------

$colunas = 'a.*,
    (SELECT COUNT(*) FROM agendamentos b
      WHERE b.whatsapp = a.whatsapp AND b.aluno_chave = a.aluno_chave AND b.id <> a.id) AS outros';

if ($buscando) {
    $digitos = preg_replace('/\D/', '', $busca);
    $sql = "SELECT {$colunas} FROM agendamentos a WHERE (a.aluno_nome LIKE ? OR a.nome LIKE ?"
        . ($digitos !== '' && strlen($digitos) >= 4 ? ' OR a.whatsapp LIKE ?' : '') . ')'
        . ($turmaFiltro !== '' ? ' AND a.turma_id = ?' : '')
        . ' ORDER BY a.data_aula DESC, a.inicio LIMIT 100';
    $termo = '%' . addcslashes($busca, '%_\\') . '%';
    $params = [$termo, $termo];
    if ($digitos !== '' && strlen($digitos) >= 4) {
        $params[] = '%' . $digitos . '%';
    }
} else {
    $sql = "SELECT {$colunas} FROM agendamentos a WHERE a.data_aula BETWEEN ? AND ?"
        . ($turmaFiltro !== '' ? ' AND a.turma_id = ?' : '')
        . ' ORDER BY a.data_aula, a.inicio, a.turma_nome, a.criado_em';
    $params = [$inicio->format('Y-m-d'), $fim->format('Y-m-d')];
}
if ($turmaFiltro !== '') {
    $params[] = $turmaFiltro;
}
$consulta = $pdo->prepare($sql);
$consulta->execute($params);
$agendamentos = $consulta->fetchAll();

// data → aula (turma|horário) → pessoas, e totais por status
$porDia = [];
$totais = array_fill_keys(array_keys(STATUS_AGENDAMENTO), 0);
foreach ($agendamentos as $linha) {
    $porDia[$linha['data_aula']][$linha['turma_id'] . '|' . substr($linha['inicio'], 0, 5)][] = $linha;
    $totais[$linha['status']]++;
}

/** Aulas que acontecem numa data (pela grade), com ou sem agendamento: [chave => info]. */
function aulasDoDia(array $agenda, DateTimeImmutable $dia, string $turmaFiltro): array
{
    $chave = DIAS_SEMANA[(int) $dia->format('N')];
    $aulas = [];
    if (in_array($dia->format('Y-m-d'), $agenda['diasSemAula'] ?? [], true)) {
        return $aulas;
    }
    foreach ($agenda['turmas'] as $t) {
        if ($turmaFiltro !== '' && $t['id'] !== $turmaFiltro) {
            continue;
        }
        if (in_array($chave, $t['dias'], true) && ($t['professores'][$chave] ?? null) !== null) {
            $aulas[$t['id'] . '|' . $t['inicio']] = [
                'turma_nome' => $t['nome'], 'inicio' => $t['inicio'], 'fim' => $t['fim'], 'professor' => $t['professores'][$chave],
            ];
        }
    }
    return $aulas;
}

/** Junta as aulas da grade com as que têm agendamento, em ordem de horário. */
function aulasComPessoas(array $agenda, DateTimeImmutable $dia, string $turmaFiltro, array $doDia): array
{
    $aulas = aulasDoDia($agenda, $dia, $turmaFiltro);
    foreach ($doDia as $chave => $pessoas) {
        $p = $pessoas[0];
        $turma = turmaPorId($agenda, $p['turma_id']);
        $aulas[$chave] ??= [
            'turma_nome' => $p['turma_nome'], 'inicio' => substr($p['inicio'], 0, 5), 'fim' => substr($p['fim'], 0, 5),
            'professor' => $turma ? professorDaAula($turma, $dia->format('Y-m-d')) : null,
        ];
    }
    foreach ($aulas as $chave => &$aula) {
        $aula['pessoas'] = $doDia[$chave] ?? [];
        $aula['ocupadas'] = count(array_filter($aula['pessoas'], fn ($p) => $p['status'] !== 'cancelado'));
    }
    unset($aula);
    uasort($aulas, fn ($a, $b) => strcmp($a['inicio'], $b['inicio']) ?: strcmp($a['turma_nome'], $b['turma_nome']));
    return $aulas;
}

/** "Rhaue Scuzziato" → "Rhaue" */
$primeiro = fn (?string $nome): string => $nome ? explode(' ', $nome)[0] : '';

// Dia sem agendamento: aponta o próximo dia que tem.
$proximoComAgendamento = null;
if ($ver === 'dia' && !$buscando && $agendamentos === []) {
    $q = $pdo->prepare(
        "SELECT MIN(data_aula) FROM agendamentos WHERE data_aula > ? AND status <> 'cancelado'"
        . ($turmaFiltro !== '' ? ' AND turma_id = ?' : '')
    );
    $q->execute($turmaFiltro !== '' ? [$data, $turmaFiltro] : [$data]);
    $proximoComAgendamento = $q->fetchColumn() ?: null;
}

$csrf = e($_SESSION['csrf']);
$aviso = $_SESSION['aviso'] ?? null;
unset($_SESSION['aviso']);
$voltar = e($buscando ? '?' . http_build_query(array_filter(['busca' => $busca, 'turma' => $turmaFiltro])) : linkPainel([]));

/** Uma pessoa agendada, com WhatsApp e botões de status. */
function cardPessoa(array $p, string $csrf, string $voltar, bool $mostrarAula = false): string
{
    $menor = (int) $p['para_menor'] === 1;
    $primeiroNome = explode(' ', $p['nome'])[0];
    $quando = dataPorExtenso($p['data_aula']) . ' às ' . horaCurta($p['inicio']);
    $mensagem = $menor
        ? "Oi, {$primeiroNome}! Aqui é da Academia Scuzziato. Confirmando a aula experimental de {$p['aluno_nome']} de {$p['turma_nome']}, {$quando}. Até lá!"
        : "Oi, {$primeiroNome}! Aqui é da Academia Scuzziato. Confirmando sua aula experimental de {$p['turma_nome']}, {$quando}. Até lá!";
    $zap = 'https://wa.me/55' . $p['whatsapp'] . '?text=' . rawurlencode($mensagem);
    $criado = new DateTimeImmutable($p['criado_em']);
    $id = (int) $p['id'];

    $botoes = '';
    foreach (STATUS_AGENDAMENTO as $valor => $rotulo) {
        $atual = $p['status'] === $valor;
        $botoes .= '<button class="botao st-' . e($valor) . '" type="submit" name="status" value="' . e($valor) . '" aria-pressed="'
            . ($atual ? 'true' : 'false') . '"' . ($atual ? ' disabled' : '') . '>' . e($rotulo) . '</button>';
    }

    return '<li class="pessoa ' . e($p['status']) . '" id="agendamento-' . $id . '">'
        . '<div class="pessoa-topo"><div class="nome">' . e($p['aluno_nome'])
        . ($menor && $p['aluno_idade'] !== null ? ', ' . (int) $p['aluno_idade'] . ' anos' : '') . '</div>'
        . '<span class="status st-' . e($p['status']) . '">' . e(STATUS_AGENDAMENTO[$p['status']]) . '</span></div>'
        . ($mostrarAula ? '<div class="detalhes"><b>' . e(ucfirst($quando)) . '</b> · ' . e($p['turma_nome']) . '</div>' : '')
        . '<div class="detalhes">' . ($menor ? 'Responsável: ' . e($p['nome']) . ' · ' : '')
        . '<a class="zap" href="' . e($zap) . '" target="_blank" rel="noopener noreferrer">' . e(formatarWhatsapp($p['whatsapp'])) . '</a>'
        . ' · agendou em ' . e($criado->format('d/m \à\s H:i')) . '</div>'
        . '<div class="selos"><span class="selo">' . e(EXPERIENCIAS[$p['experiencia']] ?? $p['experiencia']) . '</span>'
        . ((int) $p['outros'] > 0 ? '<span class="selo alerta">Já agendou antes (' . (int) $p['outros'] . ')</span>' : '') . '</div>'
        . '<form class="acoes" method="post" action="./" aria-label="Status de ' . e($p['aluno_nome']) . '">'
        . '<input type="hidden" name="acao" value="status"><input type="hidden" name="csrf" value="' . $csrf . '">'
        . '<input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="voltar" value="' . $voltar . '">'
        . $botoes . '</form></li>';
}

// ---------- HTML ----------

ob_start();
?>
<header class="topo">
  <div class="dentro">
    <span class="marca">Academia <b>Scuzziato</b></span>
    <form method="post" action="./" style="margin-left:auto">
      <input type="hidden" name="acao" value="testar-email">
      <input type="hidden" name="csrf" value="<?= $csrf ?>">
      <button class="botao claro" type="submit">Testar e-mail</button>
    </form>
    <form method="post" action="./">
      <input type="hidden" name="acao" value="sair">
      <input type="hidden" name="csrf" value="<?= $csrf ?>">
      <button class="botao claro" type="submit">Sair</button>
    </form>
  </div>
</header>
<main class="dentro">
  <?php if ($aviso): ?>
    <p class="aviso <?= e($aviso[0]) ?>" role="status" style="margin-top:14px"><?= e($aviso[1]) ?></p>
  <?php endif; ?>

  <div class="barra">
    <nav class="abas" aria-label="Visão">
      <?php foreach (VISOES as $valor => $rotulo): ?>
        <a href="<?= e(linkPainel(['ver' => $valor])) ?>" <?= !$buscando && $ver === $valor ? 'aria-current="page"' : '' ?>><?= e($rotulo) ?></a>
      <?php endforeach; ?>
    </nav>
    <form method="get" action="./" class="busca" role="search">
      <input type="search" name="busca" value="<?= e($busca) ?>" placeholder="Buscar nome ou WhatsApp" aria-label="Buscar nome ou WhatsApp">
      <?php if ($turmaFiltro !== ''): ?><input type="hidden" name="turma" value="<?= e($turmaFiltro) ?>"><?php endif; ?>
      <button class="botao" type="submit">Buscar</button>
    </form>
  </div>

  <?php if ($buscando): ?>
    <div class="cabeca">
      <h1>Busca: “<?= e($busca) ?>”</h1>
      <a class="botao" href="<?= e(linkPainel([])) ?>">Voltar para a agenda</a>
    </div>
    <p class="sub"><?= count($agendamentos) === 1 ? '1 agendamento encontrado' : count($agendamentos) . ' agendamentos encontrados' ?><?= count($agendamentos) === 100 ? ' (mostrando os 100 mais recentes)' : '' ?>.</p>
    <?php if ($agendamentos === []): ?>
      <p class="vazio">Nenhum agendamento com esse nome ou WhatsApp.</p>
    <?php else: ?>
      <ul class="pessoas lista-solta">
        <?php foreach ($agendamentos as $p): ?><?= cardPessoa($p, $csrf, $voltar, true) ?><?php endforeach; ?>
      </ul>
    <?php endif; ?>
  <?php else: ?>

  <div class="cabeca">
    <div>
      <h1><?= e($titulo) ?><?= $ver === 'dia' && $data === $hoje ? ' <span class="hoje">Hoje</span>' : '' ?></h1>
    </div>
    <nav class="nav" aria-label="Período">
      <a class="botao" href="<?= e(linkPainel(['data' => $anterior->format('Y-m-d')])) ?>" aria-label="<?= e($rotuloNav[0]) ?>">←</a>
      <a class="botao" href="<?= e(linkPainel(['data' => $hoje])) ?>">Hoje</a>
      <a class="botao" href="<?= e(linkPainel(['data' => $proximo->format('Y-m-d')])) ?>" aria-label="<?= e($rotuloNav[1]) ?>">→</a>
      <form method="get" action="./" class="nav" style="margin:0">
        <input type="hidden" name="ver" value="<?= e($ver) ?>">
        <input type="date" name="data" value="<?= e($data) ?>" aria-label="Ir para a data">
        <select name="turma" aria-label="Filtrar por turma">
          <option value="">Todas as turmas</option>
          <?php foreach ($agendaPainel['turmas'] as $t): ?>
            <option value="<?= e($t['id']) ?>" <?= $turmaFiltro === $t['id'] ? 'selected' : '' ?>><?= e($t['nome']) ?></option>
          <?php endforeach; ?>
        </select>
        <button class="botao" type="submit">Ver</button>
      </form>
    </nav>
  </div>

  <ul class="resumo" aria-label="Resumo do período">
    <?php foreach ($totais as $status => $n): ?>
      <li class="st-<?= e($status) ?>"><b><?= $n ?></b> <?= e(['agendado' => 'agendados', 'compareceu' => 'compareceram', 'faltou' => 'faltaram', 'cancelado' => 'cancelados'][$status]) ?></li>
    <?php endforeach; ?>
    <?php $passaram = $totais['compareceu'] + $totais['faltou']; ?>
    <?php if ($passaram > 0): ?>
      <li><b><?= (int) round(100 * $totais['compareceu'] / $passaram) ?>%</b> de comparecimento</li>
    <?php endif; ?>
  </ul>

  <?php if ($ver === 'dia'): ?>
    <?php $aulas = aulasComPessoas($agendaPainel, $dia, $turmaFiltro, $porDia[$data] ?? []); ?>
    <?php if ($agendamentos === []): ?>
      <p class="vazio">
        Ninguém agendou aula experimental para este dia.
        <?php if ($proximoComAgendamento): ?>
          <br><a class="botao principal" style="margin-top:12px" href="<?= e(linkPainel(['data' => $proximoComAgendamento])) ?>">Próximo dia com agendamento: <?= e(dataPorExtenso($proximoComAgendamento)) ?> →</a>
        <?php endif; ?>
      </p>
    <?php endif; ?>
    <?php if ($aulas !== []): ?>
      <h2>Aulas do dia</h2>
    <?php endif; ?>
    <?php foreach ($aulas as $aula): ?>
      <?php if ($aula['pessoas'] === []): ?>
        <div class="aula vazia">
          <span><b><?= e(horaCurta($aula['inicio']) . '–' . horaCurta($aula['fim'])) ?></b> · <?= e($aula['turma_nome']) ?><?= $aula['professor'] ? ' · Prof. ' . e($primeiro($aula['professor'])) : '' ?></span>
          <span class="vagas">0 de <?= $vagasPorAula ?></span>
        </div>
      <?php else: ?>
        <section class="aula" aria-label="<?= e($aula['turma_nome'] . ', ' . horaCurta($aula['inicio'])) ?>">
          <div class="aula-topo">
            <strong><?= e(horaCurta($aula['inicio']) . '–' . horaCurta($aula['fim'])) ?> · <?= e($aula['turma_nome']) ?></strong>
            <span class="vagas<?= $aula['ocupadas'] >= $vagasPorAula ? ' lotada' : '' ?>"><?= $aula['professor'] ? 'Prof. ' . e($aula['professor']) . ' · ' : '' ?><?= $aula['ocupadas'] ?> de <?= $vagasPorAula ?> vagas</span>
          </div>
          <ul class="pessoas">
            <?php foreach ($aula['pessoas'] as $p): ?><?= cardPessoa($p, $csrf, $voltar) ?><?php endforeach; ?>
          </ul>
        </section>
      <?php endif; ?>
    <?php endforeach; ?>

  <?php elseif ($ver === 'semana'): ?>
    <div class="semana">
      <?php for ($d = $inicio; $d <= $fim; $d = $d->modify('+1 day')):
          $iso = $d->format('Y-m-d');
          $aulas = array_filter(aulasComPessoas($agendaPainel, $d, $turmaFiltro, $porDia[$iso] ?? []), fn ($a) => $a['pessoas'] !== []);
          ?>
        <section class="coluna<?= $iso === $hoje ? ' e-hoje' : '' ?>" aria-label="<?= e(dataPorExtenso($iso)) ?>">
          <a class="coluna-topo" href="<?= e(linkPainel(['ver' => 'dia', 'data' => $iso])) ?>">
            <span><?= e(DIAS_CURTOS[$chaveDia($d)]) ?> <b><?= e($d->format('d/m')) ?></b></span>
            <?php if ($iso === $hoje): ?><span class="hoje">Hoje</span><?php endif; ?>
          </a>
          <?php if ($aulas === []): ?>
            <p class="nada">Sem agendamentos</p>
          <?php endif; ?>
          <?php foreach ($aulas as $aula): ?>
            <a class="mini-aula" href="<?= e(linkPainel(['ver' => 'dia', 'data' => $iso])) ?>">
              <span class="mini-topo"><b><?= e(horaCurta($aula['inicio'])) ?></b> <?= e($aula['turma_nome']) ?></span>
              <span class="mini-vagas<?= $aula['ocupadas'] >= $vagasPorAula ? ' lotada' : '' ?>"><?= $aula['ocupadas'] ?>/<?= $vagasPorAula ?><?= $aula['professor'] ? ' · ' . e($primeiro($aula['professor'])) : '' ?></span>
              <span class="chips">
                <?php foreach ($aula['pessoas'] as $p): ?>
                  <span class="chip st-<?= e($p['status']) ?>" title="<?= e(STATUS_AGENDAMENTO[$p['status']]) ?>"><?= e($p['aluno_nome']) ?></span>
                <?php endforeach; ?>
              </span>
            </a>
          <?php endforeach; ?>
        </section>
      <?php endfor; ?>
    </div>

  <?php else: ?>
    <?php
      // Calendário do mês, de segunda a domingo.
      $primeiraCasa = $inicio->modify('-' . ((int) $inicio->format('N') - 1) . ' days');
      $ultimaCasa = $fim->modify('+' . (7 - (int) $fim->format('N')) . ' days');
      $porTurma = [];
      foreach ($agendamentos as $p) {
          $porTurma[$p['turma_nome']] ??= array_fill_keys(array_keys(STATUS_AGENDAMENTO), 0);
          $porTurma[$p['turma_nome']][$p['status']]++;
      }
      ksort($porTurma);
    ?>
    <div class="mes" role="grid" aria-label="Calendário de <?= e($titulo) ?>">
      <?php foreach (DIAS_CURTOS as $rotulo): ?><div class="mes-cab" role="columnheader"><?= e($rotulo) ?></div><?php endforeach; ?>
      <?php for ($d = $primeiraCasa; $d <= $ultimaCasa; $d = $d->modify('+1 day')):
          $iso = $d->format('Y-m-d');
          $doDia = array_merge(...array_values($porDia[$iso] ?? [[]]));
          $ativos = count(array_filter($doDia, fn ($p) => $p['status'] !== 'cancelado'));
          $fora = $d->format('m') !== $inicio->format('m');
          ?>
        <a role="gridcell" class="casa<?= $fora ? ' fora' : '' ?><?= $iso === $hoje ? ' e-hoje' : '' ?><?= $ativos > 0 ? ' tem' : '' ?>"
           href="<?= e(linkPainel(['ver' => 'dia', 'data' => $iso])) ?>"
           aria-label="<?= e(dataPorExtenso($iso)) ?>: <?= $ativos === 1 ? '1 agendamento' : $ativos . ' agendamentos' ?>">
          <span class="num"><?= (int) $d->format('j') ?></span>
          <?php if ($ativos > 0): ?><span class="qtd"><?= $ativos ?></span><?php endif; ?>
        </a>
      <?php endfor; ?>
    </div>
    <p class="legenda">O número em cada dia é a quantidade de aulas experimentais agendadas (sem contar canceladas). Toque no dia para ver os nomes.</p>

    <?php if ($porTurma !== []): ?>
      <h2>Por turma no mês</h2>
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead><tr><th>Turma</th><th>Agendados</th><th>Compareceram</th><th>Faltaram</th><th>Cancelados</th></tr></thead>
          <tbody>
            <?php foreach ($porTurma as $nome => $n): ?>
              <tr><td><?= e($nome) ?></td><td><?= $n['agendado'] ?></td><td><?= $n['compareceu'] ?></td><td><?= $n['faltou'] ?></td><td><?= $n['cancelado'] ?></td></tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  <?php endif; ?>
  <?php endif; ?>
</main>
<?php
pagina('Agendamentos', (string) ob_get_clean());
