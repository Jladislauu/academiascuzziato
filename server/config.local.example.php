<?php

/*
 * Modelo do config.local.php usado por public/api/interesse.php.
 *
 * No servidor (Hostinger):
 *   1. Copie este arquivo como config.local.php e preencha os valores.
 *   2. Coloque o config.local.php UM NÍVEL ACIMA de public_html, fora da pasta pública:
 *
 *        .../domains/arenapinhais.com.br/config.local.php          ← aqui
 *        .../domains/arenapinhais.com.br/public_html/api/interesse.php
 *
 *      O interesse.php lê de __DIR__ . '/../../config.local.php'.
 *   3. Crie a tabela rodando server/interesses.sql no phpMyAdmin.
 *
 * Nunca coloque o config.local.php no Git (já está no .gitignore).
 */

return [
    // hPanel → Bancos de dados → MySQL
    'db' => [
        'host' => 'localhost',
        'nome' => 'u000000000_arena',
        'usuario' => 'u000000000_arena',
        'senha' => 'TROQUE-PELA-SENHA-DO-BANCO',
    ],

    'email' => [
        // Quem recebe o aviso de novo interesse. Vazio = não envia e-mail (só grava no banco).
        'destino' => '',
        // Remetente: use um e-mail do próprio domínio, senão o aviso cai no spam.
        'remetente' => 'site@arenapinhais.com.br',
    ],

    // https://arenapinhais.com.br e https://www.arenapinhais.com.br já são aceitos
    // pelo interesse.php. Aqui só entram endereços extras (ex.: um domínio de testes).
    'origens_permitidas' => [],

    // Segredo para o hash do IP (limite de envios). Uma sequência aleatória longa, gerada com
    //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    // ou, onde houver PHP: php -r "echo bin2hex(random_bytes(32));"
    'ip_segredo' => 'TROQUE-POR-UMA-SEQUENCIA-ALEATORIA-LONGA',

    // No máximo `envios` por IP a cada `janela_minutos`.
    'limite' => [
        'envios' => 5,
        'janela_minutos' => 60,
    ],
];
