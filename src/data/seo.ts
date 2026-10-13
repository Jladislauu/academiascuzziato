import type { Seo } from './types';

/*
 * Textos para Google e compartilhamento. Viram as tags do <head> no build
 * (plugins/seo.ts), junto com o schema.org montado a partir de config.ts.
 */
export const seo: Seo = {
  titulo: 'Jiu-jitsu e judô em Pinhais | Arena Pinhais',
  descricao:
    'Academia de luta em Pinhais-PR com jiu-jitsu e judô para adultos e crianças, do iniciante ao competidor. Primeira semana de treino grátis.',
  compartilhamento: {
    titulo: 'Arena Pinhais | Primeira semana de treino grátis',
    descricao: 'Jiu-jitsu e judô em Pinhais-PR, para adultos e crianças. Agende sua aula experimental.',
    imagem: '/og-image.png',
    imagemAlt: 'Logo da Arena Pinhais com a chamada "Primeira semana grátis"',
  },
};
