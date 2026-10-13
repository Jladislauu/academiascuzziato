# Arena Pinhais — site

Site da **Arena Pinhais**, centro esportivo em Pinhais-PR que começa pelas artes marciais (jiu-jitsu e judô hoje; muay thai e boxe em formação) e vai se expandir para outros esportes. Foco em formar atletas e campeões, mas aberto a quem só quer praticar, inclusive iniciantes e crianças.

Projeto da Thryve (João Lucas). Documentação completa no Notion: página "Arena Pinhais — Site".

## Objetivo do site

Gerar **agendamentos de aula experimental** e tirar do WhatsApp o trabalho manual de tirar dúvidas, agendar e matricular.

**Mensagem central: a primeira semana de treino é grátis.** Aparece no topo, se repete nos botões e tem uma seção própria explicando como funciona. Todo botão principal leva para "Agendar aula experimental".

## Stack

- Vite + React + TypeScript + Tailwind CSS + Framer Motion
- Site estático (`npm run build` gera `dist/`), hospedado na Hostinger em `arenapinhais.com.br`
- Repositório no GitHub
- Página única com seções e navegação por âncoras. Sem roteador por enquanto.
- Mobile-first: a maior parte do público vem do Instagram e do WhatsApp, no celular.

## Identidade visual

- **Cores** (definir como tokens no Tailwind, nunca hex solto nos componentes):
  - `preto` #0E0F12 (fundo principal; o site é escuro)
  - `branco` #FFFFFF
  - `vermelho` #E10600 (destaque, botões principais, "PINHAIS")
  - cinzas derivados do preto para cards e bordas
- **Tipografia:**
  - Títulos: Barlow Condensed 800/900, caixa alta (`@fontsource/barlow-condensed`)
  - Texto: Barlow 400/500/600 (`@fontsource/barlow`)
- **Logo:** só tipográfico, "ARENA" em branco sobre "PINHAIS" em vermelho. Arquivos em `public/brand/`:
  - `arena-pinhais-escuro-transparente.svg` (uso padrão sobre fundo escuro)
  - `arena-pinhais-claro-transparente.svg` (sobre fundo claro)
  - `arena-pinhais-favicon.png` e `arena-pinhais-avatar.png`
  - Nunca recriar o logo com texto HTML; sempre usar os SVGs.
- **Tom visual:** moderno e esportivo, como clubes e ligas esportivas. Não como academia de luta tradicional. Competitivo sem ser agressivo.
- **Proibido:** qualquer referência à marca ou ao emblema "Arena Jiu-Jitsu", e a cor laranja #F26521. A Arena Pinhais é independente.

## Dados da academia

- Endereço: R. Vicente D'Andréa, 617 — Estância Pinhais, Pinhais-PR, 83323-190
- Funcionamento: segunda a sexta, 8h às 23h
- WhatsApp, Instagram, e-mail: **ainda não recebidos** → placeholders em `src/data/config.ts`
- Professores: Rhaue Scuzziato e Camilo Scuzziato

## Regra mais importante: conteúdo fica em arquivos de dados

Todo conteúdo que muda (turmas, horários, planos, links, contatos) vive em `src/data/`, nunca escrito dentro dos componentes. O João atualiza a grade e os links editando só esses arquivos.

- `src/data/config.ts` — URLs e contatos:
  - `agendaUrl` (Easy!Appointments, provisório: `https://agenda.arenapinhais.com.br`)
  - `whatsapp`, `instagram`, `email` (placeholders marcados com `// TODO`)
  - `matriculaLinks` por plano (links do gateway de pagamento, ainda não existem)
- `src/data/turmas.ts` — grade
- `src/data/planos.ts` — planos e preços
- `src/data/faq.ts` — perguntas frequentes

Nunca invente informação (horário, preço, nome, telefone). Se faltar, use placeholder com `// TODO` e me avise.

### Turmas (estado em 12/10/2026)

Cada turma tem: `id`, `modalidade`, `nome`, `publico` (Infantil / Juvenil/Adulto), `nivel`, `professor`, `dias`, `inicio`, `fim`, `aulaExperimental` (boolean), `provisorio` (boolean), `agendaProviderId` e `agendaServiceId` (opcionais, para link direto da turma no Easy!Appointments).

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
- Até 5 vagas por aula. A pessoa pode trazer amigos; cada amigo agenda a própria vaga.

## Seções da página

1. **Topo** — logo, chamada "Primeira semana grátis", botão "Agendar aula experimental", botão secundário "Ver horários".
2. **Como funciona a semana grátis** — 3 passos: agenda → treina a semana → decide se matricula.
3. **Modalidades** — card por modalidade (jiu-jitsu, judô e, como "em formação", muay thai e boxe), com público e níveis.
4. **Grade de horários** — filtro por modalidade e por público (infantil / juvenil-adulto). Cada turma com `aulaExperimental` tem botão "Agendar" que abre a agenda (link direto da turma, se houver IDs; senão `agendaUrl`).
5. **Turmas em formação** — formulário de interesse (ver abaixo).
6. **Professores** — Rhaue e Camilo (fotos e textos ainda não recebidos → placeholders).
7. **Planos** — os dois planos, botão "Quero me matricular" (por enquanto leva ao WhatsApp com mensagem pronta; depois vai para o link do gateway em `matriculaLinks`).
8. **Estrutura** — galeria de fotos (placeholders até recebermos as fotos).
9. **Perguntas frequentes** — precisa de kimono na aula experimental? qual a idade mínima? nunca treinei, posso ir? posso trazer amigos? o que levar? como funciona a semana grátis?
10. **Localização e contato** — mapa (embed do Google Maps pelo endereço), endereço, horário de funcionamento, WhatsApp, Instagram.
11. **Rodapé** — logo, contatos, aviso de privacidade, crédito "Site por Thryve".

Botão flutuante de WhatsApp em todas as telas.

## Formulário "Turmas em formação"

Objetivo: descobrir quando e em que horário abrir muay thai e boxe.

- Campos: nome, WhatsApp, modalidade (muay thai / boxe), público (adulto / infantil + idade da criança), dias preferidos (seg–sex), período preferido (manhã / tarde / noite), consentimento LGPD (checkbox obrigatório).
- Envio: endpoint PHP na própria Hostinger, `public/api/interesse.php`, que valida, grava numa tabela MySQL `interesses` e envia e-mail de aviso para a academia. Credenciais em arquivo fora do repositório (`config.local.php`, no `.gitignore`).
- Proteção contra spam: campo honeypot + limite de envios por IP.
- Depois do envio: mensagem de sucesso e botão "Avise um amigo" (WhatsApp).

## "Convide um amigo"

Botão que abre `https://wa.me/?text=` com mensagem pronta: convite para a semana grátis na Arena Pinhais + link de agendamento.

## SEO local

- `title` e `description` focados em "jiu-jitsu em Pinhais", "judô em Pinhais", "academia de luta em Pinhais".
- Open Graph com imagem de compartilhamento 1200×630.
- Dados estruturados schema.org `SportsActivityLocation` com endereço, horário e telefone.
- `sitemap.xml` e `robots.txt`.
- Evento de conversão "agendamento iniciado" no clique dos botões de agenda (deixar a função pronta para ligar no Google Analytics depois).

## LGPD

- Aviso de privacidade no rodapé e nos formulários.
- Coletar só o necessário. Dados de menores só com o responsável.

## Qualidade

- Textos em português do Brasil, diretos e acolhedores. Falar com "você".
- Acessibilidade: contraste AA, foco visível, `alt` em imagens, botões com rótulo.
- Performance: imagens em WebP com tamanho definido, lazy loading abaixo da dobra, animações discretas (respeitar `prefers-reduced-motion`).
- Testar em 360 px de largura.
- Antes de concluir qualquer tarefa: `npm run build` sem erros.

## Fora do escopo agora

- Loja (fase 2)
- Matrícula com pagamento integrado por API (fase 2; por enquanto links do gateway)
- Agenda própria (a Thryve Agenda vai substituir o Easy!Appointments depois — por isso a agenda é sempre um link/iframe configurável)
