import type { AnchorHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario';
type Tamanho = 'md' | 'lg';

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-display font-extrabold uppercase tracking-wide transition-colors duration-150 select-none';

const variantes: Record<Variante, string> = {
  primario: 'bg-vermelho text-branco hover:bg-vermelho-escuro active:bg-vermelho-escuro',
  secundario: 'border-2 border-cinza-500 text-branco hover:border-branco hover:bg-cinza-800',
};

const tamanhos: Record<Tamanho, string> = {
  md: 'min-h-11 px-5 text-lg',
  lg: 'min-h-14 px-7 text-xl',
};

/** Botão que é um link (todas as ações do site levam para algum lugar). */
export function ButtonLink({
  variante = 'primario',
  tamanho = 'md',
  icone,
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a className={`${base} ${variantes[variante]} ${tamanhos[tamanho]} ${className}`} {...props}>
      {icone}
      {children}
    </a>
  );
}
