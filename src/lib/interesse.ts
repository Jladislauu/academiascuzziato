import { config } from '../data/config';
import { modalidades } from '../data/modalidades';
import type { Dia, Modalidade, Periodo, PublicoInteresse } from '../data/types';

/** Modalidades que aparecem no formulário: as marcadas como emFormacao em modalidades.ts. */
export const modalidadesEmFormacao = modalidades.filter((m) => m.emFormacao);

export interface DadosInteresse {
  nome: string;
  whatsapp: string;
  modalidade: Modalidade | '';
  publico: PublicoInteresse | '';
  idadeCrianca: string;
  dias: Dia[];
  periodo: Periodo | '';
  consentimento: boolean;
  /** Honeypot: campo invisível. Gente não preenche; robô preenche. */
  empresa: string;
}

export type ErrosInteresse = Partial<Record<keyof DadosInteresse, string>>;

export const IDADE_MIN = 1;
export const IDADE_MAX = 17;

export const soDigitos = (valor: string) => valor.replace(/\D/g, '');

/** Máscara enquanto digita: "41999998888" → "(41) 99999-8888" */
export function formatarWhatsapp(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Mesmas regras do public/api/interesse.php. Mudou aqui, mude lá. */
export function validarInteresse(d: DadosInteresse): ErrosInteresse {
  const erros: ErrosInteresse = {};
  const nome = d.nome.trim();

  if (nome.length < 2 || nome.length > 100) erros.nome = 'Informe seu nome.';
  if (!/^[1-9]{2}9?\d{8}$/.test(soDigitos(d.whatsapp))) erros.whatsapp = 'Informe um WhatsApp com DDD.';
  if (!modalidadesEmFormacao.some((m) => m.id === d.modalidade)) erros.modalidade = 'Escolha a modalidade.';
  if (!d.publico) erros.publico = 'Escolha para quem é a turma.';
  if (d.publico === 'infantil') {
    const idade = Number(d.idadeCrianca);
    if (!Number.isInteger(idade) || idade < IDADE_MIN || idade > IDADE_MAX) {
      erros.idadeCrianca = 'Informe a idade da criança.';
    }
  }
  if (d.dias.length === 0) erros.dias = 'Escolha pelo menos um dia.';
  if (!d.periodo) erros.periodo = 'Escolha um período.';
  if (!d.consentimento) erros.consentimento = 'Para enviar, é preciso concordar com o uso dos dados.';

  return erros;
}

export type RespostaInteresse = { ok: true } | { ok: false; erro: string; campos?: ErrosInteresse };

export async function enviarInteresse(d: DadosInteresse): Promise<RespostaInteresse> {
  const payload = {
    nome: d.nome.trim(),
    whatsapp: soDigitos(d.whatsapp),
    modalidade: d.modalidade,
    publico: d.publico,
    idadeCrianca: d.publico === 'infantil' ? Number(d.idadeCrianca) : null,
    dias: d.dias,
    periodo: d.periodo,
    consentimento: d.consentimento,
    empresa: d.empresa,
  };

  // O `npm run dev` não executa PHP: simula o envio para testar a tela.
  if (import.meta.env.DEV) {
    console.info('[interesse] envio simulado (dev)', payload);
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }

  const resposta = await fetch(config.interesseEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const corpo = (await resposta.json().catch(() => null)) as RespostaInteresse | null;
  if (!corpo) throw new Error(`Resposta inválida (${resposta.status})`);
  return corpo;
}

/** Link para o formulário com a modalidade já escolhida (usado no "Avise um amigo"). */
export function linkFormulario(modalidade: Modalidade): string {
  return `${config.siteUrl}/?modalidade=${modalidade}#em-formacao`;
}

/** Modalidade vinda do link (?modalidade=boxe), se for uma das turmas em formação. */
export function modalidadeDaUrl(): Modalidade | '' {
  const valor = new URLSearchParams(window.location.search).get('modalidade');
  return modalidadesEmFormacao.find((m) => m.id === valor)?.id ?? '';
}

/*
 * "Quero ser avisado" (seção Modalidades) → formulário já com a modalidade marcada.
 * As seções não compartilham estado, então a conversa é por um evento do window.
 */
const EVENTO_MODALIDADE = 'arena:interesse-modalidade';

export function escolherModalidadeInteresse(modalidade: Modalidade): void {
  window.dispatchEvent(new CustomEvent<Modalidade>(EVENTO_MODALIDADE, { detail: modalidade }));
}

export function aoEscolherModalidade(callback: (modalidade: Modalidade) => void): () => void {
  const ouvir = (e: Event) => callback((e as CustomEvent<Modalidade>).detail);
  window.addEventListener(EVENTO_MODALIDADE, ouvir);
  return () => window.removeEventListener(EVENTO_MODALIDADE, ouvir);
}
