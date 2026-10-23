import { config } from '../data/config';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { agendaLink, conviteAmigoLink, linkExterno } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconCalendario, IconWhatsApp } from '../components/ui/icons';
import { TextoGigante } from '../components/ui/efeitos';

const passos = [
  {
    titulo: 'Agende',
    texto: `Escolha a turma e o dia da sua primeira aula. São até ${config.vagasPorAula} vagas por aula experimental.`,
  },
  {
    titulo: 'Treine a semana',
    texto: 'Depois da primeira aula, venha nas outras da semana sem agendar de novo e sem pagar nada.',
  },
  {
    titulo: 'Decida',
    texto: 'Gostou? Escolha seu plano e faça a matrícula. Se não for para você, tudo bem: sem compromisso.',
  },
];

export function ComoFunciona() {
  return (
    <Section id="como-funciona" tom="claro" corte>
      <SectionHeading
        id="como-funciona"
        sobretitulo="Semana grátis"
        titulo="Como funciona"
        descricao="Você conhece a academia, os professores e a turma antes de decidir qualquer coisa."
      />

      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {passos.map((passo, i) => (
          <Reveal as="li" key={passo.titulo} atraso={i * 0.08} className="relative pt-24 md:pt-32">
            {/* número gigante vazado ao fundo */}
            <TextoGigante texto={String(i + 1)} className="top-0 -left-1 text-[9rem] md:text-[12rem]" />
            <div className="relative border-l-4 border-tom-destaque pl-5">
              <p className="text-sm font-semibold tracking-[0.18em] text-tom-destaque uppercase">Passo {i + 1}</p>
              <h3 className="mt-1 font-display text-3xl font-extrabold uppercase">{passo.titulo}</h3>
              <p className="mt-2 text-tom-apoio">{passo.texto}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-14 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink
          href={agendaLink()}
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
