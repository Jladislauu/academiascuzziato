import type { Config, Dia, DiaSemana } from '../data/types';

const ORDEM: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

const DIAS: Record<DiaSemana, { curto: string; longo: string }> = {
  seg: { curto: 'Seg', longo: 'segunda' },
  ter: { curto: 'Ter', longo: 'terça' },
  qua: { curto: 'Qua', longo: 'quarta' },
  qui: { curto: 'Qui', longo: 'quinta' },
  sex: { curto: 'Sex', longo: 'sexta' },
  sab: { curto: 'Sáb', longo: 'sábado' },
  dom: { curto: 'Dom', longo: 'domingo' },
};

export const diaCurto = (dia: Dia) => DIAS[dia].curto;

/** ['ter', 'qua', 'qui'] → "terça, quarta e quinta" */
export function diasPorExtenso(dias: DiaSemana[]): string {
  const nomes = dias.map((d) => DIAS[d].longo);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : (nomes[0] ?? '');
}

/** "21:00" → "21h", "21:30" → "21h30" */
export function hora(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return m && m !== '00' ? `${Number(h)}h${m}` : `${Number(h)}h`;
}

/** "21:00", "22:00" → "21h–22h" */
export const faixaHorario = (inicio: string, fim: string) => `${hora(inicio)}–${hora(fim)}`;

/** Funcionamento → "Segunda a sexta, 8h às 23h" (dias seguidos viram intervalo). */
export function funcionamentoTexto({ dias, abre, fecha }: Config['funcionamento']): string {
  const ordenados = ORDEM.filter((d) => dias.includes(d));
  const indices = ordenados.map((d) => ORDEM.indexOf(d));
  const seguidos = indices.every((n, i) => i === 0 || n === indices[i - 1] + 1);

  const texto =
    seguidos && ordenados.length > 2
      ? `${DIAS[ordenados[0]].longo} a ${DIAS[ordenados.at(-1)!].longo}`
      : diasPorExtenso(ordenados);

  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}, ${hora(abre)} às ${hora(fecha)}`;
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** 120 → "R$ 120" */
export const preco = (valor: number) => brl.format(valor);
