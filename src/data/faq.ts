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
      'Você agenda a primeira aula na turma que quiser e, durante a semana, vem nas outras aulas sem precisar agendar de novo. Treina sem pagar nada e só depois decide se quer se matricular. Sem compromisso.',
    confirmado: true,
  },
  {
    pergunta: 'Nunca treinei. Posso ir?',
    resposta:
      'Pode, e vai ser um prazer receber você. A turma de jiu-jitsu com kimono (GI) é a ideal para começar. O jiu-jitsu sem kimono (No-Gi) é avançado, para quem já treina.',
    confirmado: true,
  },
  {
    pergunta: 'Preciso de kimono na aula experimental?',
    resposta: 'Não precisa. Na aula experimental você pode treinar com roupa confortável de treino.',
    confirmado: true,
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
    pergunta: 'Qual a idade mínima para as turmas infantis?',
    resposta:
      'As turmas infantis começam aos 3 anos. No jiu-jitsu, tem turma de 3 a 5 anos e de 6 a 11 anos. O agendamento da aula experimental de criança é feito pelo responsável.',
    confirmado: true,
  },
  {
    pergunta: 'Posso trazer amigos?',
    resposta:
      'Claro! Treinar com amigo é ainda melhor. Cada aula experimental tem até 5 vagas, então cada amigo agenda a própria vaga.',
    confirmado: true,
  },
  {
    pergunta: 'Posso fazer a semana grátis em mais de uma modalidade?',
    resposta:
      'Pode. Na primeira semana grátis você pode treinar todas as modalidades. Agende a primeira aula e, durante a semana, venha também nas aulas das outras modalidades, sem precisar agendar de novo.',
    confirmado: true,
  },
];

/** Texto exibido no site publicado para perguntas ainda não confirmadas. */
export const respostaPendente =
  'Estamos confirmando esse detalhe. Manda sua pergunta no WhatsApp que a gente responde.';
