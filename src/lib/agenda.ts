import { agenda } from '../data/agenda';
import { config, mensagens } from '../data/config';
import { turmas } from '../data/turmas';
import type { Turma } from '../data/types';
import { diaLongo, hora } from './format';
import { soDigitos } from './interesse';
import { diaDaData, diaMes, professorDoDia, proximasAulas, somarDias, turmasAgendaveis, type Aula } from './aulas';

/*
 * Agendamento da aula experimental (janela aberta por qualquer botão "Agendar").
 *
 * A pessoa agenda só a primeira aula; depois vem nas outras da semana sem agendar.
 * O servidor (public/api/agendamento.php) confere tudo de novo: dia, vagas e se
 * a pessoa já tem aula marcada.
 */

/** Turmas que aparecem no agendamento (aula experimental e horário confirmado). */
export const turmasDoAgendamento = turmasAgendaveis(turmas);

export const turmaPorId = (id: string) => turmasDoAgendamento.find((t) => t.id === id);

export interface AulaComVagas extends Aula {
  vagas: number;
}

export type ParaQuem = 'eu' | 'menor';
export type Experiencia = 'nunca' | 'ja-treinou';

export interface DadosAgendamento {
  turma: string;
  data: string;
  /** Turma infantil é sempre 'menor' (agenda o responsável). */
  paraQuem: ParaQuem | '';
  /** Quem agenda: a própria pessoa ou o responsável. */
  nome: string;
  /** Nome de quem vai treinar, quando é menor de idade. */
  aluno: string;
  idade: string;
  whatsapp: string;
  experiencia: Experiencia | '';
  consentimento: boolean;
  /** Honeypot: campo invisível. Gente não preenche; robô preenche. */
  empresa: string;
}

export type ErrosAgendamento = Partial<Record<keyof DadosAgendamento, string>>;

export const IDADE_MIN = 1;
export const IDADE_MAX = 17;

export const ehParaMenor = (d: DadosAgendamento, turma?: Turma) =>
  turma?.publico === 'infantil' || d.paraQuem === 'menor';

/** Mesmas regras do public/api/agendamento.php. Mudou aqui, mude lá. */
export function validarAgendamento(d: DadosAgendamento): ErrosAgendamento {
  const erros: ErrosAgendamento = {};
  const turma = turmaPorId(d.turma);
  const menor = ehParaMenor(d, turma);
  const tamanhoOk = (texto: string) => texto.trim().length >= 2 && texto.trim().length <= 100;

  if (!turma) erros.turma = 'Escolha a turma.';
  if (!d.data) erros.data = 'Escolha o dia.';
  if (turma?.publico !== 'infantil' && !d.paraQuem) erros.paraQuem = 'Diga quem vai treinar.';
  if (!tamanhoOk(d.nome)) erros.nome = menor ? 'Informe o nome do responsável.' : 'Informe seu nome.';
  if (menor) {
    if (!tamanhoOk(d.aluno)) erros.aluno = 'Informe o nome de quem vai treinar.';
    const idade = Number(d.idade);
    if (!d.idade || !Number.isInteger(idade) || idade < IDADE_MIN || idade > IDADE_MAX) {
      erros.idade = 'Informe a idade (até 17 anos).';
    }
  }
  if (!/^[1-9]{2}9?\d{8}$/.test(soDigitos(d.whatsapp))) erros.whatsapp = 'Informe um WhatsApp com DDD.';
  if (!d.experiencia) erros.experiencia = 'Escolha uma opção.';
  if (!d.consentimento) erros.consentimento = 'Para agendar, é preciso concordar com o uso dos dados.';

  return erros;
}

/* ---------- servidor ---------- */

/** Próximas aulas de todas as turmas, com as vagas que sobram. */
export async function carregarAulas(): Promise<AulaComVagas[]> {
  // O `npm run dev` não executa PHP: simula as aulas com algumas vagas ocupadas.
  if (import.meta.env.DEV) {
    await new Promise((r) => setTimeout(r, 400));
    return turmasDoAgendamento.flatMap((t) =>
      proximasAulas(t, agenda).map((aula, i) => ({ ...aula, vagas: [3, 0, 5, 1, 4][i % 5] })),
    );
  }

  const resposta = await fetch(config.agendamentoEndpoint, { headers: { Accept: 'application/json' } });
  const corpo = (await resposta.json().catch(() => null)) as
    | { ok: true; aulas: { turma: string; data: string; vagas: number }[] }
    | { ok: false; erro: string }
    | null;
  if (!corpo?.ok) throw new Error(corpo?.erro ?? `Resposta inválida (${resposta.status})`);

  return corpo.aulas.flatMap((a) => {
    const turma = turmaPorId(a.turma);
    const dia = diaDaData(a.data);
    if (!turma || !dia) return [];
    return [{ turmaId: turma.id, data: a.data, inicio: turma.inicio, fim: turma.fim, professor: professorDoDia(turma, dia), vagas: a.vagas }];
  });
}

export type RespostaAgendamento =
  | { ok: true }
  | {
      ok: false;
      erro: string;
      campos?: ErrosAgendamento;
      /** A aula lotou ou saiu da lista: recarregar as aulas e escolher outro dia. */
      atualizar?: boolean;
      /** A pessoa já tem aula experimental marcada. */
      jaAgendado?: boolean;
    };

export async function enviarAgendamento(d: DadosAgendamento): Promise<RespostaAgendamento> {
  const menor = ehParaMenor(d, turmaPorId(d.turma));
  const payload = {
    turma: d.turma,
    data: d.data,
    paraQuem: menor ? 'menor' : 'eu',
    nome: d.nome.trim(),
    aluno: menor ? d.aluno.trim() : null,
    idade: menor ? Number(d.idade) : null,
    whatsapp: soDigitos(d.whatsapp),
    experiencia: d.experiencia,
    consentimento: d.consentimento,
    empresa: d.empresa,
  };

  if (import.meta.env.DEV) {
    console.info('[agendamento] envio simulado (dev)', payload);
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }

  const resposta = await fetch(config.agendamentoEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const corpo = (await resposta.json().catch(() => null)) as RespostaAgendamento | null;
  if (!corpo) throw new Error(`Resposta inválida (${resposta.status})`);
  return corpo;
}

/* ---------- abrir pela URL ---------- */

/*
 * Os botões "Agendar" são links para #agendar (ou #agendar/<turma>). Assim:
 *   - o link pode ser compartilhado e abre o site já no agendamento
 *     (bio do Instagram: www.academiascuzziato.com.br/#agendar);
 *   - no celular, o "voltar" fecha a janela em vez de sair do site.
 */
const PREFIXO = '#agendar';

/** Âncora que abre o agendamento, já na turma se ela for informada. */
export const agendaHref = (turmaId?: string) => (turmaId ? `${PREFIXO}/${turmaId}` : PREFIXO);

/** Link completo para mandar por WhatsApp. */
export const agendaUrlCompleta = (turmaId?: string) => `${config.siteUrl}/${agendaHref(turmaId)}`;

/** '#agendar/jiu-jitsu-gi' → { turmaId: 'jiu-jitsu-gi' }; outra âncora → null. */
export function lerHashAgenda(hash: string): { turmaId?: string } | null {
  if (hash !== PREFIXO && !hash.startsWith(`${PREFIXO}/`)) return null;
  const id = decodeURIComponent(hash.slice(PREFIXO.length + 1));
  return { turmaId: turmaPorId(id)?.id };
}

/* ---------- textos ---------- */

/** '2026-10-27' → 'terça, 27/10' */
export function dataPorExtenso(data: string): string {
  const dia = diaDaData(data);
  return dia ? `${diaLongo(dia)}, ${diaMes(data)}` : diaMes(data);
}

/** 'terça, 27/10, às 21h' */
export const quandoPorExtenso = (aula: Aula) => `${dataPorExtenso(aula.data)}, às ${hora(aula.inicio)}`;

/** Último dia da semana grátis, contando o dia da aula agendada. */
export const fimSemanaGratis = (data: string) => somarDias(data, agenda.diasSemanaGratis - 1);

export function conviteDepoisDeAgendar(turma: Turma, aula: Aula): string {
  const texto = mensagens.conviteAmigoTurma(turma.nome, quandoPorExtenso(aula), agendaUrlCompleta(turma.id));
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/* ---------- salvar na agenda do celular ---------- */

const escaparIcs = (texto: string) => texto.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/** '2026-10-27', '21:00' → '20261028T000000Z'. Brasília é UTC−3 o ano todo (sem horário de verão desde 2019). */
const utcIcs = (data: string, hhmm: string) =>
  new Date(`${data}T${hhmm}:00-03:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Arquivo .ics da aula (o celular oferece para salvar na agenda). */
export function arquivoAgenda(turma: Turma, aula: Aula, endereco: string): Blob {
  const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Academia Scuzziato//Aula experimental//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:aula-experimental-${turma.id}-${aula.data}@academiascuzziato.com.br`,
    `DTSTAMP:${agora}`,
    `DTSTART:${utcIcs(aula.data, aula.inicio)}`,
    `DTEND:${utcIcs(aula.data, aula.fim)}`,
    `SUMMARY:${escaparIcs(`Aula experimental: ${turma.nome} (Academia Scuzziato)`)}`,
    `LOCATION:${escaparIcs(endereco)}`,
    `DESCRIPTION:${escaparIcs(`Primeira semana grátis na Academia Scuzziato.\n${config.siteUrl}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Aula experimental hoje',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Blob([`${linhas.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
}
