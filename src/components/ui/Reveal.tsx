import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  atraso?: number;
  /** 'li' quando o Reveal é o próprio item de uma lista (<ul>/<ol> só aceitam <li> como filho). */
  as?: 'div' | 'li';
}

/*
 * Entrada discreta ao rolar.
 *
 * O HTML pré-renderizado sai sempre visível (sem opacity 0): quem não executa
 * JavaScript vê tudo. Depois que o React assume a página, só o que está abaixo
 * da dobra é escondido (fora da tela, então não pisca) e aparece ao rolar.
 * Com prefers-reduced-motion, só o fade (classes .reveal-* no index.css).
 *
 * Um único IntersectionObserver para todos os blocos: as posições chegam junto,
 * de forma assíncrona, sem forçar o navegador a recalcular o layout bloco a bloco.
 */

const vistos = new WeakSet<Element>();
let observador: IntersectionObserver | undefined;

function observar(el: Element) {
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const { target, isIntersecting, boundingClientRect } of entradas) {
        if (isIntersecting) {
          // Primeira leitura já na tela: fica como está. Depois: anima a entrada.
          if (target.classList.contains('reveal-pendente')) {
            target.classList.add('reveal-ativo');
            target.classList.remove('reveal-pendente');
          }
          observador!.unobserve(target);
        } else if (!vistos.has(target) && boundingClientRect.top >= window.innerHeight) {
          target.classList.add('reveal-pendente'); // abaixo da dobra: esconde até rolar
        }
        vistos.add(target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  observador.observe(el);
}

export function Reveal({ children, className, atraso = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    observar(el);
    return () => observador?.unobserve(el);
  }, []);

  const style = atraso ? ({ '--atraso': `${atraso}s` } as CSSProperties) : undefined;
  return createElement(as, { ref, className, style }, children);
}
