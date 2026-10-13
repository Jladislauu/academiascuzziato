import type { Professor } from './types';

/*
 * Professores. As turmas de cada um aparecem no card a partir de turmas.ts
 * (pelo nome), então não precisa repetir aqui.
 *
 * Foto: WebP em public/fotos/professores/, retrato 4:5. Exemplo:
 *   foto: { src: '/fotos/professores/rhaue.webp', alt: 'Professor Rhaue Scuzziato', largura: 800, altura: 1000 },
 */
export const professores: Professor[] = [
  {
    id: 'rhaue',
    nome: 'Rhaue Scuzziato',
    faixa: null, // TODO: graduação
    bio: null, // TODO: texto de apresentação
    foto: null, // TODO: foto
  },
  {
    id: 'camilo',
    nome: 'Camilo Scuzziato',
    faixa: null, // TODO: graduação
    bio: null, // TODO: texto de apresentação
    foto: null, // TODO: foto
  },
];
