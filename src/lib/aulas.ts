import type { Dia, Turma } from '../data/types';

/*
 * Datas das aulas para o agendamento da aula experimental.
 *
 * Funções puras (sem window nem import.meta.env): também rodam no build
 * (plugins/agenda.ts). As datas são sempre 'AAAA-MM-DD' no fuso da academia.
 *
 * A mesma regra está em public/api/inc/comum.php (proximasAulas). Mudou aqui, mude lá.
 */

export const FUSO_ACADEMIA = 'America/Sao_Paulo';

/** Professor da turma num dia (null = a confirmar). */
export const professorDoDia = (turma: Turma, dia: Dia): string | null =>
  turma.professorPorDia && dia in turma.professorPorDia ? (turma.professorPorDia[dia] ?? null) : turma.professor;

/** Professores da turma agrupados pelos dias em que dão aula, na ordem da semana. */
export function professoresDaTurma(turma: Turma): { nome: string | null; dias: Dia[] }[] {
  const grupos: { nome: string | null; dias: Dia[] }[] = [];
  for (const dia of turma.dias) {
    const nome = professorDoDia(turma, dia);
    const grupo = grupos.find((g) => g.nome === nome);
    if (grupo) grupo.dias.push(dia);
    else grupos.push({ nome, dias: [dia] });
  }
  return grupos;
}

/**
 * Turmas que aparecem no agendamento: aceitam aula experimental, têm horário
 * confirmado e pelo menos um dia com professor confirmado.
 */
export const turmasAgendaveis = (turmas: Turma[]) =>
  turmas.filter((t) => t.aulaExperimental && !t.provisorio && t.dias.some((d) => professorDoDia(t, d) !== null));

export interface RegrasAgenda {
  diasAFrente: number;
  antecedenciaMinutos: number;
  diasSemAula: string[];
}

export interface Aula {
  turmaId: string;
  /** 'AAAA-MM-DD' */
  data: string;
  inicio: string;
  fim: string;
  professor: string | null;
}

const DIA_DA_SEMANA: (Dia | null)[] = [null, 'seg', 'ter', 'qua', 'qui', 'sex', null];

/** "21:30" → 1290 */
export const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Data de hoje e minutos desde a meia-noite, no fuso da academia. */
export function agoraNaAcademia(agora: Date = new Date()): { data: string; minutos: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_ACADEMIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

// Meio-dia UTC: somar dias nunca escorrega de data por causa de fuso.
const comoData = (data: string) => new Date(`${data}T12:00:00Z`);

/** '2026-10-27' + 7 → '2026-11-03' */
export function somarDias(data: string, dias: number): string {
  const d = comoData(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Dia da semana de uma data ('2026-10-27' → 'ter'); null no fim de semana. */
export const diaDaData = (data: string): Dia | null => DIA_DA_SEMANA[comoData(data).getUTCDay()];

/** '2026-10-27' → '27/10' */
export const diaMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/**
 * Próximas aulas de uma turma que ainda podem ser agendadas: de hoje até
 * `diasAFrente` dias depois, fora dos dias sem aula e dos dias com professor a
 * confirmar, e fechando `antecedenciaMinutos` antes de cada aula começar.
 */
export function proximasAulas(turma: Turma, regras: RegrasAgenda, agora: Date = new Date()): Aula[] {
  const hoje = agoraNaAcademia(agora);
  const aulas: Aula[] = [];

  for (let i = 0; i < regras.diasAFrente; i++) {
    const data = somarDias(hoje.data, i);
    const dia = diaDaData(data);
    if (!dia || !turma.dias.includes(dia) || regras.diasSemAula.includes(data)) continue;
    const professor = professorDoDia(turma, dia);
    if (professor === null) continue;
    if (i === 0 && minutos(turma.inicio) - regras.antecedenciaMinutos <= hoje.minutos) continue;
    aulas.push({ turmaId: turma.id, data, inicio: turma.inicio, fim: turma.fim, professor });
  }

  return aulas;
}
