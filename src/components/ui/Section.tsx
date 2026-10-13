import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

export type Tom = 'escuro' | 'grafite' | 'claro' | 'gelo' | 'vermelho';

export function Container({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

interface SectionProps {
  id: string;
  /** Tom da seção (tokens em index.css). Textos, botões e chips de dentro se adaptam. */
  tom?: Tom;
  /** Borda de cima em diagonal, subindo sobre a seção anterior. Usar em poucas transições. */
  corte?: boolean;
  granulado?: boolean;
  /** Menos espaço em cima e embaixo (faixas curtas de chamada). */
  compacta?: boolean;
  /** Efeitos de fundo (componentes de efeitos.tsx). Ficam atrás do conteúdo e escondidos do leitor de tela. */
  decoracao?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Seção da página com âncora (scroll-mt compensa o cabeçalho fixo). */
export function Section({
  id,
  tom = 'escuro',
  corte = false,
  granulado = false,
  compacta = false,
  decoracao,
  className = '',
  children,
}: SectionProps) {
  const espaco = corte
    ? 'corte-topo pt-[calc(var(--corte)+5rem)] pb-20 md:pt-[calc(var(--corte)+7rem)] md:pb-28'
    : compacta
      ? 'py-14 md:py-16'
      : 'py-20 md:py-28';

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`tom-${tom} relative isolate scroll-mt-16 overflow-hidden bg-tom-fundo text-tom-texto ${espaco} ${className}`}
    >
      {(decoracao || granulado) && (
        // O contêiner tem a cor do tom: o -z-10 cria um contexto próprio, e é com
        // este fundo que os efeitos se misturam (multiply das fotos, overlay do granulado).
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-tom-fundo">
          {decoracao}
          {granulado && <div className="granulado absolute inset-0" />}
        </div>
      )}
      <Container>{children}</Container>
    </section>
  );
}

interface SectionHeadingProps {
  id: string;
  sobretitulo: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  className?: string;
}

export function SectionHeading({ id, sobretitulo, titulo, descricao, className = 'mb-10 md:mb-14' }: SectionHeadingProps) {
  return (
    <Reveal className={`max-w-2xl ${className}`}>
      <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-tom-destaque uppercase">{sobretitulo}</p>
      <h2
        id={`${id}-titulo`}
        className="font-display text-5xl leading-[0.95] font-black wrap-break-word uppercase md:text-7xl"
      >
        {titulo}
      </h2>
      {descricao && <p className="mt-4 text-lg text-tom-suave">{descricao}</p>}
    </Reveal>
  );
}
