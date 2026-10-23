import { useEffect } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { Agendamento } from './components/agendamento/Agendamento';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { WhatsAppFloat } from './components/layout/WhatsAppFloat';
import { ComoFunciona } from './sections/ComoFunciona';
import { EmFormacao } from './sections/EmFormacao';
import { Estrutura } from './sections/Estrutura';
import { Faq } from './sections/Faq';
import { Grade } from './sections/Grade';
import { Hero } from './sections/Hero';
import { Localizacao } from './sections/Localizacao';
import { Modalidades } from './sections/Modalidades';
import { ChamadaFinal } from './sections/ChamadaFinal';
import { Planos } from './sections/Planos';
import { Professores } from './sections/Professores';

export default function App() {
  // Links com âncora vindos de fora (ex.: ...#em-formacao): a seção só existe
  // depois que o React monta, então o navegador não rola sozinho.
  // (#agendar não é seção: abre a janela de agendamento, ver components/agendamento.)
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, []);

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
          <EmFormacao />
          <Professores />
          <Planos />
          <Estrutura />
          <Faq />
          <Localizacao />
          <ChamadaFinal />
        </main>
        <Footer />
        <WhatsAppFloat />
        <Agendamento />
      </MotionConfig>
    </LazyMotion>
  );
}
