<?php

declare(strict_types=1);

/*
 * Agendamento da aula experimental (Academia Scuzziato).
 *
 *   GET  → próximas aulas de cada turma com as vagas que sobram
 *   POST → reserva a vaga (JSON do site), grava na tabela `agendamentos` e avisa a academia por e-mail
 *
 * Regras:
 *   - Turmas, dias, horários e vagas vêm de api/turmas.json, gerado no build a partir de src/data.
 *   - A pessoa agenda só a primeira aula; depois vem nas outras da semana sem agendar.
 *     Por isso quem já tem aula experimental marcada (mesmo WhatsApp e mesmo aluno) não agenda outra.
 *   - Até `vagasPorAula` pessoas por aula. Cancelados no painel liberam a vaga.
 *
 * As regras de validação são as mesmas de src/lib/agenda.ts. Mudou lá, mude aqui.
 * Credenciais: config.local.php fora da pasta pública (ver server/config.local.example.php).
 */

require __DIR__ . '/inc/comum.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const ERRO_SERVIDOR = 'Não conseguimos agendar agora. Tente de novo em instantes ou fale com a gente no WhatsApp.';
const IDADE_MIN = 1;
const IDADE_MAX = 17;

function responder(int $status, array $corpo): void
{
    http_response_code($status);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
    exit;
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? '';
if ($metodo !== 'GET' && $metodo !== 'POST') {
    header('Allow: GET, POST');
    responder(405, ['ok' => false, 'erro' => 'Método não permitido.']);
}

try {
    $config = carregarConfig();
    $agenda = carregarAgenda();
    $pdo = conectar($config);
} catch (Throwable $e) {
    error_log('agendamento.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

$agora = agora();
$vagasPorAula = (int) $agenda['vagasPorAula'];

// ---------- GET: próximas aulas e vagas ----------

if ($metodo === 'GET') {
    $hoje = $agora->format('Y-m-d');
    $ultimoDia = $agora->modify('+' . (int) $agenda['diasAFrente'] . ' days')->format('Y-m-d');

    try {
        $ocupadas = vagasOcupadas($pdo, $hoje, $ultimoDia);
    } catch (PDOException $e) {
        error_log('agendamento.php: erro no banco: ' . $e->getMessage());
        responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
    }

    $aulas = [];
    foreach ($agenda['turmas'] as $turma) {
        foreach (proximasAulas($turma, $agenda, $agora) as $data) {
            $aulas[] = [
                'turma' => $turma['id'],
                'data' => $data,
                'vagas' => max(0, $vagasPorAula - ($ocupadas[$turma['id'] . '|' . $data] ?? 0)),
            ];
        }
    }

    responder(200, ['ok' => true, 'aulas' => $aulas]);
}

// ---------- POST: reservar a vaga ----------

// Só aceita envios vindos do próprio site.
$origem = $_SERVER['HTTP_ORIGIN'] ?? '';
$origensPermitidas = array_merge(ORIGENS_DO_SITE, (array) ($config['origens_permitidas'] ?? []));
if ($origem !== '' && !in_array($origem, $origensPermitidas, true)) {
    responder(403, ['ok' => false, 'erro' => 'Origem não permitida.']);
}

$bruto = file_get_contents('php://input', false, null, 0, 10000);
$dados = json_decode($bruto === false ? '' : $bruto, true);
if (!is_array($dados)) {
    responder(400, ['ok' => false, 'erro' => 'Envio inválido.']);
}

// Honeypot preenchido = robô. Responde "ok" para não dar pista, mas não grava nada.
if (trim((string) ($dados['empresa'] ?? '')) !== '') {
    responder(200, ['ok' => true]);
}

$erros = [];

$turma = turmaPorId($agenda, (string) ($dados['turma'] ?? ''));
if ($turma === null) {
    responder(422, ['ok' => false, 'erro' => 'Essa turma não está aberta para agendamento.', 'campos' => ['turma' => 'Escolha a turma.']]);
}

$data = (string) ($dados['data'] ?? '');
if (!in_array($data, proximasAulas($turma, $agenda, $agora), true)) {
    responder(422, [
        'ok' => false,
        'erro' => 'Esse dia não está mais disponível. Escolha outro.',
        'campos' => ['data' => 'Escolha outro dia.'],
        'atualizar' => true,
    ]);
}

// Turma infantil é sempre agendada pelo responsável.
$paraMenor = $turma['infantil'] || ($dados['paraQuem'] ?? '') === 'menor';
if (!$turma['infantil'] && !in_array($dados['paraQuem'] ?? '', ['eu', 'menor'], true)) {
    $erros['paraQuem'] = 'Diga quem vai treinar.';
}

$nome = limparNome((string) ($dados['nome'] ?? ''));
if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) {
    $erros['nome'] = $paraMenor ? 'Informe o nome do responsável.' : 'Informe seu nome.';
}

$aluno = $nome;
$idade = null;
if ($paraMenor) {
    $aluno = limparNome((string) ($dados['aluno'] ?? ''));
    if (mb_strlen($aluno) < 2 || mb_strlen($aluno) > 100) {
        $erros['aluno'] = 'Informe o nome de quem vai treinar.';
    }
    $idade = filter_var($dados['idade'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => IDADE_MIN, 'max_range' => IDADE_MAX],
    ]);
    if ($idade === false) {
        $erros['idade'] = 'Informe a idade (até 17 anos).';
        $idade = null;
    }
}

$whatsapp = (string) preg_replace('/\D/', '', (string) ($dados['whatsapp'] ?? ''));
if (strlen($whatsapp) >= 12 && str_starts_with($whatsapp, '55')) {
    $whatsapp = substr($whatsapp, 2);
}
if (!preg_match('/^[1-9]{2}9?\d{8}$/', $whatsapp)) {
    $erros['whatsapp'] = 'Informe um WhatsApp com DDD.';
}

$experiencia = (string) ($dados['experiencia'] ?? '');
if (!array_key_exists($experiencia, EXPERIENCIAS)) {
    $erros['experiencia'] = 'Escolha uma opção.';
}

if (($dados['consentimento'] ?? false) !== true) {
    $erros['consentimento'] = 'Para agendar, é preciso concordar com o uso dos dados.';
}

if ($erros) {
    responder(422, ['ok' => false, 'erro' => 'Confira os campos destacados.', 'campos' => $erros]);
}

$ipHash = hashIp($config);
$limite = (int) ($config['limite']['envios'] ?? 5);
$janelaMinutos = (int) ($config['limite']['janela_minutos'] ?? 60);
$quando = dataPorExtenso($data) . ' às ' . horaCurta($turma['inicio']);

try {
    // Limite de envios por IP (só o hash do IP é guardado).
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM agendamentos WHERE ip_hash = ? AND criado_em > ?');
    $consulta->execute([$ipHash, $agora->modify("-{$janelaMinutos} minutes")->format('Y-m-d H:i:s')]);
    if ((int) $consulta->fetchColumn() >= $limite) {
        responder(429, [
            'ok' => false,
            'erro' => 'Recebemos vários agendamentos seguidos daqui. Tente de novo mais tarde ou fale com a gente no WhatsApp.',
        ]);
    }

    // Uma reserva por vez: as vagas são conferidas e gravadas sem outra reserva no meio.
    if ((int) $pdo->query("SELECT GET_LOCK('scuzziato_agendamento', 10)")->fetchColumn() !== 1) {
        throw new RuntimeException('não conseguiu a trava do agendamento');
    }

    // A resposta de recusa sai depois de soltar a trava (exit não passa pelo finally).
    $recusa = null;
    try {
        // Já tem aula experimental marcada? A semana grátis começa nela.
        $existente = $pdo->prepare(
            "SELECT turma_nome, data_aula, inicio FROM agendamentos
             WHERE whatsapp = ? AND aluno_chave = ? AND status = 'agendado' AND data_aula >= ?
             ORDER BY data_aula LIMIT 1"
        );
        $existente->execute([$whatsapp, chaveNome($aluno), $agora->format('Y-m-d')]);
        $marcada = $existente->fetch();
        $ocupadas = vagasOcupadas($pdo, $data, $data)[$turma['id'] . '|' . $data] ?? 0;

        if ($marcada) {
            $quem = $paraMenor ? "{$aluno} já tem" : 'Você já tem';
            $recusa = [409, [
                'ok' => false,
                'erro' => "{$quem} aula experimental marcada: {$marcada['turma_nome']}, "
                    . dataPorExtenso($marcada['data_aula']) . ' às ' . horaCurta($marcada['inicio'])
                    . '. Depois dela, a semana grátis segue sem precisar agendar de novo. Para trocar o dia, fale com a gente no WhatsApp.',
                'jaAgendado' => true,
            ]];
        } elseif ($ocupadas >= $vagasPorAula) {
            $recusa = [409, [
                'ok' => false,
                'erro' => 'Essa aula acabou de lotar. Escolha outro dia.',
                'campos' => ['data' => 'Aula lotada. Escolha outro dia.'],
                'atualizar' => true,
            ]];
        } else {
            $agoraTexto = $agora->format('Y-m-d H:i:s');
            $insercao = $pdo->prepare(
                'INSERT INTO agendamentos
                    (criado_em, turma_id, turma_nome, data_aula, inicio, fim, nome, whatsapp, para_menor,
                     aluno_nome, aluno_chave, aluno_idade, experiencia, status, consentimento_em, ip_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $insercao->execute([
                $agoraTexto,
                $turma['id'],
                $turma['nome'],
                $data,
                $turma['inicio'],
                $turma['fim'],
                $nome,
                $whatsapp,
                $paraMenor ? 1 : 0,
                $aluno,
                chaveNome($aluno),
                $idade,
                $experiencia,
                'agendado',
                $agoraTexto,
                $ipHash,
            ]);
        }
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('scuzziato_agendamento')");
    }
} catch (Throwable $e) {
    error_log('agendamento.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

if ($recusa !== null) {
    responder(...$recusa);
}

// ---------- E-mail de aviso (falha aqui não perde o agendamento) ----------

$vagasRestantes = $vagasPorAula - $ocupadas - 1;
enviarEmail(
    $config,
    "Aula experimental: {$turma['nome']} — " . dataPorExtenso($data) . ' ' . horaCurta($turma['inicio']),
    implode("\n", array_filter([
        'Nova aula experimental agendada pelo site.',
        '',
        "Turma: {$turma['nome']}",
        'Quando: ' . ucfirst($quando),
        '',
        $paraMenor ? "Aluno: {$aluno}, {$idade} anos" : "Aluno: {$aluno}",
        $paraMenor ? "Responsável: {$nome}" : null,
        'WhatsApp: ' . formatarWhatsapp($whatsapp),
        "Conversar: https://wa.me/55{$whatsapp}",
        'Experiência: ' . EXPERIENCIAS[$experiencia],
        '',
        $vagasRestantes > 0 ? "Vagas restantes nessa aula: {$vagasRestantes}" : 'A aula ficou lotada.',
        '',
        'Agendado pelo site em ' . $agora->format('d/m/Y') . ' às ' . $agora->format('H:i') . '.',
    ], fn ($linha) => $linha !== null))
);

responder(201, [
    'ok' => true,
    'aula' => ['turma' => $turma['id'], 'data' => $data, 'inicio' => $turma['inicio'], 'fim' => $turma['fim']],
]);
