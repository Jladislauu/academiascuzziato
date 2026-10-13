import type { Turma } from './types';

/*
 * Grade de horários (estado em 12/10/2026).
 *
 * Turma com provisorio: true aparece no site SEM dias e horário, com
 * "Horário a confirmar — fale com a gente". Os valores ficam aqui só para
 * facilitar: quando confirmar, é só mudar para provisorio: false.
 */
export const turmas: Turma[] = [
  {
    id: 'jiu-jitsu-gi',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu com kimono (GI)',
    publico: 'juvenil-adulto',
    nivel: 'Iniciante/Intermediário',
    selo: 'Ideal para começar',
    professor: 'Camilo Scuzziato',
    dias: ['ter', 'qua', 'qui'],
    inicio: '21:00',
    fim: '22:00',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'jiu-jitsu-nogi',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu sem kimono (No-Gi)',
    publico: 'juvenil-adulto',
    nivel: 'Avançado',
    nivelAviso: 'Avançado — para quem já treina',
    professor: 'Rhaue Scuzziato',
    dias: ['seg', 'qua', 'qui'],
    inicio: '11:00',
    fim: '12:00',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'judo-adulto',
    modalidade: 'judo',
    nome: 'Judô adulto',
    publico: 'juvenil-adulto',
    publicoLabel: 'Adulto',
    nivel: null,
    professor: null, // TODO: professor a definir
    dias: ['seg', 'qua'], // provisório
    inicio: '20:00', // provisório
    fim: '21:00', // provisório
    aulaExperimental: true,
    provisorio: true,
  },
  {
    id: 'jiu-jitsu-infantil',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu infantil',
    publico: 'infantil',
    nivel: null,
    professor: null, // TODO: professor a definir
    dias: ['ter', 'qui'], // provisório
    inicio: '18:00', // provisório
    fim: '19:00', // provisório
    aulaExperimental: true,
    provisorio: true,
  },
  {
    id: 'judo-infantil',
    modalidade: 'judo',
    nome: 'Judô infantil',
    publico: 'infantil',
    nivel: null,
    professor: null, // TODO: professor a definir
    dias: ['seg', 'qua'], // provisório
    inicio: '19:00', // provisório
    fim: '20:00', // provisório
    aulaExperimental: true,
    provisorio: true,
  },
];
