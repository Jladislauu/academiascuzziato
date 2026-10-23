import { trackAgendamentoIniciado } from '../lib/analytics';
import { agendaLink } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section } from '../components/ui/Section';
import { IconCalendario } from '../components/ui/icons';
import { FaixaDiagonal } from '../components/ui/efeitos';

/** Faixa curta antes do rodapé: repete a mensagem central (primeira semana grátis). */
export function ChamadaFinal() {
  return (
    <Section
      id="chamada-final"
      tom="vermelho"
      compacta
      granulado
      decoracao={
        <>
          <FaixaDiagonal className="-right-16 bg-vermelho-escuro/70 lg:right-[8%]" />
          <FaixaDiagonal fina className="right-28 bg-vermelho-escuro/60 lg:right-[calc(8%+14rem)]" />
        </>
      }
    >
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="chamada-final-titulo" className="font-display text-5xl leading-[0.95] font-black uppercase md:text-6xl">
            Treine a primeira semana grátis
          </h2>
          <p className="mt-2 text-lg">Agende a aula experimental e venha treinar com a gente.</p>
        </div>
        <ButtonLink
          href={agendaLink()}
          tamanho="lg"
          className="shrink-0"
          icone={<IconCalendario className="size-6" />}
          onClick={() => trackAgendamentoIniciado('chamada-final')}
        >
          Agendar aula experimental
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
