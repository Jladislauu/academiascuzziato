import { planos } from '../data/planos';
import type { Plano } from '../data/types';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { preco } from '../lib/format';
import { agendaLink, linkExterno, matriculaLink } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconCheck, IconSeta } from '../components/ui/icons';

export function Planos() {
  return (
    <Section id="planos">
      <SectionHeading
        id="planos"
        sobretitulo="Planos"
        titulo="Simples assim"
        descricao="Dois planos, sem complicação. E você só decide depois de treinar a primeira semana grátis."
      />

      <div className="grid gap-5 md:grid-cols-2 lg:max-w-4xl">
        {planos.map((plano, i) => (
          <Reveal key={plano.id} atraso={i * 0.08} className="flex">
            <PlanoCard plano={plano} />
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-lg text-cinza-200">Ainda em dúvida? Treine primeiro, decida depois.</p>
        <a
          href={agendaLink()}
          {...linkExterno}
          onClick={() => trackAgendamentoIniciado('planos')}
          className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-vermelho-claro uppercase hover:text-branco"
        >
          Agendar aula experimental <IconSeta className="size-5" />
        </a>
      </Reveal>
    </Section>
  );
}

function PlanoCard({ plano }: { plano: Plano }) {
  const destaque = plano.recomendado;

  return (
    <article
      aria-labelledby={`plano-${plano.id}`}
      className={`relative flex w-full flex-col rounded-2xl border-2 p-6 md:p-8 ${
        destaque ? 'border-vermelho bg-cinza-800' : 'border-cinza-700 bg-cinza-900'
      }`}
    >
      {destaque && (
        <p className="absolute -top-3.5 left-6 rounded-md bg-vermelho px-3 py-1 text-sm font-bold tracking-[0.12em] text-branco uppercase md:left-8">
          Recomendado
        </p>
      )}

      <h3 id={`plano-${plano.id}`} className="font-display text-3xl font-extrabold uppercase">
        {plano.nome}
      </h3>
      <p className="mt-1 text-cinza-400">{plano.descricao}</p>

      <p className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-7xl leading-none font-black">{preco(plano.precoMensal)}</span>
        <span className="text-lg font-medium text-cinza-400">/mês</span>
      </p>

      {plano.chamada && <p className="mt-3 text-lg font-semibold text-vermelho-claro">{plano.chamada}</p>}

      <ul className="mt-6 space-y-3 border-t border-cinza-700 pt-6">
        {plano.inclui.map((item) => (
          <li key={item} className="flex gap-3 text-cinza-200">
            <IconCheck className="mt-0.5 size-5 shrink-0 text-vermelho-claro" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        <ButtonLink
          href={matriculaLink(plano)}
          {...linkExterno}
          variante={destaque ? 'primario' : 'secundario'}
          tamanho="lg"
          className="w-full"
          aria-label={`Quero me matricular no plano ${plano.nome}`}
        >
          Quero me matricular
        </ButtonLink>
      </div>
    </article>
  );
}
