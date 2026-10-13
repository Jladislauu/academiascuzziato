interface LogoProps {
  className?: string;
  /** 'escuro' = para fundo escuro (padrão do site). */
  versao?: 'escuro' | 'claro';
}

/** Logo oficial. Nunca recriar com texto HTML. */
export function Logo({ className = '', versao = 'escuro' }: LogoProps) {
  return (
    <img
      src={`/brand/arena-pinhais-${versao}-transparente.svg`}
      alt="Arena Pinhais"
      className={`w-auto ${className}`}
      decoding="async"
    />
  );
}
