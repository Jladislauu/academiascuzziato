import { m } from 'motion/react';
import { config } from '../data/config';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { agendaLink, linkExterno } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Container } from '../components/ui/Section';
import { IconCalendario, IconCheck } from '../components/ui/icons';

const destaques = [
  'Do iniciante ao competidor',
  'Turmas infantis e adultas',
  `Até ${config.vagasPorAula} vagas por aula experimental`,
];

const entrada = (atraso: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut', delay: atraso },
}) as const;

export function Hero() {
  return (
    <section id="topo" aria-labelledby="topo-titulo" className="relative isolate overflow-hidden">
      {/* Fundo: grade de quadra + faixa diagonal vermelha */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-cinza-900)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-cinza-900)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_70%_30%,black_20%,transparent_75%)]" />
        {/* No celular a faixa fica atrás do texto, então é bem mais fraca (contraste do parágrafo). */}
        <div className="absolute -top-[20%] -right-20 h-[140%] w-36 rotate-[20deg] bg-vermelho/25 sm:w-52 lg:right-[6%] lg:bg-vermelho/90" />
        <div className="absolute -top-[20%] right-24 h-[140%] w-2 rotate-[20deg] bg-vermelho/20 sm:right-40 lg:right-[calc(6%+15rem)] lg:w-3 lg:bg-vermelho/50" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-preto to-transparent" />
      </div>

      <Container className="flex min-h-[100svh] flex-col justify-center pt-28 pb-16 md:pt-32">
        <m.p
          {...entrada(0)}
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cinza-700 bg-preto/70 px-4 py-1.5 text-sm font-semibold tracking-[0.14em] text-cinza-200 uppercase"
        >
          <span className="size-2 rounded-full bg-vermelho" aria-hidden="true" />
          Jiu-jitsu e judô em Pinhais-PR
        </m.p>

        <m.h1
          {...entrada(0.08)}
          id="topo-titulo"
          className="font-display text-[clamp(3.75rem,17vw,9.5rem)] leading-[0.85] font-black uppercase"
        >
          Primeira semana <span className="text-vermelho">grátis</span>
        </m.h1>

        <m.p {...entrada(0.16)} className="mt-6 max-w-xl text-lg text-cinza-200 md:text-xl">
          Treine uma semana inteira antes de se matricular. Para quem quer competir, para quem só quer
          treinar e para quem nunca pisou num tatame.
        </m.p>

        <m.div {...entrada(0.24)} className="mt-9 flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={agendaLink()}
            {...linkExterno}
            tamanho="lg"
            icone={<IconCalendario className="size-6" />}
            onClick={() => trackAgendamentoIniciado('topo')}
          >
            Agendar aula experimental
          </ButtonLink>
          <ButtonLink href="#horarios" variante="secundario" tamanho="lg" className="bg-preto/60">
            Ver horários
          </ButtonLink>
        </m.div>

        <m.ul {...entrada(0.32)} className="mt-10 grid gap-3 text-cinza-200 sm:flex sm:flex-wrap sm:gap-x-8">
          {destaques.map((item) => (
            <li key={item} className="flex items-center gap-2 font-medium">
              <IconCheck className="size-5 shrink-0 text-vermelho-claro" />
              {item}
            </li>
          ))}
        </m.ul>
      </Container>
    </section>
  );
}
