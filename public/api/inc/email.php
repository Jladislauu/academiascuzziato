<?php

declare(strict_types=1);

/*
 * Avisos por e-mail para a academia (novo agendamento, novo interesse, teste do painel).
 *
 * Com `smtp` preenchido no config.local.php, envia pelo SMTP do Gmail da academia
 * (PHPMailer 6.12.0, em ./PHPMailer, licença LGPL 2.1). Sem `smtp`, ou se o Gmail
 * recusar, tenta o mail() do servidor. Falha no e-mail nunca desfaz o que já foi gravado.
 *
 * Gmail: precisa da verificação em duas etapas ligada e de uma "senha de app"
 * (Conta Google → Segurança → Senhas de app). A senha normal da conta não funciona.
 */

if (realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

use PHPMailer\PHPMailer\Exception as ErroPHPMailer;
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

const NOME_REMETENTE = 'Site Academia Scuzziato';

/**
 * Envia um aviso em texto puro para o destino do config (ou para $destino).
 *
 * @return array{ok: bool, via: ?string, erro: string} via = 'gmail' | 'servidor'
 */
function enviarEmail(array $config, string $assunto, string $corpo, ?string $destino = null): array
{
    $destino = trim((string) ($destino ?? $config['email']['destino'] ?? ''));
    if ($destino === '') {
        return ['ok' => false, 'via' => null, 'erro' => 'Nenhum destino em email.destino no config.local.php.'];
    }

    $erroSmtp = '';
    $smtp = $config['smtp'] ?? null;
    if (is_array($smtp) && trim((string) ($smtp['usuario'] ?? '')) !== '') {
        $email = new PHPMailer(true);
        try {
            $email->isSMTP();
            $email->Host = (string) ($smtp['host'] ?? 'smtp.gmail.com');
            $email->Port = (int) ($smtp['porta'] ?? 465);
            $seguranca = (string) ($smtp['seguranca'] ?? 'ssl');
            $email->SMTPSecure = match ($seguranca) {
                'ssl' => PHPMailer::ENCRYPTION_SMTPS,
                'tls' => PHPMailer::ENCRYPTION_STARTTLS,
                default => '',
            };
            $email->SMTPAutoTLS = $seguranca !== '';
            $email->SMTPAuth = trim((string) ($smtp['senha'] ?? '')) !== '';
            $email->Username = (string) $smtp['usuario'];
            $email->Password = str_replace(' ', '', (string) ($smtp['senha'] ?? '')); // senha de app vem com espaços
            $email->Timeout = 15;
            $email->CharSet = PHPMailer::CHARSET_UTF8;
            $email->isHTML(false);
            // O Gmail só envia com o próprio endereço como remetente.
            $email->setFrom((string) $smtp['usuario'], NOME_REMETENTE);
            $email->addAddress($destino);
            $email->Subject = $assunto;
            $email->Body = $corpo;
            $email->send();
            return ['ok' => true, 'via' => 'gmail', 'erro' => ''];
        } catch (ErroPHPMailer $e) {
            $erroSmtp = $email->ErrorInfo !== '' ? $email->ErrorInfo : $e->getMessage();
            error_log('email: SMTP falhou: ' . $erroSmtp);
        }
    }

    // Sem SMTP configurado, ou o Gmail recusou: tenta o envio do próprio servidor.
    $remetente = (string) ($config['email']['remetente'] ?? '');
    $cabecalhos = implode("\r\n", array_filter([
        $remetente !== '' ? 'From: ' . NOME_REMETENTE . " <{$remetente}>" : null,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ]));
    if (mail($destino, mb_encode_mimeheader($assunto, 'UTF-8'), $corpo, $cabecalhos)) {
        return ['ok' => true, 'via' => 'servidor', 'erro' => $erroSmtp !== '' ? "Gmail: {$erroSmtp}" : ''];
    }

    error_log('email: mail() do servidor também falhou.');
    return [
        'ok' => false,
        'via' => null,
        'erro' => trim(($erroSmtp !== '' ? "Gmail: {$erroSmtp}. " : '') . 'O envio pelo servidor também falhou.'),
    ];
}

/**
 * Responde ao navegador e fecha a conexão, para o script seguir trabalhando
 * (ex.: mandar o e-mail) sem a pessoa esperar.
 */
function responderEContinuar(int $status, array $corpo): void
{
    ignore_user_abort(true);
    http_response_code($status);
    $json = (string) json_encode($corpo, JSON_UNESCAPED_UNICODE);
    header('Content-Length: ' . strlen($json));
    header('Connection: close');
    echo $json;
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } elseif (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();
    }
}
