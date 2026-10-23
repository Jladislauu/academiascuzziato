/*
 * Regras do agendamento da aula experimental.
 *
 * A pessoa agenda só a PRIMEIRA aula. Depois dela, a semana grátis segue e ela
 * vem nas outras aulas sem agendar de novo. Por isso o limite de vagas
 * (config.vagasPorAula) vale só para quem está vindo pela primeira vez.
 *
 * As turmas que aparecem no agendamento saem de turmas.ts: aulaExperimental: true
 * e provisorio: false. O build copia essas regras e as turmas para dist/api/turmas.json,
 * que o api/agendamento.php usa para conferir dia, horário e vagas.
 */
export const agenda = {
  /** Quantos dias para a frente aparecem para agendar (a partir de hoje). */
  diasAFrente: 14,

  /** O agendamento de uma aula fecha esse tanto de minutos antes de ela começar. */
  antecedenciaMinutos: 60,

  /** Duração da semana grátis, contando o dia da aula agendada. */
  diasSemanaGratis: 7,

  /**
   * Dias sem aula (feriado, evento, academia fechada), no formato 'AAAA-MM-DD'.
   * Nesses dias nenhuma turma aparece para agendar.
   * TODO: confirmar com o Rhaue em quais feriados a academia fecha.
   */
  diasSemAula: [] as string[],
};
