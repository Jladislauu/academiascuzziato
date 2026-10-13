import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { Header } from './components/layout/Header';
import { WhatsAppFloat } from './components/layout/WhatsAppFloat';
import { Grade } from './sections/Grade';
import { Hero } from './sections/Hero';
import { Planos } from './sections/Planos';

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-branco focus:px-4 focus:py-2 focus:font-semibold focus:text-preto"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo" className="pb-24">
          <Hero />
          <Grade />
          <Planos />
        </main>
        <WhatsAppFloat />
      </MotionConfig>
    </LazyMotion>
  );
}
