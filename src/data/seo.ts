import type { Seo } from './types';

/*
 * Textos para Google e compartilhamento. Viram as tags do <head> no build
 * (plugins/seo.ts), junto com o schema.org montado a partir de config.ts.
 */
export const seo: Seo = {
  titulo: 'Academia Scuzziato | Jiu-Jitsu, Judô e Muay Thai em Pinhais-PR',
  descricao:
    'Academia de luta em Pinhais-PR: jiu-jitsu e judô para adultos e crianças, jiu-jitsu feminino e muay thai. Primeira semana de treino grátis.',
  compartilhamento: {
    titulo: 'Academia Scuzziato | Primeira semana de treino grátis',
    descricao: 'Jiu-jitsu, judô e muay thai em Pinhais-PR, para adultos e crianças. Agende sua aula experimental.',
    imagem: '/og-image.png?v=2',
    imagemAlt: 'Logo da Academia Scuzziato com a chamada "Primeira semana grátis"',
  },
};
