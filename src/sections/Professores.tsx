import { introProfessores, professores } from '../data/professores';
import { turmas } from '../data/turmas';
import type { Professor } from '../data/types';
import { MOSTRAR_RASCUNHOS, SELO_RASCUNHO } from '../lib/rascunho';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconMedalha } from '../components/ui/icons';

const MAX_DESTAQUES = 4;

export function Professores() {
  return (
    <Section id="professores" className="bg-cinza-900/40">
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
    <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-cinza-700 bg-cinza-900">
      {professor.foto ? (
        <img
          src={professor.foto.src}
          alt={professor.foto.alt}
          width={professor.foto.largura}
          height={professor.foto.altura}
          loading="lazy"
          decoding="async"
          className="aspect-4/3 w-full object-cover"
        />
      ) : (
        // Placeholder até chegar a foto.
        <div
          aria-hidden="true"
          className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-cinza-800"
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,var(--color-cinza-700)_18px_19px)] opacity-60" />
          <span className="relative font-display text-8xl font-black text-cinza-700">{iniciais}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3 className="font-display text-4xl leading-none font-black uppercase">{professor.nome}</h3>
        {professor.chamada && (
          <p className="mt-2 font-display text-xl font-extrabold text-vermelho-claro uppercase">{professor.chamada}</p>
        )}

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Graduação e turmas">
          {professor.faixa && (
            <li className="rounded-md border border-cinza-500 bg-preto px-2.5 py-1 text-sm font-semibold text-branco">
              {professor.faixa}
            </li>
          )}
          {suasTurmas.map((t) => (
            <li key={t.id} className="rounded-md bg-cinza-800 px-2.5 py-1 text-sm font-medium text-cinza-200">
              {t.nome}
              {t.nivel && ` · ${t.nivel}`}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-cinza-200">{professor.bio ?? 'Apresentação em breve.'}</p>

        {destaques.length > 0 && (
          <ul className="mt-5 space-y-2.5 border-t border-cinza-700 pt-5" aria-label={`Destaques de ${professor.nome}`}>
            {destaques.map((d) =>
              d.confirmado ? (
                <li key={d.texto} className="flex gap-3 font-semibold">
                  <IconMedalha className="mt-0.5 size-5 shrink-0 text-vermelho-claro" />
                  {d.texto}
                </li>
              ) : (
                <li key={d.texto} className="rounded-lg border-2 border-dashed border-vermelho-claro p-3">
                  <p className="mb-1 text-xs font-bold tracking-[0.12em] text-vermelho-claro uppercase">{SELO_RASCUNHO}</p>
                  <p className="flex gap-3 font-semibold">
                    <IconMedalha className="mt-0.5 size-5 shrink-0 text-vermelho-claro" />
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
