import type { ModalidadeInfo } from './types';

// Cards da seção Modalidades (fase 2). Os nomes também são usados nos filtros da grade.
export const modalidades: ModalidadeInfo[] = [
  {
    id: 'jiu-jitsu',
    nome: 'Jiu-jitsu',
    descricao: 'Com kimono (GI) e sem kimono (No-Gi).',
    publicos: ['Infantil', 'Juvenil/Adulto'],
    niveis: ['Iniciante', 'Intermediário', 'Avançado'],
    emFormacao: false,
  },
  {
    id: 'judo',
    nome: 'Judô',
    descricao: 'Turmas para adultos e crianças.',
    publicos: ['Infantil', 'Adulto'],
    niveis: [], // TODO: níveis do judô
    emFormacao: false,
  },
  {
    id: 'muay-thai',
    nome: 'Muay thai',
    descricao: 'Turma em formação.',
    publicos: ['Infantil', 'Adulto'],
    niveis: [],
    emFormacao: true,
  },
  {
    id: 'boxe',
    nome: 'Boxe',
    descricao: 'Turma em formação.',
    publicos: ['Infantil', 'Adulto'],
    niveis: [],
    emFormacao: true,
  },
];

export function nomeModalidade(id: ModalidadeInfo['id']): string {
  return modalidades.find((m) => m.id === id)?.nome ?? id;
}
