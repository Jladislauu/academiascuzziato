/*
 * Efeitos de fundo das seções. É o sistema inteiro: nada além destes motivos.
 *   FaixaDiagonal   a faixa vermelha do topo (mesmo ângulo em todo o site)
 *   LinhasQuadra    linhas de quadra/tatame, bem sutis
 *   TextoGigante    tipografia gigante vazada (só contorno)
 *   granulado       textura leve: prop `granulado` da Section
 * São decorativos: o contêiner na Section já tem aria-hidden.
 */

/** Ângulo da faixa do topo, usado em todas as faixas. */
export const ANGULO_FAIXA = 'rotate-[20deg]';

interface FaixaProps {
  className?: string;
  /** Faixa fina que acompanha a principal. */
  fina?: boolean;
}

export function FaixaDiagonal({ className = '', fina = false }: FaixaProps) {
  return (
    <div
      className={`absolute top-[-20%] h-[140%] ${ANGULO_FAIXA} ${fina ? 'w-2 lg:w-3' : 'w-36 sm:w-52'} ${className}`}
    />
  );
}

/** Linhas de quadra: meio-campo, círculo central e as duas áreas. */
export function LinhasQuadra({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 size-full ${className}`}
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="var(--tom-linha)"
      strokeWidth="2"
    >
      <rect x="40" y="40" width="1120" height="620" />
      <line x1="600" y1="40" x2="600" y2="660" />
      <circle cx="600" cy="350" r="110" />
      <circle cx="600" cy="350" r="6" fill="var(--tom-linha)" />
      <rect x="40" y="190" width="170" height="320" />
      <rect x="990" y="190" width="170" height="320" />
    </svg>
  );
}

export function TextoGigante({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`texto-vazado pointer-events-none absolute font-display leading-none font-black whitespace-nowrap uppercase select-none ${className}`}
    >
      {texto}
    </span>
  );
}
