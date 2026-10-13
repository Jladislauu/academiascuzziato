import { introProfessores, professores } from '../data/professores';
import { turmas } from '../data/turmas';
import type { Professor } from '../data/types';
import { MOSTRAR_RASCUNHOS, SELO_RASCUNHO } from '../lib/rascunho';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconMedalha } from '../components/ui/icons';
import { FaixaDiagonal } from '../components/ui/efeitos';

const MAX_DESTAQUES = 4;

export function Professores() {
  return (
    <Section id="professores" corte>
      <SectionHeading
        id="professores"
        sobretitulo="Professores"
        titulo="Quem vai te treinar"
        descricao={introProfessores}
      />

      <ul className="grid gap-5 md:grid-cols-2 lg:max-w-5xl">
        {professores.map((professor, i) => (
          <Reveal as="li" key={professor.id} atraso={i * 0.08} className="flex">
            <ProfessorCard professor={professor} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

function ProfessorCard({ professor }: { professor: Professor }) {
  const suasTurmas = turmas.filter((t) => t.professor === professor.nome);
  const destaques = professor.destaques.filter((d) => d.confirmado || MOSTRAR_RASCUNHOS);
  const iniciais = professor.nome
    .split(/\s+/)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('');

  if (import.meta.env.DEV && professor.destaques.length > MAX_DESTAQUES) {
    console.warn(`[professores] ${professor.nome} tem mais de ${MAX_DESTAQUES} destaques.`);
  }

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-tom-borda bg-tom-card">
      {/* Foto 4:5: faixa vermelha atrás da pessoa (foto sem fundo), gradiente do preto na base e nome por cima */}
      <div className="relative aspect-4/5 overflow-hidden bg-preto">
        <div aria-hidden="true" className="absolute inset-0">
          <FaixaDiagonal className="right-[4%] bg-vermelho" />
          <FaixaDiagonal fina className="right-[calc(4%+11rem)] bg-vermelho/60 sm:right-[calc(4%+15rem)]" />
        </div>

        {professor.foto ? (
          <img
            src={professor.foto.src}
            alt={professor.foto.alt}
            width={professor.foto.largura}
            height={professor.foto.altura}
            loading="lazy"
            decoding="async"
            className="relative size-full object-cover"
          />
        ) : (
          // Placeholder até chegar a foto.
          <span
            aria-hidden="true"
            className="texto-vazado relative flex size-full items-center justify-center font-display text-9xl font-black"
          >
            {iniciais}
          </span>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-tom-card from-15% via-tom-card/75 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
          <h3 className="font-display text-4xl leading-none font-black uppercase md:text-5xl">{professor.nome}</h3>
          {professor.chamada && (
            <p className="mt-2 font-display text-xl font-extrabold text-tom-destaque uppercase">{professor.chamada}</p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 md:px-7 md:pb-7">
        <ul className="flex flex-wrap gap-1.5" aria-label="Graduação e turmas">
          {professor.faixa && (
            <li className="rounded-md border border-tom-borda-forte bg-tom-fundo px-2.5 py-1 text-sm font-semibold">
              {professor.faixa}
            </li>
          )}
          {suasTurmas.map((t) => (
            <li key={t.id} className="rounded-md bg-tom-chip px-2.5 py-1 text-sm font-medium text-tom-chip-texto">
              {t.nome}
              {t.nivel && ` · ${t.nivel}`}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-tom-apoio">{professor.bio ?? 'Apresentação em breve.'}</p>

        {destaques.length > 0 && (
          <ul className="mt-5 space-y-2.5 border-t border-tom-borda pt-5" aria-label={`Destaques de ${professor.nome}`}>
            {destaques.map((d) =>
              d.confirmado ? (
                <li key={d.texto} className="flex gap-3 font-semibold">
                  <IconMedalha className="mt-0.5 size-5 shrink-0 text-tom-destaque" />
                  {d.texto}
                </li>
              ) : (
                <li key={d.texto} className="rounded-lg border-2 border-dashed border-tom-destaque p-3">
                  <p className="mb-1 text-xs font-bold tracking-[0.12em] text-tom-destaque uppercase">{SELO_RASCUNHO}</p>
                  <p className="flex gap-3 font-semibold">
                    <IconMedalha className="mt-0.5 size-5 shrink-0 text-tom-destaque" />
                    {d.texto}
                  </p>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </article>
  );
}
