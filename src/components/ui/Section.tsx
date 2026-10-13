import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

export function Container({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

interface SectionProps {
  id: string;
  className?: string;
  children: ReactNode;
}

/** Seção da página com âncora (scroll-mt compensa o cabeçalho fixo). */
export function Section({ id, className = '', children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={`scroll-mt-16 py-20 md:py-28 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

interface SectionHeadingProps {
  id: string;
  sobretitulo: string;
  titulo: ReactNode;
  descricao?: ReactNode;
}

export function SectionHeading({ id, sobretitulo, titulo, descricao }: SectionHeadingProps) {
  return (
    <Reveal className="mb-10 max-w-2xl md:mb-14">
      <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-vermelho-claro uppercase">{sobretitulo}</p>
      <h2
        id={`${id}-titulo`}
        className="font-display text-5xl leading-[0.95] font-black uppercase md:text-7xl"
      >
        {titulo}
      </h2>
      {descricao && <p className="mt-4 text-lg text-cinza-400">{descricao}</p>}
    </Reveal>
  );
}
