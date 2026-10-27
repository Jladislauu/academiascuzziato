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
  .marca { font-weight:800; letter-spacing:.06em; text-transform:uppercase; font-size:15px; }
  .marca b { color:var(--vermelho); }
  .dentro { max-width:860px; margin:0 auto; padding:14px 16px; }
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
  .resumo { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 0; padding:0; list-style:none; }
  .resumo li { background:#fff; border:1px solid var(--cinza-200); border-radius:10px; padding:6px 12px; font-size:14px; }
  .resumo b { font-size:17px; }
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

if ($acao === 'status') {
    $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $status = (string) ($_POST['status'] ?? '');
    if ($id !== false && array_key_exists($status, STATUS_AGENDAMENTO)) {
        $pdo->prepare('UPDATE agendamentos SET status = ?, status_em = ? WHERE id = ?')
            ->execute([$status, agora()->format('Y-m-d H:i:s'), $id]);
    }
    $voltar = (string) ($_POST['de'] ?? '');
    irPara('/painel/' . (dataValida($voltar) ? '?de=' . $voltar : '') . ($id !== false ? '#agendamento-' . $id : ''));
}

// ---------- Semana ----------

$hoje = agora()->format('Y-m-d');
$de = (string) ($_GET['de'] ?? '');
if (!dataValida($de)) {
    $de = $hoje;
}
$inicio = new DateTimeImmutable($de . ' 12:00', new DateTimeZone(FUSO_ACADEMIA));
$ate = $inicio->modify('+6 days')->format('Y-m-d');
$anterior = $inicio->modify('-7 days')->format('Y-m-d');
$proxima = $inicio->modify('+7 days')->format('Y-m-d');

$consulta = $pdo->prepare(
    'SELECT a.*,
        (SELECT COUNT(*) FROM agendamentos b
          WHERE b.whatsapp = a.whatsapp AND b.aluno_chave = a.aluno_chave AND b.id <> a.id) AS outros
     FROM agendamentos a
     WHERE a.data_aula BETWEEN ? AND ?
     ORDER BY a.data_aula, a.inicio, a.turma_nome, a.criado_em'
);
$consulta->execute([$de, $ate]);

// data → aula (turma + horário) → pessoas
$dias = [];
$totais = ['agendado' => 0, 'compareceu' => 0, 'faltou' => 0, 'cancelado' => 0];
foreach ($consulta as $linha) {
    $chave = $linha['turma_id'] . '|' . $linha['inicio'];
    $dias[$linha['data_aula']][$chave][] = $linha;
    $totais[$linha['status']]++;
}

try {
    $agendaPainel = carregarAgenda();
    $vagasPorAula = (int) $agendaPainel['vagasPorAula'];
} catch (Throwable) {
    $agendaPainel = null;
    $vagasPorAula = 5;
}

$csrf = e($_SESSION['csrf']);
$aviso = $_SESSION['aviso'] ?? null;
unset($_SESSION['aviso']);

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
  <h1>Aulas experimentais</h1>
  <p class="sub"><?= e(ucfirst(dataPorExtenso($de))) ?> a <?= e(dataPorExtenso($ate)) ?></p>

  <nav class="nav" aria-label="Semanas">
    <a class="botao" href="?de=<?= e($anterior) ?>">← Anterior</a>
    <?php if ($de !== $hoje): ?><a class="botao" href="./">Hoje</a><?php endif; ?>
    <a class="botao" href="?de=<?= e($proxima) ?>">Próxima →</a>
    <form method="get" action="./" class="nav" style="margin:0">
      <label for="de" class="sub" style="margin:0">A partir de</label>
      <input id="de" name="de" type="date" value="<?= e($de) ?>">
      <button class="botao" type="submit">Ver</button>
    </form>
  </nav>

  <?php if (array_sum($totais) > 0): ?>
    <ul class="resumo" aria-label="Resumo da semana">
      <?php foreach ($totais as $status => $n): ?>
        <li><b><?= $n ?></b> <?= e(mb_strtolower(STATUS_AGENDAMENTO[$status])) ?><?= $n === 1 || $status === 'agendado' ? '' : 's' ?></li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>

  <?php if ($dias === []): ?>
    <h2>Nenhum agendamento</h2>
    <p class="vazio">Ninguém agendou aula experimental para esses dias.</p>
  <?php endif; ?>

  <?php foreach ($dias as $data => $aulas): ?>
    <h2><?= $data === $hoje ? 'Hoje · ' : '' ?><?= e(dataPorExtenso($data)) ?></h2>
    <?php foreach ($aulas as $pessoas):
        $primeira = $pessoas[0];
        $ocupadas = count(array_filter($pessoas, fn ($p) => $p['status'] !== 'cancelado'));
        $quando = dataPorExtenso($data) . ' às ' . horaCurta($primeira['inicio']);
        $turmaInfo = $agendaPainel ? turmaPorId($agendaPainel, $primeira['turma_id']) : null;
        $professor = $turmaInfo ? professorDaAula($turmaInfo, $data) : null;
        ?>
      <section class="aula" aria-label="<?= e($primeira['turma_nome'] . ', ' . $quando) ?>">
        <div class="aula-topo">
          <strong><?= e(horaCurta($primeira['inicio']) . '–' . horaCurta($primeira['fim'])) ?> · <?= e($primeira['turma_nome']) ?><?= $professor ? ' · Prof. ' . e($professor) : '' ?></strong>
          <span class="vagas<?= $ocupadas >= $vagasPorAula ? ' lotada' : '' ?>"><?= $ocupadas ?> de <?= $vagasPorAula ?> vagas</span>
        </div>
        <ul class="pessoas">
          <?php foreach ($pessoas as $p):
              $menor = (int) $p['para_menor'] === 1;
              $primeiroNome = explode(' ', $p['nome'])[0];
              $mensagem = $menor
                  ? "Oi, {$primeiroNome}! Aqui é da Academia Scuzziato. Confirmando a aula experimental de {$p['aluno_nome']} de {$p['turma_nome']}, {$quando}. Até lá!"
                  : "Oi, {$primeiroNome}! Aqui é da Academia Scuzziato. Confirmando sua aula experimental de {$p['turma_nome']}, {$quando}. Até lá!";
              $zap = 'https://wa.me/55' . $p['whatsapp'] . '?text=' . rawurlencode($mensagem);
              $criado = new DateTimeImmutable($p['criado_em']);
              ?>
            <li class="pessoa <?= e($p['status']) ?>" id="agendamento-<?= (int) $p['id'] ?>">
              <div class="nome"><?= e($p['aluno_nome']) ?><?= $menor && $p['aluno_idade'] !== null ? ', ' . (int) $p['aluno_idade'] . ' anos' : '' ?></div>
              <div class="detalhes">
                <?php if ($menor): ?>Responsável: <?= e($p['nome']) ?> · <?php endif; ?>
                <a class="zap" href="<?= e($zap) ?>" target="_blank" rel="noopener noreferrer"><?= e(formatarWhatsapp($p['whatsapp'])) ?></a>
                · agendou em <?= e($criado->format('d/m \à\s H:i')) ?>
              </div>
              <div class="selos">
                <span class="selo"><?= e(EXPERIENCIAS[$p['experiencia']] ?? $p['experiencia']) ?></span>
                <?php if ((int) $p['outros'] > 0): ?>
                  <span class="selo alerta">Já agendou antes (<?= (int) $p['outros'] ?>)</span>
                <?php endif; ?>
              </div>
              <form class="acoes" method="post" action="./" aria-label="Status de <?= e($p['aluno_nome']) ?>">
                <input type="hidden" name="acao" value="status">
                <input type="hidden" name="csrf" value="<?= $csrf ?>">
                <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                <input type="hidden" name="de" value="<?= e($de) ?>">
                <?php foreach (STATUS_AGENDAMENTO as $valor => $rotulo): ?>
                  <button class="botao" type="submit" name="status" value="<?= e($valor) ?>" aria-pressed="<?= $p['status'] === $valor ? 'true' : 'false' ?>"<?= $p['status'] === $valor ? ' disabled' : '' ?>><?= e($rotulo) ?></button>
                <?php endforeach; ?>
              </form>
            </li>
          <?php endforeach; ?>
        </ul>
      </section>
    <?php endforeach; ?>
  <?php endforeach; ?>
</main>
<?php
pagina('Agendamentos', (string) ob_get_clean());
