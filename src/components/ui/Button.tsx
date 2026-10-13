import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario';
type Tamanho = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg text-center font-display font-extrabold uppercase tracking-wide transition-colors duration-150 select-none';

/* Cores vêm do tom da seção (index.css): vermelho no escuro e no claro, branco no vermelho. */
const variantes: Record<Variante, string> = {
  primario: 'bg-tom-botao text-tom-botao-texto hover:bg-tom-botao-hover active:bg-tom-botao-hover',
  secundario: 'border-2 border-tom-borda-forte text-tom-texto hover:border-tom-texto hover:bg-tom-card-forte',
};

const tamanhos: Record<Tamanho, string> = {
  md: 'min-h-11 px-5 text-lg',
  lg: 'min-h-14 px-7 text-xl',
};

export const classesBotao = (variante: Variante = 'primario', tamanho: Tamanho = 'md') =>
  `${base} ${variantes[variante]} ${tamanhos[tamanho]}`;

interface Comum {
  variante?: Variante;
  tamanho?: Tamanho;
  icone?: ReactNode;
}

/** Botão que é um link (a maioria das ações do site leva para algum lugar). */
export function ButtonLink({
  variante,
  tamanho,
  icone,
  className = '',
  children,
  ...props
}: Comum & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`${classesBotao(variante, tamanho)} ${className}`} {...props}>
      {icone}
      {children}
    </a>
  );
}

/** Botão de verdade (formulário). */
export function Botao({
  variante,
  tamanho,
  icone,
  className = '',
  children,
  type = 'button',
  ...props
}: Comum & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`${classesBotao(variante, tamanho)} disabled:cursor-wait disabled:opacity-70 ${className}`} {...props}>
      {icone}
      {children}
    </button>
  );
}
