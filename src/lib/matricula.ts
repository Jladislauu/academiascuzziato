import { config } from '../data/config';
import { matricula as regrasMatricula } from '../data/matricula';
import { planos } from '../data/planos';
import { turmas } from '../data/turmas';
import type { Modalidade, Plano, PlanoId, Turma } from '../data/types';
import { soDigitos } from './interesse';

/*
 * Matrícula online: ficha no site que cria a assinatura mensal no Asaas
 * (janela aberta por qualquer link para #matricula ou #matricula/<plano>).
 * A matrícula só fica ativa quando a primeira mensalidade é paga (confirmação
 * pelo webhook do Asaas, do lado do servidor).
 *
 *   plano → quem vai treinar → dados → turmas → resumo → pronto
 *
 * O servidor (public/api/matricula.php) confere tudo de novo.
 */

export const planoPorId = (id: string): Plano | undefined => planos.find((p) => p.id === id);

export type ParaQuem = 'eu' | 'menor';

export interface DadosMatricula {
  plano: PlanoId | '';
  /** Só para o plano 'uma-modalidade'. */
  modalidade: Modalidade | '';
  paraQuem: ParaQuem | '';
  nomeAluno: string;
  /** "AAAA-MM-DD" */
  dataNascimento: string;
  /** Só quando o aluno é menor de idade. */
  nomeResponsavel: string;
  /** CPF de quem paga (o aluno, ou o responsável quando menor). Só vai para o Asaas. */
  cpfPagador: string;
  emailPagador: string;
  whatsappPagador: string;
  /** Ids de turmas.ts que a pessoa pretende frequentar. Opcional. */
  turmas: string[];
  imagemAutorizada: boolean;
  aceiteTermo: boolean;
  consentimento: boolean;
  /** Honeypot: campo invisível. Gente não preenche; robô preenche. */
  empresa: string;
}

export type ErrosMatricula = Partial<Record<keyof DadosMatricula, string>>;

export const VAZIA: DadosMatricula = {
  plano: '',
  modalidade: '',
  paraQuem: '',
  nomeAluno: '',
  dataNascimento: '',
  nomeResponsavel: '',
  cpfPagador: '',
  emailPagador: '',
  whatsappPagador: '',
  turmas: [],
  imagemAutorizada: false,
  aceiteTermo: false,
  consentimento: false,
  empresa: '',
};

/* ---------- idade e CPF ---------- */

/** Idade completa numa data ("1990-05-20" → 36); null se a data for inválida ou futura. */
export function idadeNaData(dataNascimento: string, hoje: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return null;
  const nascimento = new Date(`${dataNascimento}T12:00:00Z`);
  if (Number.isNaN(nascimento.getTime()) || nascimento > hoje) return null;

  let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const aindaNaoFezAniversario =
    hoje.getUTCMonth() < nascimento.getUTCMonth() ||
    (hoje.getUTCMonth() === nascimento.getUTCMonth() && hoje.getUTCDate() < nascimento.getUTCDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

export function ehMenorDeIdade(dataNascimento: string): boolean {
  const idade = idadeNaData(dataNascimento);
  return idade !== null && idade < 18;
}

/** Quem vai treinar é menor de idade: decidido pela escolha (igual ao agendamento), confirmado pela data de nascimento. */
export const ehMenorEscolha = (d: Pick<DadosMatricula, 'paraQuem'>): boolean => d.paraQuem === 'menor';

/** Algoritmo padrão de validação de CPF (dígitos verificadores). Mesma regra em public/api/inc/matriculas.php. */
export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(cpf[i]) * (t + 1 - i);
    let digito = (10 * soma) % 11;
    if (digito >= 10) digito = 0;
    if (Number(cpf[t]) !== digito) return false;
  }
  return true;
}

/** Máscara enquanto digita: "12345678901" → "123.456.789-01" */
export function formatarCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  const partes = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  let texto = partes.join('.');
  if (d.length > 9) texto += `-${d.slice(9, 11)}`;
  return texto;
}

/* ---------- turmas e valor ---------- */

/** Turmas de uma modalidade (plano "Uma modalidade"), ou todas (plano "Livre"). */
export function turmasParaEscolher(modalidade: Modalidade | ''): Turma[] {
  return turmas.filter((t) => !modalidade || t.modalidade === modalidade);
}

export const turmaMatriculaPorId = (id: string) => turmas.find((t) => t.id === id);

export const valorPlano = (plano: Plano): number => plano.precoMensal + regrasMatricula.taxaAdesao;

/* ---------- validação ---------- */

/** Mesmas regras do public/api/matricula.php. Mudou aqui, mude lá. */
export function validarMatricula(d: DadosMatricula): ErrosMatricula {
  const erros: ErrosMatricula = {};
  const plano = planoPorId(d.plano);
  const tamanhoOk = (texto: string) => texto.trim().length >= 2 && texto.trim().length <= 100;

  if (!plano) erros.plano = 'Escolha o plano.';
  if (plano?.id === 'uma-modalidade' && !d.modalidade) erros.modalidade = 'Escolha a modalidade.';
  if (!d.paraQuem) erros.paraQuem = 'Diga quem vai treinar.';

  if (!tamanhoOk(d.nomeAluno)) erros.nomeAluno = 'Informe o nome de quem vai treinar.';

  const menor = ehMenorEscolha(d);
  const idade = idadeNaData(d.dataNascimento);
  if (idade === null) {
    erros.dataNascimento = 'Informe a data de nascimento.';
  } else if (!menor && idade < 18) {
    // Confirma a escolha "Eu": menor de 18 anos é matriculado pelo responsável.
    erros.dataNascimento = 'Menores de 18 anos são matriculados pelo responsável. Escolha "Meu filho ou filha".';
  }

  if (menor && !tamanhoOk(d.nomeResponsavel)) erros.nomeResponsavel = 'Informe o nome do responsável.';

  if (!cpfValido(d.cpfPagador)) erros.cpfPagador = menor ? 'Informe um CPF válido do responsável.' : 'Informe um CPF válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.emailPagador.trim())) erros.emailPagador = 'Informe um e-mail válido.';
  if (!/^[1-9]{2}9?\d{8}$/.test(soDigitos(d.whatsappPagador))) erros.whatsappPagador = 'Informe um WhatsApp com DDD.';

  if (!d.aceiteTermo) erros.aceiteTermo = 'Para se matricular, é preciso aceitar o termo de adesão.';
  if (!d.consentimento) erros.consentimento = 'Para se matricular, é preciso concordar com o uso dos dados.';

  return erros;
}

/* ---------- servidor ---------- */

export type RespostaMatricula =
  | { ok: true; faturaUrl: string; jaExiste?: boolean }
  | {
      ok: false;
      erro: string;
      campos?: ErrosMatricula;
      /** Já existe matrícula ativa ou inadimplente: falar com a academia no WhatsApp. */
      matriculaAtiva?: boolean;
    };

export async function enviarMatricula(d: DadosMatricula): Promise<RespostaMatricula> {
  const menor = ehMenorEscolha(d);
  const payload = {
    plano: d.plano,
    modalidade: planoPorId(d.plano)?.id === 'uma-modalidade' ? d.modalidade : null,
    paraQuem: d.paraQuem,
    nomeAluno: d.nomeAluno.trim(),
    dataNascimento: d.dataNascimento,
    nomeResponsavel: menor ? d.nomeResponsavel.trim() : null,
    cpfPagador: soDigitos(d.cpfPagador),
    emailPagador: d.emailPagador.trim(),
    whatsappPagador: soDigitos(d.whatsappPagador),
    turmas: d.turmas,
    imagemAutorizada: d.imagemAutorizada,
    aceiteTermo: d.aceiteTermo,
    termoVersao: regrasMatricula.termoAdesao.versao,
    consentimento: d.consentimento,
    empresa: d.empresa,
  };

  // O `npm run dev` não executa PHP: simula a resposta do Asaas para testar a tela.
  if (import.meta.env.DEV) {
    console.info('[matricula] envio simulado (dev)', payload);
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, faturaUrl: 'https://sandbox.asaas.com/i/0000000000000' };
  }

  const resposta = await fetch(config.matriculaEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const corpo = (await resposta.json().catch(() => null)) as RespostaMatricula | null;
  if (!corpo) throw new Error(`Resposta inválida (${resposta.status})`);
  return corpo;
}

/* ---------- abrir pela URL ---------- */

/*
 * Os botões "Quero me matricular" são links para #matricula (ou
 * #matricula/<plano>), igual ao agendamento: pode ser compartilhado e, no
 * celular, o "voltar" fecha a janela em vez de sair do site.
 */
const PREFIXO = '#matricula';

export const matriculaHref = (planoId?: PlanoId) => (planoId ? `${PREFIXO}/${planoId}` : PREFIXO);

/** '#matricula/livre' → { planoId: 'livre' }; outra âncora → null. */
export function lerHashMatricula(hash: string): { planoId?: PlanoId } | null {
  if (hash !== PREFIXO && !hash.startsWith(`${PREFIXO}/`)) return null;
  const id = decodeURIComponent(hash.slice(PREFIXO.length + 1));
  return { planoId: planoPorId(id)?.id };
}
