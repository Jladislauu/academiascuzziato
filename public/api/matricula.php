<?php

declare(strict_types=1);

/*
 * Matrícula online (Academia Scuzziato): cria o cliente e a assinatura mensal no
 * Asaas e grava aluno + matrícula (aguardando_pagamento) + primeira cobrança.
 *
 * A matrícula só fica ativa quando a primeira mensalidade é paga — confirmado
 * pelo webhook do Asaas (ver asaas-webhook.php), nunca por esta requisição.
 *
 * Solução provisória (depois migra para a Thryve Agenda). O CPF nunca é
 * gravado no nosso banco: vai só para o Asaas.
 *
 * As regras de validação são as mesmas de src/lib/matricula.ts. Mudou lá, mude aqui.
 * Credenciais: config.local.php fora da pasta pública (ver server/config.local.example.php).
 */

require __DIR__ . '/inc/comum.php';
require __DIR__ . '/inc/asaas.php';
require __DIR__ . '/inc/matriculas.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const ERRO_SERVIDOR = 'Não conseguimos matricular agora. Tente de novo em instantes ou fale com a gente no WhatsApp.';

function responder(int $status, array $corpo): void
{
    http_response_code($status);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Cancela no Asaas uma assinatura que acabou de ser criada mas não pôde ser
 * gravada aqui (cobrança não veio, ou a gravação no banco falhou), para não
 * deixar uma assinatura cobrando sem nenhum registro nosso. Se o próprio
 * cancelamento falhar, fica registrado no log para conferir à mão.
 */
function cancelarAssinaturaOrfa(array $config, string $subscriptionId): void
{
    try {
        asaasCancelarAssinatura($config, $subscriptionId);
    } catch (Throwable $e) {
        error_log("matricula.php: falha ao cancelar assinatura órfã {$subscriptionId} no Asaas: " . $e->getMessage());
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responder(405, ['ok' => false, 'erro' => 'Método não permitido.']);
}

try {
    $config = carregarConfig();
    $matricula = carregarMatricula();
    $pdo = conectar($config);
} catch (Throwable $e) {
    error_log('matricula.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

$agora = agora();

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
    responder(200, ['ok' => true, 'faturaUrl' => '']);
}

// ---------- Validação ----------

$erros = [];

$plano = planoMatriculaPorId($matricula, (string) ($dados['plano'] ?? ''));
if ($plano === null) {
    responder(422, ['ok' => false, 'erro' => 'Escolha um plano.', 'campos' => ['plano' => 'Escolha o plano.']]);
}

$modalidade = $dados['modalidade'] ?? null;
if ($plano['id'] === 'uma-modalidade') {
    if (!is_string($modalidade) || !in_array($modalidade, $matricula['modalidades'], true)) {
        $erros['modalidade'] = 'Escolha a modalidade.';
    }
} else {
    $modalidade = null;
}

$turmasPretendidas = [];
foreach ((array) ($dados['turmas'] ?? []) as $turmaId) {
    if (!is_string($turmaId)) {
        continue;
    }
    $turma = turmaMatriculaPorId($matricula, $turmaId);
    if ($turma === null) {
        continue; // id desconhecido: ignora em vez de recusar a matrícula inteira
    }
    if ($modalidade !== null && $turma['modalidade'] !== $modalidade) {
        continue; // turma de outra modalidade no plano "uma modalidade": ignora
    }
    $turmasPretendidas[] = $turma['id'];
}

$paraQuem = (string) ($dados['paraQuem'] ?? '');
if (!in_array($paraQuem, ['eu', 'menor'], true)) {
    $erros['paraQuem'] = 'Diga quem vai treinar.';
}
$paraMenor = $paraQuem === 'menor';

$nomeAluno = limparNome((string) ($dados['nomeAluno'] ?? ''));
if (mb_strlen($nomeAluno) < 2 || mb_strlen($nomeAluno) > 100) {
    $erros['nomeAluno'] = 'Informe o nome de quem vai treinar.';
}

$dataNascimento = (string) ($dados['dataNascimento'] ?? '');
$idade = calcularIdade($dataNascimento, $agora);
if ($idade === null) {
    $erros['dataNascimento'] = 'Informe a data de nascimento.';
} elseif (!$paraMenor && $idade < 18) {
    $erros['dataNascimento'] = 'Menores de 18 anos são matriculados pelo responsável. Escolha "Meu filho ou filha".';
}

$nomeResponsavel = null;
if ($paraMenor) {
    $nomeResponsavel = limparNome((string) ($dados['nomeResponsavel'] ?? ''));
    if (mb_strlen($nomeResponsavel) < 2 || mb_strlen($nomeResponsavel) > 100) {
        $erros['nomeResponsavel'] = 'Informe o nome do responsável.';
    }
}

$cpfPagador = (string) preg_replace('/\D/', '', (string) ($dados['cpfPagador'] ?? ''));
if (!cpfValido($cpfPagador)) {
    $erros['cpfPagador'] = $paraMenor ? 'Informe um CPF válido do responsável.' : 'Informe um CPF válido.';
}

$emailPagador = trim((string) ($dados['emailPagador'] ?? ''));
if (filter_var($emailPagador, FILTER_VALIDATE_EMAIL) === false) {
    $erros['emailPagador'] = 'Informe um e-mail válido.';
}

$whatsappPagador = (string) preg_replace('/\D/', '', (string) ($dados['whatsappPagador'] ?? ''));
if (strlen($whatsappPagador) >= 12 && str_starts_with($whatsappPagador, '55')) {
    $whatsappPagador = substr($whatsappPagador, 2);
}
if (!preg_match('/^[1-9]{2}9?\d{8}$/', $whatsappPagador)) {
    $erros['whatsappPagador'] = 'Informe um WhatsApp com DDD.';
}

$termoVersao = (string) ($dados['termoVersao'] ?? '');
$aceiteTermo = ($dados['aceiteTermo'] ?? false) === true;
if (!$aceiteTermo) {
    $erros['aceiteTermo'] = 'Para se matricular, é preciso aceitar o termo de adesão.';
} elseif ($termoVersao !== (string) $matricula['termoVersao']) {
    $erros['aceiteTermo'] = 'O termo de adesão foi atualizado. Recarregue a página e confira os dados antes de continuar.';
}

$imagemAutorizada = ($dados['imagemAutorizada'] ?? false) === true;

if (($dados['consentimento'] ?? false) !== true) {
    $erros['consentimento'] = 'Para se matricular, é preciso concordar com o uso dos dados.';
}

if ($erros) {
    responder(422, ['ok' => false, 'erro' => 'Confira os campos destacados.', 'campos' => $erros]);
}

$valor = (float) $plano['precoMensal'] + (float) $matricula['taxaAdesao'];
$alunoChave = chaveNome($nomeAluno);
$ipHash = hashIp($config);

// ---------- Limite por IP ----------

try {
    $limite = (int) ($config['limite']['envios'] ?? 5);
    $janelaMinutos = (int) ($config['limite']['janela_minutos'] ?? 60);
    $consulta = $pdo->prepare('SELECT COUNT(*) FROM alunos WHERE ip_hash = ? AND criado_em > ?');
    $consulta->execute([$ipHash, $agora->modify("-{$janelaMinutos} minutes")->format('Y-m-d H:i:s')]);
    if ((int) $consulta->fetchColumn() >= $limite) {
        responder(429, [
            'ok' => false,
            'erro' => 'Recebemos vários envios seguidos daqui. Tente de novo mais tarde ou fale com a gente no WhatsApp.',
        ]);
    }
} catch (PDOException $e) {
    error_log('matricula.php: erro no banco: ' . $e->getMessage());
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

// ---------- Trava por pessoa (evita duas assinaturas da mesma matrícula enviada duas vezes) ----------

$nomeTrava = 'scuzziato_matricula_' . substr(hash('sha256', $whatsappPagador . '|' . $alunoChave), 0, 32);
if ((int) $pdo->query("SELECT GET_LOCK('{$nomeTrava}', 10)")->fetchColumn() !== 1) {
    error_log('matricula.php: não conseguiu a trava da matrícula');
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

$recusa = null;
$resultado = null;

try {
    try {
        $existente = $pdo->prepare(
            'SELECT a.id AS aluno_id, a.asaas_customer_id, m.id AS matricula_id, m.status
             FROM alunos a LEFT JOIN matriculas m ON m.aluno_id = a.id
             WHERE a.whatsapp = ? AND a.aluno_chave = ?
             ORDER BY m.criado_em DESC LIMIT 1'
        );
        $existente->execute([$whatsappPagador, $alunoChave]);
        $linha = $existente->fetch();

        if ($linha && $linha['status'] === 'aguardando_pagamento') {
            $cobranca = $pdo->prepare('SELECT link_fatura FROM cobrancas WHERE matricula_id = ? ORDER BY criado_em DESC LIMIT 1');
            $cobranca->execute([$linha['matricula_id']]);
            $faturaUrl = (string) $cobranca->fetchColumn();
            $resultado = ['ok' => true, 'faturaUrl' => $faturaUrl, 'jaExiste' => true];
        } elseif ($linha && in_array($linha['status'], ['ativa', 'inadimplente'], true)) {
            $recusa = [409, [
                'ok' => false,
                'erro' => 'Você já tem uma matrícula na Academia Scuzziato. Para trocar o plano ou os dados, fale com a gente no WhatsApp.',
                'matriculaAtiva' => true,
            ]];
        } else {
            // Sem matrícula, ou a última foi cancelada: cria uma nova (reaproveitando o aluno, se já existir).
            $assinatura = null;
            try {
                $customerId = asaasBuscarOuCriarCliente($config, [
                    'nome' => $paraMenor ? $nomeResponsavel : $nomeAluno,
                    'cpfCnpj' => $cpfPagador,
                    'email' => $emailPagador,
                    'whatsapp' => $whatsappPagador,
                ]);
                $descricao = "Academia Scuzziato — Plano {$plano['nome']}";
                $assinatura = asaasCriarAssinatura($config, $customerId, $valor, $descricao);
                $primeiraCobranca = asaasPrimeiraCobranca($config, (string) $assinatura['id']);
            } catch (Throwable $e) {
                error_log('matricula.php: Asaas: ' . $e->getMessage());
                // A assinatura pode ter sido criada mesmo com a cobrança falhando: cancela para não deixar órfã.
                if ($assinatura !== null) {
                    cancelarAssinaturaOrfa($config, (string) $assinatura['id']);
                }
                $recusa = [500, ['ok' => false, 'erro' => ERRO_SERVIDOR]];
            }

            if ($recusa === null) {
                $agoraTexto = $agora->format('Y-m-d H:i:s');
                $pdo->beginTransaction();
                try {
                    if ($linha) {
                        $alunoId = (int) $linha['aluno_id'];
                        $pdo->prepare(
                            'UPDATE alunos SET data_nascimento = ?, email = ?, responsavel_nome = ?, asaas_customer_id = ?,
                                imagem_autorizada = ?, imagem_autorizada_em = ?, consentimento_em = ?, termo_aceito_em = ?, termo_versao = ?
                             WHERE id = ?'
                        )->execute([
                            $dataNascimento, $emailPagador, $nomeResponsavel, $customerId,
                            $imagemAutorizada ? 1 : 0, $imagemAutorizada ? $agoraTexto : null, $agoraTexto, $agoraTexto, $termoVersao,
                            $alunoId,
                        ]);
                    } else {
                        $pdo->prepare(
                            'INSERT INTO alunos
                                (nome, aluno_chave, data_nascimento, whatsapp, email, responsavel_nome, asaas_customer_id,
                                 imagem_autorizada, imagem_autorizada_em, consentimento_em, termo_aceito_em, termo_versao, criado_em, ip_hash)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                        )->execute([
                            $nomeAluno, $alunoChave, $dataNascimento, $whatsappPagador, $emailPagador, $nomeResponsavel, $customerId,
                            $imagemAutorizada ? 1 : 0, $imagemAutorizada ? $agoraTexto : null, $agoraTexto, $agoraTexto, $termoVersao,
                            $agoraTexto, $ipHash,
                        ]);
                        $alunoId = (int) $pdo->lastInsertId();
                    }

                    $pdo->prepare(
                        'INSERT INTO matriculas (aluno_id, plano_id, modalidade, turmas, valor, status, asaas_subscription_id, criado_em)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                    )->execute([
                        $alunoId, $plano['id'], $modalidade, $turmasPretendidas ? implode(',', $turmasPretendidas) : null,
                        $valor, 'aguardando_pagamento', $assinatura['id'], $agoraTexto,
                    ]);
                    $matriculaId = (int) $pdo->lastInsertId();

                    $pdo->prepare(
                        'INSERT INTO cobrancas (matricula_id, asaas_payment_id, vencimento, valor, status, link_fatura, criado_em)
                         VALUES (?, ?, ?, ?, ?, ?, ?)'
                    )->execute([
                        $matriculaId, $primeiraCobranca['id'], $primeiraCobranca['dueDate'], $primeiraCobranca['value'],
                        $primeiraCobranca['status'], $primeiraCobranca['invoiceUrl'], $agoraTexto,
                    ]);

                    $pdo->commit();
                    $resultado = ['ok' => true, 'faturaUrl' => (string) $primeiraCobranca['invoiceUrl']];
                } catch (Throwable $e) {
                    $pdo->rollBack();
                    error_log("matricula.php: gravação falhou após criar a assinatura {$assinatura['id']} no Asaas: " . $e->getMessage());
                    // Nada foi gravado aqui: cancela a assinatura no Asaas para não deixar órfã.
                    cancelarAssinaturaOrfa($config, (string) $assinatura['id']);
                    $recusa = [500, ['ok' => false, 'erro' => ERRO_SERVIDOR]];
                }
            }
        }
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('{$nomeTrava}')");
    }
} catch (Throwable $e) {
    error_log('matricula.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'erro' => ERRO_SERVIDOR]);
}

if ($recusa !== null) {
    responder(...$recusa);
}

// ---------- Resposta e e-mail de aviso ----------

if ($resultado['jaExiste'] ?? false) {
    responder(200, $resultado);
}

responderEContinuar(201, $resultado);

enviarEmail(
    $config,
    "Nova matrícula aguardando pagamento: {$plano['nome']}",
    implode("\n", array_filter([
        'Nova matrícula feita pelo site, aguardando o pagamento da primeira mensalidade.',
        '',
        "Plano: {$plano['nome']}" . ($modalidade !== null ? " ({$modalidade})" : ''),
        'Valor: R$ ' . number_format($valor, 2, ',', '.') . '/mês',
        '',
        $paraMenor ? "Aluno: {$nomeAluno}" : "Aluno: {$nomeAluno} (também o pagador)",
        $paraMenor ? "Responsável (pagador): {$nomeResponsavel}" : null,
        'WhatsApp: ' . formatarWhatsapp($whatsappPagador),
        "Conversar: https://wa.me/55{$whatsappPagador}",
        'E-mail: ' . $emailPagador,
        $turmasPretendidas ? 'Turmas pretendidas: ' . implode(', ', $turmasPretendidas) : null,
        '',
        'Link da fatura: ' . $resultado['faturaUrl'],
        '',
        'Matriculado pelo site em ' . $agora->format('d/m/Y') . ' às ' . $agora->format('H:i') . '.',
    ], fn ($linha) => $linha !== null))
);
exit;
