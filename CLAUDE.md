# Academia Scuzziato — site

Site da **Academia Scuzziato**, centro esportivo em Pinhais-PR que começa pelas artes marciais (jiu-jitsu e judô hoje; muay thai e boxe em formação) e vai se expandir para outros esportes. Foco em formar atletas e campeões, mas aberto a quem só quer praticar, inclusive iniciantes e crianças.

Projeto da Thryve (João Lucas). Documentação completa no Notion: página "Arena Pinhais — Site".

## Objetivo do site

Gerar **agendamentos de aula experimental** e tirar do WhatsApp o trabalho manual de tirar dúvidas, agendar e matricular.

**Mensagem central: a primeira semana de treino é grátis.** Aparece no topo, se repete nos botões e tem uma seção própria explicando como funciona. Todo botão principal leva para "Agendar aula experimental".

## Stack

- Vite + React + TypeScript + Tailwind CSS + Framer Motion
- Site estático (`npm run build` gera `dist/`), hospedado na Hostinger em `www.academiascuzziato.com.br`
- PHP + MySQL na própria Hostinger só para o que precisa de servidor: agendamento da aula experimental (`public/api/agendamento.php` + painel em `public/painel/`) e formulário de turmas em formação (`public/api/interesse.php`)
- Repositório privado no GitHub, com publicação automática na Hostinger (ver "Fluxo de trabalho")
- Página única com seções e navegação por âncoras. Sem roteador por enquanto.
- Mobile-first: a maior parte do público vem do Instagram e do WhatsApp, no celular.

## Identidade visual

- **Cores** (definir como tokens no Tailwind, nunca hex solto nos componentes):
  - `preto` #0E0F12 (fundo principal; o site é escuro)
  - `branco` #FFFFFF
  - `vermelho` #E10600 (destaque, botões principais)
  - cinza da marca #ABABAB (contorno do hexágono no logo)
  - cinzas derivados do preto para cards e bordas
- **Tipografia:**
  - Títulos: Barlow Condensed 800/900, caixa alta (`@fontsource/barlow-condensed`)
  - Texto: Barlow 400/500/600 (`@fontsource/barlow`)
- **Logo oficial (recebido em 22/10/2026):** ícone do "S" dentro de hexágono (branco, com contorno cinza) ao lado de "ACADEMIA / SCUZZIATO", em branco. **Sem o subtítulo "JIU-JITSU"** da arte original: a academia tem várias modalidades (versão gerada com `marca/sem-subtitulo.py`). Arquivos (componente `src/components/ui/Logo.tsx`):
  - `src/assets/marca/academia-scuzziato-escuro-transparente.svg` (uso padrão sobre fundo escuro)
  - `src/assets/marca/academia-scuzziato-claro-transparente.svg` (sobre fundo claro: preto e cinza #5C6270)
  - Ficam em `src/assets` para o build gerar um nome com hash: trocou o logo, o nome muda e nenhum cache segura o antigo.
  - Em `public/brand/`: `academia-scuzziato-favicon.svg`/`.png` (só o ícone, sobre quadrado preto arredondado para aparecer em aba clara e escura), `academia-scuzziato-apple-touch-icon.png` e `academia-scuzziato-avatar.png`
  - `public/og-image.png`: logo + "Primeira semana grátis" (1200×630). Ao trocar, aumente o `?v=` em `src/data/seo.ts`.
  - Os arquivos de `public/brand/` têm nome fixo: ao trocá-los, aumente o `?v=` nos links do `index.html` e do `site.webmanifest`.
  - Os SVGs foram vetorizados das imagens em `marca/` com `marca/vetorizar.py`. Chegando arquivo em melhor resolução ou vetor original, é só trocar.
  - Nunca recriar o logo com texto HTML; sempre usar os SVGs.
- **Tom visual:** moderno e esportivo, como clubes e ligas esportivas. Não como academia de luta tradicional. Competitivo sem ser agressivo.
- **Proibido:** qualquer referência à marca ou ao emblema "Arena Jiu-Jitsu", e a cor laranja #F26521. A Academia Scuzziato é independente.

## Dados da academia

- Equipes por modalidade: "Scuzziato Team" + modalidade (Scuzziato Team Jiu-Jitsu, Scuzziato Team Judô, Scuzziato Team Muay Thai, Scuzziato Team Boxe)
- Endereço: R. Vicente D'Andréa, 617 — Estância Pinhais, Pinhais-PR, 83323-190
- Funcionamento: segunda a sexta, 8h às 23h
- Site: https://www.academiascuzziato.com.br
- Instagram: @academiascuzziato (https://www.instagram.com/academiascuzziato)
- E-mail: academiascuzziato@gmail.com
- WhatsApp: **ainda não recebido** → placeholder em `src/data/config.ts`
- Professores: Rhaue Scuzziato e Camilo Scuzziato

## Regra mais importante: conteúdo fica em arquivos de dados

Todo conteúdo que muda (turmas, horários, planos, links, contatos) vive em `src/data/`, nunca escrito dentro dos componentes. O João atualiza a grade e os links editando só esses arquivos.

- `src/data/config.ts` — URLs e contatos:
  - `agendamentoEndpoint` (`/api/agendamento.php`)
  - `whatsapp` (placeholder marcado com `// TODO`), `instagram`, `email`
  - `matriculaLinks` por plano (links do gateway de pagamento, ainda não existem)
- `src/data/turmas.ts` — grade (também define o que aparece no agendamento)
- `src/data/agenda.ts` — regras do agendamento: dias para a frente, antecedência, duração da semana grátis, dias sem aula
- `src/data/planos.ts` — planos e preços
- `src/data/faq.ts` — perguntas frequentes

Nunca invente informação (horário, preço, nome, telefone). Se faltar, use placeholder com `// TODO` e me avise.

### Turmas (estado em 12/10/2026)

Cada turma tem: `id`, `modalidade`, `nome`, `publico` (Infantil / Juvenil/Adulto), `nivel`, `professor`, `dias`, `inicio`, `fim`, `aulaExperimental` (boolean), `provisorio` (boolean). Só turmas com `aulaExperimental: true` e `provisorio: false` aparecem no agendamento.

| Turma | Público | Nível | Professor | Dias | Horário | Provisório |
|---|---|---|---|---|---|---|
| Jiu-jitsu com kimono (GI) | Juvenil/Adulto | Iniciante/Intermediário | Camilo Scuzziato | ter, qua, qui | 21h–22h | não |
| Jiu-jitsu sem kimono (No-Gi) | Juvenil/Adulto | Avançado | Rhaue Scuzziato | seg, qua, qui | 11h–12h | não |
| Judô adulto | Adulto | — | a definir | seg, qua | 20h–21h | **sim** |
| Jiu-jitsu infantil | Infantil | — | a definir | ter, qui | 18h–19h | **sim** |
| Judô infantil | Infantil | — | a definir | seg, qua | 19h–20h | **sim** |

- Turma com `provisorio: true` aparece no site **sem horário**, com o texto "Horário a confirmar — fale com a gente". Nunca publicar horário provisório como se fosse real.
- A GI do Camilo é a turma **recomendada para iniciantes** (selo "Ideal para começar").
- O No-Gi é aberto à aula experimental, mas sempre identificado como "Avançado — para quem já treina".

**Em formação** (sem turma ainda): muay thai e boxe, adulto e infantil.

### Planos

- **Uma modalidade** — R$ 120/mês
- **Livre** — R$ 160/mês, todas as modalidades. Destacar como o plano recomendado ("Por R$ 40 a mais, treine tudo").

### Aula experimental

- Primeira semana grátis, antes de se matricular.
- **A pessoa agenda só a primeira aula.** Depois dela, vem nas outras aulas da semana sem agendar de novo (a semana conta 7 dias a partir da aula agendada).
- Até 5 vagas por aula experimental (só quem vem pela primeira vez conta). A pessoa pode trazer amigos; cada amigo agenda a própria vaga.

## Seções da página

1. **Topo** — logo, chamada "Primeira semana grátis", botão "Agendar aula experimental", botão secundário "Ver horários". Todo botão "Agendar" do site abre a janela de agendamento (ver abaixo).
2. **Como funciona a semana grátis** — 3 passos: agenda → treina a semana → decide se matricula.
3. **Modalidades** — card por modalidade (jiu-jitsu, judô e, como "em formação", muay thai e boxe), com público e níveis.
4. **Grade de horários** — filtro por modalidade e por público (infantil / juvenil-adulto). Cada turma com `aulaExperimental` tem botão "Agendar" que abre o agendamento já na turma.
5. **Turmas em formação** — formulário de interesse (ver abaixo).
6. **Professores** — Rhaue e Camilo, com foto, bio e destaques (`src/data/professores.ts`).
7. **Planos** — os dois planos, botão "Quero me matricular" (por enquanto leva ao WhatsApp com mensagem pronta; depois vai para o link do gateway em `matriculaLinks`).
8. **Estrutura** — galeria de fotos (placeholders até recebermos as fotos).
9. **Perguntas frequentes** — precisa de kimono na aula experimental? qual a idade mínima? nunca treinei, posso ir? posso trazer amigos? o que levar? como funciona a semana grátis?
10. **Localização e contato** — mapa (embed do Google Maps pelo endereço), endereço, horário de funcionamento, WhatsApp, Instagram.
11. **Rodapé** — logo, contatos, aviso de privacidade, crédito "Site por Thryve".

Botão flutuante de WhatsApp em todas as telas.

## Agendamento da aula experimental

Feito no próprio site (substituiu o Easy!Appointments). Código em `src/components/agendamento/Agendamento.tsx`, `src/lib/agenda.ts` e `src/lib/aulas.ts`.

- **Abrir:** qualquer link para `#agendar` ou `#agendar/<id-da-turma>` abre a janela (`agendaLink()` em `src/lib/links.ts`). Serve também como link para compartilhar: `www.academiascuzziato.com.br/#agendar`. No celular, o "voltar" fecha a janela.
- **Passos:** turma → dia (próximas aulas com vagas) → dados (quem vai treinar, nome, WhatsApp, experiência, consentimento LGPD) → confirmação com "Salvar na agenda" (.ics), "Como chegar" e "Convidar um amigo".
- **Menores de 18:** agenda o responsável (nome do responsável + nome e idade de quem vai treinar). Turma infantil é sempre assim; na juvenil/adulto a pessoa escolhe "Eu" ou "Meu filho ou filha".
- **Servidor:** `public/api/agendamento.php` (GET = próximas aulas e vagas; POST = reserva). Confere tudo de novo: dia válido, vagas (com trava contra duas reservas simultâneas na última vaga), e se a pessoa já tem aula marcada (mesmo WhatsApp + mesmo nome de aluno). Honeypot, limite por IP e e-mail de aviso, como no formulário de interesse. Tabelas em `server/agendamentos.sql`.
- **Turmas no servidor:** o build gera `dist/api/turmas.json` a partir de `src/data` (`plugins/agenda.ts`). O PHP lê esse arquivo; nunca editar no servidor.
- **Mesma regra em dois lugares:** as datas das próximas aulas são calculadas em `src/lib/aulas.ts` e em `public/api/inc/comum.php`; a validação em `src/lib/agenda.ts` e em `public/api/agendamento.php`. Mudou um, mude o outro.
- **Painel da academia:** `www.academiascuzziato.com.br/painel/` (senha em `config.local.php`). Lista os agendamentos da semana por aula, com link de WhatsApp com mensagem de confirmação pronta, e botões Agendado / Compareceu / Faltou / Cancelado. Cancelar libera a vaga no site.
- **`npm run dev`:** não roda PHP; o agendamento é simulado (vagas fictícias, envio sempre dá certo).

## Formulário "Turmas em formação"

Objetivo: descobrir quando e em que horário abrir muay thai e boxe.

- Campos: nome, WhatsApp, modalidade (muay thai / boxe), público (adulto / infantil + idade da criança), dias preferidos (seg–sex), período preferido (manhã / tarde / noite), consentimento LGPD (checkbox obrigatório).
- Envio: endpoint PHP na própria Hostinger, `public/api/interesse.php`, que valida, grava numa tabela MySQL `interesses` e envia e-mail de aviso para a academia. Credenciais em arquivo fora do repositório (`config.local.php`, no `.gitignore`).
- Proteção contra spam: campo honeypot + limite de envios por IP.
- Depois do envio: mensagem de sucesso e botão "Avise um amigo" (WhatsApp).

## "Convide um amigo"

Botão que abre `https://wa.me/?text=` com mensagem pronta: convite para a semana grátis na Academia Scuzziato + link de agendamento.

## SEO local

- `title` e `description` focados em "jiu-jitsu em Pinhais", "judô em Pinhais", "academia de luta em Pinhais".
- Open Graph com imagem de compartilhamento 1200×630.
- Dados estruturados schema.org `SportsActivityLocation` com endereço, horário e telefone.
- `sitemap.xml` e `robots.txt`.
- Eventos de conversão (prontos para ligar no Google Analytics): `agendamento_iniciado` no clique dos botões de agenda e `agendamento_concluido` quando a reserva é gravada.

## LGPD

- Aviso de privacidade no rodapé e nos formulários.
- Coletar só o necessário. Dados de menores só com o responsável.

## Qualidade

- Textos em português do Brasil, diretos e acolhedores. Falar com "você".
- Acessibilidade: contraste AA, foco visível, `alt` em imagens, botões com rótulo.
- Performance: imagens em WebP com tamanho definido, lazy loading abaixo da dobra, animações discretas (respeitar `prefers-reduced-motion`).
- Testar em 360 px de largura.
- Antes de concluir qualquer tarefa: `npm run build` sem erros.

## Fluxo de trabalho

Repositório privado no GitHub, com publicação automática (`.github/workflows/deploy.yml`):

| Branch | Para quê | Publica em |
|---|---|---|
| `main` | produção | branch `deploy` → https://www.academiascuzziato.com.br |
| `dev` | homologação (não indexável) | branch `deploy-dev` → https://dev.academiascuzziato.com.br |
| `deploy`, `deploy-dev` | só o `dist/` compilado, gerado pelo workflow | nunca editar à mão |

- Todo trabalho é feito na `dev` (ou em branch a partir dela), com commits pequenos.
- Ao terminar uma tarefa: push na `dev` e abrir PR de `dev` para `main` com resumo do que mudou e checklist do que foi testado.
- Nunca fazer push nem merge na `main` sem aprovação explícita do João.
- Depois do merge, confirmar no GitHub Actions que o deploy da produção terminou.

## Fora do escopo agora

- Loja (fase 2)
- Matrícula com pagamento integrado por API (fase 2; por enquanto links do gateway)
- Agenda com recorrência, lembretes e integração com WhatsApp (a Thryve Agenda pode assumir o lugar do `agendamento.php` depois; o site só depende de `agendamentoEndpoint`)
