<?php

/*
 * Modelo do config.local.php usado por public/api/interesse.php (turmas em formação),
 * public/api/agendamento.php (aula experimental) e public/painel/ (agendamentos da academia).
 *
 * No servidor (Hostinger):
 *   1. Copie este arquivo como config.local.php e preencha os valores.
 *   2. Coloque o config.local.php UM NÍVEL ACIMA de public_html, fora da pasta pública:
 *
 *        .../domains/academiascuzziato.com.br/config.local.php         ← aqui
 *        .../domains/academiascuzziato.com.br/public_html/api/interesse.php
 *
 *      O interesse.php lê de __DIR__ . '/../../config.local.php'.
 *   3. Crie as tabelas rodando server/interesses.sql e server/agendamentos.sql no phpMyAdmin.
 *
 * Nunca coloque o config.local.php no Git (já está no .gitignore).
 */

return [
    // hPanel → Bancos de dados → MySQL
    'db' => [
        'host' => 'localhost',
        'nome' => 'u000000000_scuzziato',
        'usuario' => 'u000000000_scuzziato',
        'senha' => 'TROQUE-PELA-SENHA-DO-BANCO',
    ],

    'email' => [
        // Quem recebe os avisos (agendamento e interesse). Vazio = não envia e-mail (só grava no banco).
        'destino' => 'academiascuzziato@gmail.com',
        // Remetente do envio reserva (mail() do servidor), usado só se o Gmail falhar.
        'remetente' => 'site@academiascuzziato.com.br',
    ],

    // Envio dos avisos pelo Gmail da academia (SMTP). Precisa da verificação em duas
    // etapas ligada na conta e de uma "senha de app" (myaccount.google.com/apppasswords):
    // 16 letras, pode colar com os espaços. A senha normal da conta NÃO funciona.
    // Para testar: painel → "Testar e-mail".
    'smtp' => [
        'host' => 'smtp.gmail.com',
        'porta' => 465,
        'seguranca' => 'ssl', // 465 = 'ssl'; se a porta 465 for bloqueada, use 587 com 'tls'
        'usuario' => 'academiascuzziato@gmail.com',
        'senha' => 'SENHA-DE-APP-DO-GMAIL',
    ],

    // https://www.academiascuzziato.com.br e https://academiascuzziato.com.br já são aceitos
    // pelo interesse.php. Aqui só entram endereços extras (ex.: um domínio de testes).
    'origens_permitidas' => [],

    // Segredo para o hash do IP (limite de envios). Uma sequência aleatória longa, gerada com
    //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    // ou, onde houver PHP: php -r "echo bin2hex(random_bytes(32));"
    'ip_segredo' => 'TROQUE-POR-UMA-SEQUENCIA-ALEATORIA-LONGA',

    // No máximo `envios` por IP a cada `janela_minutos` (vale para cada formulário).
    'limite' => [
        'envios' => 5,
        'janela_minutos' => 60,
    ],

    // Painel de agendamentos (www.academiascuzziato.com.br/painel/).
    'painel' => [
        // Senha de quem acessa o painel, com pelo menos 12 caracteres. Com menos, o painel não abre.
        // Para gerar uma: node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
        'senha' => 'TROQUE-POR-UMA-SENHA-LONGA',
    ],
];
