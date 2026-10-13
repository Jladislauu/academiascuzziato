import type { FaqItem } from './types';

/*
 * Perguntas frequentes.
 *
 * confirmado: false = rascunho. Só aparece no `npm run dev`, com selo de rascunho.
 * No site publicado, a pergunta aparece com `respostaPendente` e um botão de WhatsApp.
 * O `import.meta.env.DEV ? '...' : ''` tira o texto do rascunho do build publicado.
 *
 * Depois de confirmar com a academia: ajuste a resposta, tire o
 * `import.meta.env.DEV ? ... : ''` e mude para confirmado: true.
 */
export const faq: FaqItem[] = [
  {
    pergunta: 'Como funciona a semana grátis?',
    resposta:
      'Você agenda a aula experimental na turma que quiser, treina com a gente durante a primeira semana sem pagar nada e só depois decide se quer se matricular. Sem compromisso.',
    confirmado: true,
  },
  {
    pergunta: 'Nunca treinei. Posso ir?',
    resposta:
      'Pode, e vai ser um prazer receber você. A turma de jiu-jitsu com kimono (GI), com o professor Camilo, é a ideal para começar. O jiu-jitsu sem kimono (No-Gi) é avançado, para quem já treina.',
    confirmado: true,
  },
  {
    // TODO: confirmar com o Rhaue (precisa de kimono? a academia empresta?)
    pergunta: 'Preciso de kimono na aula experimental?',
    resposta: import.meta.env.DEV
      ? 'Não precisa. Venha com roupa confortável de treino, como camiseta e bermuda ou legging, sem zíper nem botões. A academia tem kimono para emprestar durante a primeira semana.'
      : '',
    confirmado: false,
  },
  {
    // TODO: confirmar com o Rhaue (o que levar)
    pergunta: 'O que levar?',
    resposta: import.meta.env.DEV
      ? 'Garrafa de água, chinelo para andar fora do tatame e roupa de treino. Venha com as unhas cortadas e sem acessórios, como brincos, anéis e relógio, para a segurança de todo mundo.'
      : '',
    confirmado: false,
  },
  {
    // TODO: confirmar com o Rhaue (idade mínima das turmas infantis)
    pergunta: 'Qual a idade mínima para as turmas infantis?',
    resposta: import.meta.env.DEV
      ? 'As turmas infantis recebem crianças a partir de 4 anos. O agendamento da aula experimental de criança é feito pelo responsável.'
      : '',
    confirmado: false,
  },
  {
    pergunta: 'Posso trazer amigos?',
    resposta:
      'Claro! Treinar com amigo é ainda melhor. Cada aula experimental tem até 5 vagas, então cada amigo agenda a própria vaga.',
    confirmado: true,
  },
  {
    // TODO: confirmar com o Rhaue (semana grátis vale para mais de uma modalidade?)
    pergunta: 'Posso fazer a semana grátis em mais de uma modalidade?',
    resposta: import.meta.env.DEV
      ? 'Pode. Durante a primeira semana você pode experimentar jiu-jitsu e judô para descobrir de qual gosta mais. É só agendar cada aula.'
      : '',
    confirmado: false,
  },
];

/** Texto exibido no site publicado para perguntas ainda não confirmadas. */
export const respostaPendente =
  'Estamos confirmando esse detalhe. Manda sua pergunta no WhatsApp que a gente responde.';
