import type { Plano } from './types';

// TODO: confirmar se há taxa de matrícula, fidelidade ou limite de aulas por semana.
export const planos: Plano[] = [
  {
    id: 'uma-modalidade',
    nome: 'Uma modalidade',
    precoMensal: 120,
    descricao: 'Para quem quer focar em uma luta.',
    inclui: ['Uma modalidade à sua escolha', 'Primeira semana grátis antes de se matricular'],
    recomendado: false,
  },
  {
    id: 'livre',
    nome: 'Livre',
    precoMensal: 160,
    descricao: 'Treine todas as modalidades da Arena.',
    inclui: [
      'Todas as modalidades',
      'Jiu-jitsu e judô no mesmo plano',
      'Primeira semana grátis antes de se matricular',
    ],
    recomendado: true,
    chamada: 'Por R$ 40 a mais, treine tudo',
  },
];
