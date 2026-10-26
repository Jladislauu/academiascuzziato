import type { Turma } from './types';

/*
 * Grade de horários (enviada pelo Rhaue em 26/10/2026).
 *
 * - professorPorDia: quando o professor muda conforme o dia. null num dia =
 *   professor a confirmar: a aula aparece na grade, mas esse dia não abre para
 *   agendamento da aula experimental.
 * - provisorio: true = dias e horário NÃO aparecem no site ("Horário a confirmar").
 * - Ainda fora da grade: quarta 20h–21h (horário e modalidade a confirmar).
 */
export const turmas: Turma[] = [
  {
    id: 'jiu-jitsu-gi',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu com kimono (GI)',
    publico: 'juvenil-adulto',
    nivel: 'Iniciante/Intermediário',
    selo: 'Ideal para começar',
    professor: 'Rhaue Scuzziato',
    professorPorDia: { qua: 'Camilo Scuzziato', qui: 'Camilo Scuzziato' },
    dias: ['seg', 'ter', 'qua', 'qui'],
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
    dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
    inicio: '11:00',
    fim: '12:00',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'jiu-jitsu-feminino',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu feminino (GI)',
    publico: 'juvenil-adulto',
    publicoLabel: 'Feminino',
    nivel: null,
    professor: 'Leynha',
    dias: ['ter', 'qui'],
    inicio: '20:10',
    fim: '21:10',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'jiu-jitsu-infantil-3-5',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu infantil (3 a 5 anos)',
    publico: 'infantil',
    nivel: null,
    professor: 'Camilo Scuzziato',
    dias: ['ter', 'qui'],
    inicio: '10:00',
    fim: '11:00',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'jiu-jitsu-infantil-6-11',
    modalidade: 'jiu-jitsu',
    nome: 'Jiu-jitsu infantil (6 a 11 anos)',
    publico: 'infantil',
    nivel: null,
    professor: 'Camilo Scuzziato',
    dias: ['ter', 'qui'],
    inicio: '18:00',
    fim: '19:00',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'judo-infantil',
    modalidade: 'judo',
    // TODO: confirmar se a faixa de 3 a 5 anos vale para todos os dias (na quarta veio sem idade).
    nome: 'Judô infantil (3 a 5 anos)',
    publico: 'infantil',
    nivel: null,
    professor: 'João Menegonni',
    professorPorDia: { seg: null }, // TODO: professor novo a confirmar na segunda
    dias: ['seg', 'ter', 'qua', 'qui'],
    inicio: '19:00',
    fim: '20:00',
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
    professor: null, // TODO: professor novo a confirmar
    dias: ['seg'],
    inicio: '20:00',
    fim: '21:00',
    aulaExperimental: true,
    provisorio: false,
  },
  {
    id: 'muay-thai-adulto',
    modalidade: 'muay-thai',
    nome: 'Muay Thai adulto',
    publico: 'juvenil-adulto',
    publicoLabel: 'Adulto',
    nivel: null,
    professor: 'Evandro Nascimento',
    observacao: 'No tatame da frente',
    dias: ['ter', 'qui'],
    inicio: '19:00',
    fim: '20:00',
    aulaExperimental: true,
    provisorio: false,
  },
];

/** Open mat (treino livre) de sábado. Aparece na grade, fora dos cards de turma. */
export const openMat = {
  dia: 'Sábado',
  inicio: '10:00',
  fim: '12:00',
};
