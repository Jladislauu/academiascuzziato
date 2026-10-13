import { config } from '../data/config';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { agendaLink, conviteAmigoLink, linkExterno } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconCalendario, IconWhatsApp } from '../components/ui/icons';

const passos = [
  {
    titulo: 'Agende',
    texto: `Escolha a turma na grade e reserve sua vaga na aula experimental. São até ${config.vagasPorAula} vagas por aula.`,
  },
  {
    titulo: 'Treine a semana',
    texto: 'Venha treinar com a gente durante a primeira semana, sem pagar nada.',
  },
  {
    titulo: 'Decida',
    texto: 'Gostou? Escolha seu plano e faça a matrícula. Se não for para você, tudo bem: sem compromisso.',
  },
];

export function ComoFunciona() {
  return (
    <Section id="como-funciona" className="bg-cinza-900/40">
      <SectionHeading
        id="como-funciona"
        sobretitulo="Semana grátis"
        titulo="Como funciona"
        descricao="Você conhece a Arena, os professores e a turma antes de decidir qualquer coisa."
      />

      <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
        {passos.map((passo, i) => (
          <Reveal as="li" key={passo.titulo} atraso={i * 0.08} className="flex">
            <div className="relative w-full overflow-hidden rounded-2xl border border-cinza-700 bg-cinza-900 p-6 md:p-8">
              <span
                aria-hidden="true"
                className="font-display text-7xl leading-none font-black text-vermelho md:text-8xl"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 font-display text-3xl font-extrabold uppercase">
                <span className="sr-only">Passo {i + 1}: </span>
                {passo.titulo}
              </h3>
              <p className="mt-2 text-cinza-200">{passo.texto}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink
          href={agendaLink()}
          {...linkExterno}
          tamanho="lg"
          icone={<IconCalendario className="size-6" />}
          onClick={() => trackAgendamentoIniciado('como-funciona')}
        >
          Agendar aula experimental
        </ButtonLink>
        <ButtonLink
          href={conviteAmigoLink()}
          {...linkExterno}
          variante="secundario"
          tamanho="lg"
          icone={<IconWhatsApp className="size-5" />}
        >
          Convide um amigo
        </ButtonLink>
      </Reveal>
    </Section>
  );
}
