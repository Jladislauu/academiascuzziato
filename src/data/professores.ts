import type { Professor } from './types';

/*
 * Professores. As turmas de cada um aparecem no card a partir de turmas.ts
 * (pelo nome), então não precisa repetir aqui.
 *
 * Fontes: reportagens do Jiu-Jitsu Brasil (mar–mai/2026) e da Banda B.
 * Não citar outras equipes, mestres ou professores de fora da Arena (marca
 * independente; decisão pendente). Nada de vida pessoal além do que está aqui.
 * Não citar a idade atual do Camilo, só "começou aos 56 anos".
 *
 * Destaques: no máximo 4 por professor. Se um dia precisar de um destaque ainda
 * não confirmado, use confirmado: false com o texto dentro de
 * `import.meta.env.DEV ? '...' : ''` (mesmo esquema do FAQ: só aparece no `npm run dev`).
 *
 * Foto: WebP em public/fotos/professores/, retrato 4:5. Exemplo:
 *   foto: { src: '/fotos/professores/rhaue.webp', alt: 'Professor Rhaue Scuzziato', largura: 800, altura: 1000 },
 */

/** Frase de abertura da seção Professores. */
export const introProfessores =
  'Pai e filho, dois faixas pretas: um forma atletas para competir, o outro é a prova de que nunca é tarde para começar.';

export const professores: Professor[] = [
  {
    id: 'rhaue',
    nome: 'Rhaue Scuzziato',
    faixa: 'Faixa preta de jiu-jitsu',
    chamada: 'Para quem quer competir',
    bio: 'Curitibano, o Rhaue é competidor ativo na divisão master da IBJJF e, em 2026, já subiu ao pódio no Floripa Fall International Open e no Curitiba Internacional. Se você já treina e quer competir, é com ele na turma de No-Gi avançado. Foi ele quem levou o pai para o jiu-jitsu e foi o professor dele no caminho até a faixa preta.',
    destaques: [
      { texto: 'Ouro no Floripa Fall International Open IBJJF 2026', confirmado: true },
      { texto: 'Ouro no No-Gi — Curitiba Internacional 2026', confirmado: true },
      { texto: 'Prata no No-Gi absoluto — Curitiba Internacional 2026', confirmado: true },
      { texto: 'Prata no kimono — Curitiba Internacional 2026', confirmado: true },
    ],
    foto: null, // TODO: foto
  },
  {
    id: 'camilo',
    nome: 'Camilo Scuzziato',
    faixa: 'Faixa preta de jiu-jitsu',
    chamada: 'Nunca é tarde para começar',
    bio: 'O Camilo começou a treinar aos 56 anos, por saúde e qualidade de vida, incentivado pelo filho. Foi campeão brasileiro nas faixas azul, roxa e marrom e recebeu a faixa preta no pódio do Campeonato Brasileiro de 2026. Na turma de jiu-jitsu com kimono, ele é o professor que entende quem está começando, porque também começou tarde.',
    destaques: [
      { texto: 'Começou a treinar aos 56 anos', confirmado: true },
      { texto: 'Campeão brasileiro faixa azul (2023)', confirmado: true },
      { texto: 'Campeão brasileiro faixa roxa (2025)', confirmado: true },
      { texto: 'Campeão brasileiro faixa marrom (2026)', confirmado: true },
    ],
    foto: null, // TODO: foto
  },
];
