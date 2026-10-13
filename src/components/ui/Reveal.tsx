import type { ReactNode } from 'react';
import { m } from 'motion/react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  atraso?: number;
}

/** Entrada discreta ao rolar. Com prefers-reduced-motion, só o fade (MotionConfig no App). */
export function Reveal({ children, className, atraso = 0 }: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: atraso }}
    >
      {children}
    </m.div>
  );
}
