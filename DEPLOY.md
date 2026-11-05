# Publicação na Hostinger — Academia Scuzziato

Passo a passo para colocar o site no ar em `www.academiascuzziato.com.br` e o checklist de testes depois de publicar.

O site é estático (a pasta `dist/` gerada pelo build). O que roda no servidor, em PHP + MySQL:

- `api/agendamento.php`: agendamento da aula experimental (próximas aulas, vagas e reserva);
- `painel/`: painel da academia com os agendamentos (protegido por senha);
- `api/interesse.php`: formulário "Turmas em formação";
- `api/matricula.php` e `api/asaas-webhook.php`: matrícula online (cliente, assinatura e confirmação de pagamento pelo Asaas).

**Resumo:**

1. Gerar o `dist/` no computador.
2. Na Hostinger: PHP 8.2+ com a extensão **curl** ativa (além de pdo_mysql e mbstring), banco MySQL com as tabelas (`interesses.sql`, `agendamentos.sql` e `matriculas.sql`) e e-mail remetente.
3. `config.local.php` **fora** de `public_html`, com o bloco `asaas` preenchido.
4. Enviar o **conteúdo** de `dist/` para `public_html`.
5. SSL + forçar HTTPS.
6. Configurar o webhook no painel do Asaas.
7. Agendar o cron de matrículas abandonadas.
8. Rodar o checklist.

---

## 1. Gerar o build (no computador)

Precisa de Node 22 ou mais novo.

```bash
npm ci
npm run build
```

O build tem que terminar sem erros. A pasta `dist/` deve ter:

```
dist/
├─ .htaccess          ← arquivo oculto; não pode ficar para trás no envio
├─ index.html
├─ og-image.png
├─ robots.txt
├─ sitemap.xml
├─ api/
│  ├─ agendamento.php
│  ├─ interesse.php
│  ├─ matricula.php
│  ├─ asaas-webhook.php
│  ├─ turmas.json       ← gerado no build a partir de src/data (o PHP lê; bloqueado para o navegador)
│  ├─ matricula.json    ← idem, para a matrícula (planos, turmas e dias para considerar abandonada)
│  ├─ cron/             ← rotina de linha de comando (bloqueada para o navegador; roda só pelo cron da Hostinger)
│  └─ inc/              ← código comum do PHP (bloqueado para o navegador)
├─ painel/index.php   ← painel de agendamentos
├─ assets/            ← JS, CSS e fontes (nomes com hash)
└─ brand/             ← logo e favicon
```

Antes de publicar, confira em `src/data/config.ts` o que ainda está com `// TODO` (WhatsApp) e em `src/data/matricula.ts` o texto placeholder do termo de adesão — ele precisa ser trocado pelo texto aprovado antes de publicar de vez. Com o WhatsApp vazio, os botões abrem o WhatsApp sem destinatário.

## 2. Versão do PHP

hPanel → **Sites** → `academiascuzziato.com.br` → **Avançado → Configuração do PHP**.

- Escolha **PHP 8.2** (ou mais novo). O mínimo é 8.0.
- Na aba de extensões, confirme que **pdo_mysql**, **mbstring** e **curl** estão ativas (vêm ativas por padrão; o `curl` é usado para falar com a API do Asaas na matrícula online).

## 3. Banco de dados

1. hPanel → **Bancos de dados → Gerenciamento** (MySQL). Crie um banco e um usuário com senha forte. A Hostinger coloca um prefixo nos nomes (ex.: `u123456789_scuzziato`); anote o **nome do banco**, o **usuário** e a **senha** exatamente como aparecem.
2. Clique em **phpMyAdmin** ao lado do banco → aba **Importar** → envie `server/interesses.sql` → **Executar**. Repita com `server/agendamentos.sql` e `server/matriculas.sql`.
3. Confira se as tabelas `interesses`, `agendamentos`, `painel_tentativas`, `alunos`, `matriculas`, `cobrancas` e `asaas_eventos` apareceram na lista.

O `interesses.sql` também traz, comentadas no fim, consultas prontas para ver quantas pessoas querem cada turma e qual dia e período concentram mais interesse.

## 4. E-mail de aviso

O `agendamento.php` e o `interesse.php` avisam a academia por e-mail a cada aula experimental agendada e a cada novo interesse.

- **Remetente:** use um endereço do próprio domínio, como `site@academiascuzziato.com.br`, senão o aviso cai no spam. Crie a caixa em hPanel → **E-mails** (se o domínio ainda não tiver e-mail ativo, ative primeiro).
- **Destino:** o e-mail da academia que vai receber os avisos (`academiascuzziato@gmail.com`).

Se o destino ficar vazio, nenhum e-mail sai: os interesses só ficam gravados no banco.

## 4.1 Avisos pelo Gmail (SMTP)

Os avisos saem pelo Gmail da academia (`academiascuzziato@gmail.com`), entregues na mesma caixa.

1. Entre na conta Google da academia → **Segurança** → ligue a **Verificação em duas etapas** (se ainda não estiver).
2. Abra [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), crie uma senha de app com o nome "Site Academia" e copie as 16 letras.
3. No `config.local.php` (passo 5), preencha o bloco `smtp` com essa senha (pode colar com os espaços).
4. Depois de publicar, entre no painel (`/painel/`) e clique em **Testar e-mail**. A mensagem diz se saiu pelo Gmail ou o motivo da falha. Se aparecer erro de conexão na porta 465, troque para `'porta' => 587` e `'seguranca' => 'tls'`.

## 4.2 Matrícula online (Asaas)

A matrícula cria o cliente e a assinatura mensal na conta Asaas da academia.

1. Entre na conta Asaas da academia → **Integrações → Chaves de API**. Gere uma chave para o ambiente **Sandbox** (para testar, não cobra de verdade) e, quando for publicar de vez, uma chave de **Produção** (são diferentes; a chave do ambiente errado dá erro de autenticação).
2. No `config.local.php` (passo 5), preencha o bloco `asaas`: `ambiente` (`'sandbox'` para testar, `'producao'` para publicar), `chave_api` com a chave do passo 1, e `token_webhook` com uma sequência aleatória longa (gerar como o `ip_segredo`, abaixo).
3. O webhook (passo 8) só pode ser configurado depois que o site estiver publicado, porque precisa da URL pública de `api/asaas-webhook.php`.

## 5. `config.local.php` (fora da pasta pública)

As credenciais ficam num arquivo **fora de `public_html`**, para nunca poderem ser abertas pelo navegador. O `interesse.php` procura o arquivo um nível acima de `public_html`:

```
/home/u123456789/domains/academiascuzziato.com.br/
├─ config.local.php          ← AQUI
└─ public_html/
   ├─ index.html
   └─ api/interesse.php      ← lê ../../config.local.php
```

1. No computador, copie `server/config.local.example.php` para um arquivo chamado `config.local.php` e preencha:
   - `db`: host (`localhost`), nome do banco, usuário e senha do passo 3;
   - `email.destino` e `email.remetente` do passo 4;
   - `ip_segredo`: uma sequência aleatória longa. Para gerar:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `origens_permitidas`: deixe `[]`. O site com e sem `www` já é aceito. Para testar formulário e agendamento na homologação, acrescente `https://dev.academiascuzziato.com.br`;
   - `painel.senha`: a senha do painel de agendamentos, com pelo menos 12 caracteres. Para gerar uma:
     ```bash
     node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
     ```
   - `asaas`: ambiente, chave de API e token do webhook do passo 4.2. O `token_webhook` pode ser gerado do mesmo jeito que o `ip_segredo`.
2. hPanel → **Arquivos → Gerenciador de arquivos**. Suba um nível a partir de `public_html` (para `domains/academiascuzziato.com.br/`) e envie o `config.local.php` ali.
3. Clique com o botão direito no arquivo → **Permissões** → `600`.

Nunca coloque o `config.local.php` no Git (já está no `.gitignore`) nem dentro de `public_html`.

## 6. Enviar o site

1. No computador, compacte o **conteúdo** de `dist/` (selecione tudo dentro da pasta, inclusive o `.htaccess`, e gere um `.zip`). Não compacte a pasta `dist` em si, senão o site fica em `www.academiascuzziato.com.br/dist/`.
2. Gerenciador de arquivos → `public_html`:
   - Apague os arquivos de exemplo da Hostinger (`default.php`, `index.php` ou similares). Um `index.php` em `public_html` tem prioridade sobre o `index.html` e esconde o site.
   - Envie o `.zip` e use **Extrair** dentro de `public_html`. Depois apague o `.zip`.
3. Ative **Mostrar arquivos ocultos** no gerenciador e confira se o `.htaccess` está em `public_html`.

## 7. SSL e endereço

1. hPanel → **Segurança → SSL**: instale o SSL gratuito para `academiascuzziato.com.br` (e `www`), se ainda não estiver ativo.
2. Ative **Forçar HTTPS** no hPanel. O `.htaccess` do site **não** força HTTPS por conta própria (para não dar loop de redirecionamento com a CDN da Hostinger); ele só redireciona `academiascuzziato.com.br` (sem www) para `www.academiascuzziato.com.br`.
3. Se a **CDN** da Hostinger estiver ativa, limpe o cache dela depois de cada publicação.

## 8. Configurar o webhook do Asaas

Com o site publicado (precisa da URL pública):

1. Conta Asaas (mesmo ambiente — sandbox ou produção — da chave usada no `config.local.php`) → **Integrações → Webhooks → Nova configuração de webhook**.
2. **URL:** `https://www.academiascuzziato.com.br/api/asaas-webhook.php`.
3. **Token de acesso:** o mesmo valor de `asaas.token_webhook` no `config.local.php` (o Asaas manda esse token de volta em todo envio; é como o nosso webhook confirma que é o Asaas chamando).
4. **Eventos:** marque pelo menos "Cobrança criada", "Cobrança confirmada", "Cobrança recebida", "Cobrança vencida" e "Assinatura removida" (ou todos — eventos que não usamos são registrados e ignorados).
5. Deixe a fila **ativa** (enabled). Depois do primeiro pagamento de teste (checklist abaixo), confira em **Integrações → Webhooks → Histórico de envios** se a entrega deu 200.

## 9. Cron: cancelar matrículas abandonadas

Quem começa a matrícula e nunca paga a primeira fatura fica como `aguardando_pagamento` para sempre, com uma assinatura ativa no Asaas sem ninguém pagando. Uma rotina diária cancela essas matrículas (e a assinatura no Asaas) depois de `matricula.diasAbandono` dias (padrão 7, em `src/data/matricula.ts`).

1. hPanel → **Avançado → Cron Jobs**.
2. **Comando:** o caminho completo do PHP da Hostinger até o script, por exemplo:
   ```
   /usr/bin/php8.2 /home/u123456789/domains/academiascuzziato.com.br/public_html/api/cron/cancelar-matriculas-abandonadas.php
   ```
   (confirme o caminho do PHP em **Avançado → Configuração do PHP**, ou use `php` se a Hostinger já resolver a versão certa).
3. **Frequência:** uma vez por dia (ex.: todos os dias às 4h da manhã).
4. O script só roda por linha de comando — pela web, `api/cron/cancelar-matriculas-abandonadas.php` responde 404, igual aos outros arquivos de servidor.
5. A saída do cron (quantas matrículas foram canceladas) normalmente chega por e-mail do próprio hPanel, se configurado; senão fica só no log de execução do cron.

---

## Checklist depois de publicar

Faça no celular (a maior parte do público vem dele) e no computador.

**Endereço e carregamento**

- [ ] `http://academiascuzziato.com.br` vai para `https://www.academiascuzziato.com.br`.
- [ ] `https://academiascuzziato.com.br` vai para `https://www.academiascuzziato.com.br`.
- [ ] O site abre com o logo no topo e o favicon na aba.
- [ ] No celular, nada fica cortado e a página não rola para os lados.

**Botões**

- [ ] Todo "Agendar" abre a janela de agendamento; o "Agendar" da grade já abre no dia da turma escolhida.
- [ ] O botão flutuante do WhatsApp abre a conversa com o número da academia (depois que o número for preenchido em `config.ts`).
- [ ] "Fale com a gente" das turmas provisórias abre o WhatsApp com "Olá! Quero saber os horários de …".
- [ ] "Quero me matricular" abre a ficha de matrícula, já no plano escolhido.
- [ ] "Como chegar" abre a rota no Google Maps, e o mapa aparece na seção de contato.

**Agendamento da aula experimental**

- [ ] Abra `https://www.academiascuzziato.com.br/api/agendamento.php` no navegador. Deve aparecer `{"ok":true,"aulas":[...]}` com as próximas aulas. Se aparecer erro, veja "Se algo der errado".
- [ ] `https://www.academiascuzziato.com.br/#agendar` abre o site já no agendamento (é o link para a bio do Instagram).
- [ ] Faça um agendamento de teste com dados reais:
  - aparece "Aula marcada" com dia, horário e endereço;
  - "Salvar na agenda" baixa o evento e o celular oferece salvar;
  - o e-mail de aviso chega no destino (olhe também o spam);
  - tente agendar de novo com o mesmo WhatsApp e nome: o site avisa que já tem aula marcada.
- [ ] Entre em `https://www.academiascuzziato.com.br/painel/` com a senha: o agendamento de teste aparece na aula certa. Marque **Cancelado** e confira que a vaga volta no site.
- [ ] Apague o agendamento de teste no phpMyAdmin (tabela `agendamentos`).

**Matrícula online (teste no ambiente sandbox do Asaas)**

- [ ] Abra `https://www.academiascuzziato.com.br/api/matricula.php` no navegador. Deve aparecer `{"ok":false,"erro":"Método não permitido."}`. Se aparecer o código PHP ou o arquivo baixar, o PHP não está rodando ou falta a extensão curl.
- [ ] `https://www.academiascuzziato.com.br/#matricula` abre o site já na ficha de matrícula.
- [ ] Matrícula de um adulto: escolha o plano, preencha os dados (com um CPF de teste válido — gere um em [4devs](https://www.4devs.com.br/gerador_de_cpf) ou na documentação do Asaas), aceite o termo e o consentimento:
  - a tela final mostra o link da fatura, e ele abre no checkout do Asaas (sandbox);
  - a linha aparece em `alunos` e `matriculas` (status `aguardando_pagamento`) no phpMyAdmin, sem nenhuma coluna de CPF;
  - o e-mail "Nova matrícula aguardando pagamento" chega no destino.
- [ ] Matrícula de um menor de idade: escolha "Meu filho ou filha" e preencha o CPF/e-mail/WhatsApp do **responsável**. Confira que `alunos.responsavel_nome` foi gravado e que o cliente criado no Asaas é o do responsável.
- [ ] Pague a fatura de teste no sandbox do Asaas (o próprio Asaas simula os meios de pagamento). Confira que o webhook chegou (Integrações → Webhooks → Histórico de envios, status 200) e que a matrícula virou `ativa` no phpMyAdmin, com `ativada_em` preenchido e o e-mail "Matrícula confirmada" recebido.
- [ ] Reenvie manualmente o mesmo evento pelo histórico de webhooks do Asaas: a matrícula continua `ativa` (sem duplicar e-mail nem erro) — confirma que `asaas_eventos` está bloqueando o reprocessamento.
- [ ] Tente se matricular de novo com o mesmo nome e WhatsApp de uma matrícula `aguardando_pagamento`: recebe a mesma fatura, sem criar outra assinatura no Asaas. Com a matrícula já `ativa`, recebe o aviso para falar no WhatsApp.
- [ ] No Asaas, marque uma cobrança de teste como vencida (ou aguarde o vencimento de um boleto de teste): a matrícula correspondente vira `inadimplente` no phpMyAdmin.
- [ ] Pague no sandbox uma fatura **depois do vencimento** (a primeira vence no dia da matrícula; um boleto pago no dia seguinte costuma compensar depois de vencido): confirme que a matrícula vira `ativa` mesmo assim (cobrança criada com atraso ou confirmada fora de ordem).
- [ ] Abandone uma matrícula de teste (não pague a fatura) e rode à mão `php api/cron/cancelar-matriculas-abandonadas.php` (ou espere o cron, se `diasAbandono` já tiver passado): confira que a matrícula virou `cancelada` no phpMyAdmin e que a assinatura foi removida no painel do Asaas.
- [ ] Simule o webhook perdido: pague uma fatura de teste no sandbox, mas **antes** disso desative a fila do webhook no Asaas (ou troque o `token_webhook` por um errado) para a confirmação não chegar. Espere `diasAbandono` dias (ou reduza temporariamente o valor para testar) e rode à mão o cron: confira que a matrícula virou `ativa` (não `cancelada`), que a cobrança foi gravada e que o e-mail "Matrícula confirmada" chegou. Desfaça a mudança no webhook depois do teste.
- [ ] Apague os dados de teste no phpMyAdmin (`cobrancas`, `matriculas`, `alunos`, nessa ordem) e cancele a assinatura de teste no painel do Asaas.

**Formulário "Turmas em formação"**

- [ ] Abra `https://www.academiascuzziato.com.br/api/interesse.php` no navegador. Deve aparecer `{"ok":false,"erro":"Método não permitido."}`. Se aparecer o código PHP ou o arquivo baixar, o PHP não está rodando: volte ao passo 2.
- [ ] "Quero ser avisado" em Muay thai abre o formulário já com Muay thai marcado.
- [ ] Enviar vazio mostra os erros em cada campo.
- [ ] Envie um interesse de teste com dados reais:
  - aparece "Pronto, …!" e o botão "Avise um amigo";
  - a linha aparece na tabela `interesses` no phpMyAdmin;
  - o e-mail chega no destino (olhe também o spam).
- [ ] Apague a linha de teste no phpMyAdmin.

**Segurança**

- [ ] `https://www.academiascuzziato.com.br/config.local.php` dá erro 404 (o arquivo não está na pasta pública).
- [ ] `https://www.academiascuzziato.com.br/.htaccess` e `https://www.academiascuzziato.com.br/api/error_log` dão erro 403 ou 404.
- [ ] `https://www.academiascuzziato.com.br/api/turmas.json`, `https://www.academiascuzziato.com.br/api/matricula.json` e `https://www.academiascuzziato.com.br/api/inc/comum.php` dão erro 403 ou 404.
- [ ] `https://www.academiascuzziato.com.br/api/asaas-webhook.php` sem o cabeçalho `asaas-access-token` (ou com um token errado) dá erro 401.
- [ ] O painel pede senha e, depois de 5 senhas erradas seguidas, bloqueia por 15 minutos.

**Conteúdo**

- [ ] As turmas provisórias aparecem com "Horário a confirmar", sem horário.
- [ ] No FAQ, as perguntas ainda não confirmadas mostram "Estamos confirmando esse detalhe" (nenhum texto com "Rascunho").

**SEO e compartilhamento**

- [ ] `https://www.academiascuzziato.com.br/robots.txt` e `https://www.academiascuzziato.com.br/sitemap.xml` abrem.
- [ ] Mande o link do site numa conversa do WhatsApp: deve aparecer o cartão com o logo e "Primeira semana grátis". Se o WhatsApp mostrar uma prévia antiga, force a atualização no [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (clique em "Extrair novamente").
- [ ] [Teste de pesquisa aprimorada do Google](https://search.google.com/test/rich-results): o `SportsActivityLocation` aparece sem erros.
- [ ] [Google Search Console](https://search.google.com/search-console): adicione a propriedade do domínio e envie `https://www.academiascuzziato.com.br/sitemap.xml`.
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) no modo celular (referência local antes da publicação: desempenho 94, acessibilidade, boas práticas e SEO 100).

---

## Atualizar o site depois

Turmas, horários, planos, FAQ e contatos ficam em `src/data/`. Depois de editar:

1. `npm run build`.
2. Envie de novo o conteúdo de `dist/` para `public_html` (pode substituir tudo). O `config.local.php` fica fora de `public_html` e não é afetado.
3. Limpe o cache da CDN, se estiver ativa.

Os arquivos antigos de `assets/` podem ser apagados com segurança depois de enviar os novos; o `index.html` novo só aponta para os novos.

## Se algo der errado

| Sintoma | O que verificar |
|---|---|
| Formulário mostra "Não conseguimos registrar agora" | `config.local.php` no lugar certo (passo 5) e dados do banco corretos. O motivo fica no log de erros do PHP: normalmente `public_html/api/error_log` (bloqueado para o navegador; abra pelo Gerenciador de arquivos) ou em hPanel → Avançado → logs. |
| Agendamento mostra "Não conseguimos agendar agora" ou não carrega os horários | Mesmo caminho do formulário: `config.local.php` e banco. Confira também se as tabelas de `server/agendamentos.sql` foram criadas e se `api/turmas.json` foi publicado (vem do build). |
| Painel diz "Defina a senha do painel" | Falta `painel.senha` (12 caracteres ou mais) no `config.local.php`. |
| Turma não aparece no agendamento | Só aparecem turmas com `aulaExperimental: true` e `provisorio: false` em `src/data/turmas.ts`. Depois de mudar, publique de novo (o `turmas.json` é gerado no build). |
| Formulário mostra "Origem não permitida" | O site está sendo aberto por um endereço diferente de `www.academiascuzziato.com.br` ou `academiascuzziato.com.br`. Acrescente-o em `origens_permitidas`. |
| Interesse grava, mas o e-mail não chega | `email.destino` preenchido? Remetente do próprio domínio e caixa criada? Olhe o spam. |
| "Recebemos vários envios seguidos daqui" | É o limite de 5 envios por IP por hora (configurável em `limite` no `config.local.php`). |
| Aparece a página padrão da Hostinger | Ficou um `index.php`/`default.php` em `public_html` (passo 6). |
| Site em `www.academiascuzziato.com.br/dist/` | Foi enviada a pasta `dist`, não o conteúdo dela (passo 6). |
| Loop de redirecionamento | Algum redirecionamento HTTPS extra no `.htaccess` além do "Forçar HTTPS" do hPanel. |
| Matrícula mostra "Não conseguimos matricular agora" | Além de `config.local.php` e banco, confira o bloco `asaas` (ambiente e chave de API certos para esse ambiente) e se a extensão **curl** do PHP está ativa. O motivo exato fica no `error_log` (mesmo lugar da primeira linha desta tabela). |
| Matrícula não recebe o link da fatura | A chave de API é de um ambiente (sandbox/produção) e `asaas.ambiente` está configurado para o outro. |
| Pagamento aprovado mas a matrícula não vira `ativa` | Confira no Asaas (Integrações → Webhooks → Histórico de envios) se a entrega deu 200. Se der 401, o `token_webhook` do `config.local.php` está diferente do cadastrado no webhook; se der 404/500, confira se `api/asaas-webhook.php` foi publicado e se o banco está acessível. |
| Vários envios do webhook deram erro e nenhum chega mais | Depois de 15 falhas seguidas numa configuração de webhook, o Asaas **interrompe a fila** (as outras configurações continuam normais). Corrija a causa (ver linha acima) e reative em Integrações → Webhooks → a fila interrompida tem um botão para reativar. Eventos parados na fila por mais de 14 dias são apagados pelo Asaas — não demore para resolver. |
| Matrícula não é cancelada depois de abandonada | Confira se o cron job foi criado (passo 9) e se o caminho do PHP no comando está certo. Rode o comando à mão por SSH ou pelo terminal do hPanel para ver o erro na tela. |
