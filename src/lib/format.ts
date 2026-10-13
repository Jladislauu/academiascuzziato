import type { Dia } from '../data/types';

const DIAS: Record<Dia, { curto: string; longo: string }> = {
  seg: { curto: 'Seg', longo: 'segunda' },
  ter: { curto: 'Ter', longo: 'terça' },
  qua: { curto: 'Qua', longo: 'quarta' },
  qui: { curto: 'Qui', longo: 'quinta' },
  sex: { curto: 'Sex', longo: 'sexta' },
};

export const diaCurto = (dia: Dia) => DIAS[dia].curto;

/** ['ter', 'qua', 'qui'] → "terça, quarta e quinta" */
export function diasPorExtenso(dias: Dia[]): string {
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

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** 120 → "R$ 120" */
export const preco = (valor: number) => brl.format(valor);
