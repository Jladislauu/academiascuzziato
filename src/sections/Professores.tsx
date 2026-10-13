import { professores } from '../data/professores';
import { turmas } from '../data/turmas';
import type { Professor } from '../data/types';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';

export function Professores() {
  return (
    <Section id="professores" className="bg-cinza-900/40">
      <SectionHeading
        id="professores"
        sobretitulo="Professores"
        titulo="Quem vai te treinar"
      />

      <ul className="grid gap-5 sm:grid-cols-2 lg:max-w-4xl">
        {professores.map((professor, i) => (
          <Reveal key={professor.id} atraso={i * 0.08} className="flex">
            <li className="flex w-full">
              <ProfessorCard professor={professor} />
            </li>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

function ProfessorCard({ professor }: { professor: Professor }) {
  const suasTurmas = turmas.filter((t) => t.professor === professor.nome);
  const iniciais = professor.nome
    .split(/\s+/)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('');

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
          className="aspect-[4/3] w-full object-cover object-top sm:aspect-[4/5]"
        />
      ) : (
        // Placeholder até chegar a foto.
        <div
          aria-hidden="true"
          className="relative flex aspect-[4/3] items-center sm:aspect-[4/5] justify-center overflow-hidden bg-cinza-800"
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,var(--color-cinza-700)_18px_19px)] opacity-60" />
          <span className="relative font-display text-8xl font-black text-cinza-700">{iniciais}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-3xl leading-none font-extrabold uppercase">{professor.nome}</h3>
        {professor.faixa && <p className="mt-1 font-semibold text-vermelho-claro">{professor.faixa}</p>}

        {suasTurmas.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {suasTurmas.map((t) => (
              <li key={t.id} className="rounded-md bg-cinza-800 px-2.5 py-1 text-sm font-medium text-cinza-200">
                {t.nome}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-cinza-400">{professor.bio ?? 'Apresentação em breve.'}</p>
      </div>
    </article>
  );
}
