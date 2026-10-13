import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'motion/react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  atraso?: number;
  /** 'li' quando o Reveal é o próprio item de uma lista (<ul>/<ol> só aceitam <li> como filho). */
  as?: 'div' | 'li';
}

/** Entrada discreta ao rolar. Com prefers-reduced-motion, só o fade (sem deslocamento). */
export function Reveal({ children, className, atraso = 0, as = 'div' }: RevealProps) {
  const reduzir = useReducedMotion();
  const Elemento = as === 'li' ? m.li : m.div;
  return (
    <Elemento
      className={className}
      initial={{ opacity: 0, y: reduzir ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: atraso }}
    >
      {children}
    </Elemento>
  );
}
