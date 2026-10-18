interface LogoProps {
  className?: string;
  /** 'escuro' = para fundo escuro (padrão do site). */
  versao?: 'escuro' | 'claro';
}

/** Logo oficial. Nunca recriar com texto HTML. */
export function Logo({ className = '', versao = 'escuro' }: LogoProps) {
  return (
    <img
      src={`/brand/academia-scuzziato-${versao}-transparente.svg`}
      alt="Academia Scuzziato"
      // Proporção do SVG (recortado rente às letras); a altura vem do className.
      width={900}
      height={254}
      className={`w-auto ${className}`}
      decoding="async"
    />
  );
}
