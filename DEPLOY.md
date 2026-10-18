# Publicação na Hostinger — Academia Scuzziato

Passo a passo para colocar o site no ar em `www.academiascuzziato.com.br` e o checklist de testes depois de publicar.

O site é estático (a pasta `dist/` gerada pelo build). A única parte que roda no servidor é o formulário "Turmas em formação": `api/interesse.php`, que grava no MySQL e manda e-mail.

**Resumo:**

1. Gerar o `dist/` no computador.
2. Na Hostinger: PHP 8.2+, banco MySQL com a tabela `interesses` e e-mail remetente.
3. `config.local.php` **fora** de `public_html`.
4. Enviar o **conteúdo** de `dist/` para `public_html`.
5. SSL + forçar HTTPS.
6. Rodar o checklist.

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
├─ api/interesse.php
├─ assets/            ← JS, CSS e fontes (nomes com hash)
└─ brand/             ← logo e favicon
```

Antes de publicar, confira em `src/data/config.ts` o que ainda está com `// TODO` (WhatsApp, agenda, links de matrícula). Com o WhatsApp vazio, os botões abrem o WhatsApp sem destinatário.

## 2. Versão do PHP

hPanel → **Sites** → `academiascuzziato.com.br` → **Avançado → Configuração do PHP**.

- Escolha **PHP 8.2** (ou mais novo). O mínimo é 8.0.
- Na aba de extensões, confirme que **pdo_mysql** e **mbstring** estão ativas (vêm ativas por padrão).

## 3. Banco de dados

1. hPanel → **Bancos de dados → Gerenciamento** (MySQL). Crie um banco e um usuário com senha forte. A Hostinger coloca um prefixo nos nomes (ex.: `u123456789_scuzziato`); anote o **nome do banco**, o **usuário** e a **senha** exatamente como aparecem.
2. Clique em **phpMyAdmin** ao lado do banco → aba **Importar** → envie `server/interesses.sql` → **Executar**.
3. Confira se a tabela `interesses` apareceu na lista.

O `interesses.sql` também traz, comentadas no fim, consultas prontas para ver quantas pessoas querem cada turma e qual dia e período concentram mais interesse.

## 4. E-mail de aviso

O `interesse.php` avisa a academia por e-mail a cada novo interesse.

- **Remetente:** use um endereço do próprio domínio, como `site@academiascuzziato.com.br`, senão o aviso cai no spam. Crie a caixa em hPanel → **E-mails** (se o domínio ainda não tiver e-mail ativo, ative primeiro).
- **Destino:** o e-mail da academia que vai receber os avisos (`academiascuzziato@gmail.com`).

Se o destino ficar vazio, nenhum e-mail sai: os interesses só ficam gravados no banco.

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
   - `origens_permitidas`: deixe `[]`. O site com e sem `www` já é aceito.
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

---

## Checklist depois de publicar

Faça no celular (a maior parte do público vem dele) e no computador.

**Endereço e carregamento**

- [ ] `http://academiascuzziato.com.br` vai para `https://www.academiascuzziato.com.br`.
- [ ] `https://academiascuzziato.com.br` vai para `https://www.academiascuzziato.com.br`.
- [ ] O site abre com o logo no topo e o favicon na aba.
- [ ] No celular, nada fica cortado e a página não rola para os lados.

**Botões**

- [ ] Todo "Agendar" abre a agenda (`agenda.academiascuzziato.com.br` precisa estar no ar).
- [ ] O botão flutuante do WhatsApp abre a conversa com o número da academia (depois que o número for preenchido em `config.ts`).
- [ ] "Fale com a gente" das turmas provisórias abre o WhatsApp com "Olá! Quero saber os horários de …".
- [ ] "Quero me matricular" abre o WhatsApp com a mensagem do plano (ou o gateway, quando houver link).
- [ ] "Como chegar" abre a rota no Google Maps, e o mapa aparece na seção de contato.

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
| Formulário mostra "Origem não permitida" | O site está sendo aberto por um endereço diferente de `www.academiascuzziato.com.br` ou `academiascuzziato.com.br`. Acrescente-o em `origens_permitidas`. |
| Interesse grava, mas o e-mail não chega | `email.destino` preenchido? Remetente do próprio domínio e caixa criada? Olhe o spam. |
| "Recebemos vários envios seguidos daqui" | É o limite de 5 envios por IP por hora (configurável em `limite` no `config.local.php`). |
| Aparece a página padrão da Hostinger | Ficou um `index.php`/`default.php` em `public_html` (passo 6). |
| Site em `www.academiascuzziato.com.br/dist/` | Foi enviada a pasta `dist`, não o conteúdo dela (passo 6). |
| Loop de redirecionamento | Algum redirecionamento HTTPS extra no `.htaccess` além do "Forçar HTTPS" do hPanel. |
