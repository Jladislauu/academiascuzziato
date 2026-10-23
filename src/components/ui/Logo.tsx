import logoClaro from '../../assets/marca/academia-scuzziato-claro-transparente.svg';
import logoEscuro from '../../assets/marca/academia-scuzziato-escuro-transparente.svg';

interface LogoProps {
  className?: string;
  /** 'escuro' = para fundo escuro (padrão do site). */
  versao?: 'escuro' | 'claro';
}

/*
 * Os SVGs ficam em src/assets (não em public/) para o build dar a eles um nome
 * com hash (ex.: /assets/academia-scuzziato-escuro-transparente-a1b2c3.svg).
 * Trocou o logo, muda o nome: nenhum navegador ou CDN fica com o antigo em cache.
 */
const ARQUIVOS = { escuro: logoEscuro, claro: logoClaro };

/** Logo oficial. Nunca recriar com texto HTML. */
export function Logo({ className = '', versao = 'escuro' }: LogoProps) {
  return (
    <img
      src={ARQUIVOS[versao]}
      alt="Academia Scuzziato"
      // Proporção do SVG (ícone + nome, recortado rente); a altura vem do className.
      width={1095}
      height={326}
      className={`w-auto ${className}`}
      decoding="async"
    />
  );
}
