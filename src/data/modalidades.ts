import type { ModalidadeInfo } from './types';

/*
 * Cards da seção Modalidades. Os nomes também são usados nos filtros da grade.
 * `equipe` é o nome da equipe da modalidade ("Scuzziato Team" + modalidade), subtítulo do card.
 *
 * Fotos: WebP 960x640 (3:2) em public/fotos/modalidades/. Fotos de banco gratuito,
 * licença que permite uso comercial sem crédito obrigatório (créditos abaixo
 * para registro). Escolhidas sem logos de marcas ou de outras academias.
 *   jiu-jitsu  Joshua Jamias (Unsplash)              https://unsplash.com/photos/qmdqe3Cs5Og
 *   judo       Juan Idier Alba Enriquez (Pexels)     https://www.pexels.com/photo/4392782/
 *   muay-thai  Boris Izmaylov (Unsplash)             https://unsplash.com/photos/pMhvvnCGv5E
 *   boxe       Ron Lach (Pexels)                     https://www.pexels.com/photo/8736743/
 * Quando houver fotos da própria academia, é só trocar o arquivo e o alt.
 */
export const modalidades: ModalidadeInfo[] = [
  {
    id: 'jiu-jitsu',
    nome: 'Jiu-Jitsu',
    equipe: 'Scuzziato Team Jiu-Jitsu',
    descricao: 'Com kimono (GI) e sem kimono (No-Gi).',
    publicos: ['Infantil', 'Juvenil/Adulto'],
    niveis: ['Iniciante', 'Intermediário', 'Avançado'],
    emFormacao: false,
    foto: {
      src: '/fotos/modalidades/jiu-jitsu.webp',
      alt: 'Dois atletas de kimono treinando jiu-jitsu no tatame',
      largura: 960,
      altura: 640,
    },
  },
  {
    id: 'judo',
    nome: 'Judô',
    equipe: 'Scuzziato Team Judô',
    descricao: 'Turmas para adultos e crianças.',
    publicos: ['Infantil', 'Adulto'],
    niveis: [], // TODO: níveis do judô
    emFormacao: false,
    foto: {
      src: '/fotos/modalidades/judo.webp',
      alt: 'Judocas de judogi azul e branco no meio de uma projeção',
      largura: 960,
      altura: 640,
    },
  },
  {
    id: 'muay-thai',
    nome: 'Muay Thai',
    equipe: 'Scuzziato Team Muay Thai',
    descricao: 'Estamos montando as turmas. Quer treinar? Avise a gente.',
    publicos: ['Infantil', 'Adulto'],
    niveis: [],
    emFormacao: true,
    foto: {
      src: '/fotos/modalidades/muay-thai.webp',
      alt: 'Lutador com bandagens nas mãos em guarda no ringue',
      largura: 960,
      altura: 640,
    },
  },
  {
    id: 'boxe',
    nome: 'Boxe',
    equipe: 'Scuzziato Team Boxe',
    descricao: 'Estamos montando as turmas. Quer treinar? Avise a gente.',
    publicos: ['Infantil', 'Adulto'],
    niveis: [],
    emFormacao: true,
    foto: {
      src: '/fotos/modalidades/boxe.webp',
      alt: 'Silhueta de uma pessoa treinando no saco de pancada em uma academia de boxe',
      largura: 960,
      altura: 640,
    },
  },
];

export function nomeModalidade(id: ModalidadeInfo['id']): string {
  return modalidades.find((m) => m.id === id)?.nome ?? id;
}
