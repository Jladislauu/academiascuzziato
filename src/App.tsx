import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { WhatsAppFloat } from './components/layout/WhatsAppFloat';
import { ComoFunciona } from './sections/ComoFunciona';
import { Faq } from './sections/Faq';
import { Grade } from './sections/Grade';
import { Hero } from './sections/Hero';
import { Localizacao } from './sections/Localizacao';
import { Modalidades } from './sections/Modalidades';
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
        <main id="conteudo">
          <Hero />
          <ComoFunciona />
          <Modalidades />
          <Grade />
          {/* Fase 3: Turmas em formação, Professores */}
          <Planos />
          {/* Fase 3: Estrutura */}
          <Faq />
          <Localizacao />
        </main>
        <Footer />
        <WhatsAppFloat />
      </MotionConfig>
    </LazyMotion>
  );
}
