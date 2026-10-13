import { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { config, mensagens } from '../data/config';
import { modalidades, nomeModalidade } from '../data/modalidades';
import { turmas } from '../data/turmas';
import type { Dia, Modalidade, Publico, Turma } from '../data/types';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { diaCurto, diasPorExtenso, faixaHorario } from '../lib/format';
import { agendaLink, linkExterno, whatsappLink } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconCalendario, IconRelogio, IconWhatsApp } from '../components/ui/icons';

const DIAS_UTEIS: Dia[] = ['seg', 'ter', 'qua', 'qui', 'sex'];

const PUBLICOS: { valor: Publico; label: string }[] = [
  { valor: 'infantil', label: 'Infantil' },
  { valor: 'juvenil-adulto', label: 'Juvenil/Adulto' },
];

type Filtro<T> = T | 'todas';

export function Grade() {
  const [modalidade, setModalidade] = useState<Filtro<Modalidade>>('todas');
  const [publico, setPublico] = useState<Filtro<Publico>>('todas');

  // Só oferece no filtro as modalidades que têm turma na grade.
  const opcoesModalidade = modalidades
    .filter((mod) => turmas.some((t) => t.modalidade === mod.id))
    .map((mod) => ({ valor: mod.id, label: mod.nome }));

  const visiveis = useMemo(
    () =>
      turmas.filter(
        (t) =>
          (modalidade === 'todas' || t.modalidade === modalidade) &&
          (publico === 'todas' || t.publico === publico),
      ),
    [modalidade, publico],
  );

  return (
    <Section id="horarios" className="bg-cinza-900/40">
      <SectionHeading
        id="horarios"
        sobretitulo="Grade de horários"
        titulo="Escolha sua turma"
        descricao="Agende a aula experimental direto na turma. A primeira semana é por nossa conta."
      />

      <Reveal className="mb-8 flex flex-col gap-5 md:flex-row md:gap-10">
        <GrupoFiltro
          rotulo="Modalidade"
          opcoes={[{ valor: 'todas', label: 'Todas' }, ...opcoesModalidade]}
          valor={modalidade}
          onChange={setModalidade}
        />
        <GrupoFiltro
          rotulo="Público"
          opcoes={[{ valor: 'todas', label: 'Todos' }, ...PUBLICOS]}
          valor={publico}
          onChange={setPublico}
        />
      </Reveal>

      <p className="sr-only" aria-live="polite">
        {visiveis.length === 1 ? '1 turma encontrada' : `${visiveis.length} turmas encontradas`}
      </p>

      {visiveis.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((turma) => (
            <m.li
              key={turma.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex"
            >
              <TurmaCard turma={turma} />
            </m.li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-cinza-700 p-8 text-center text-cinza-400">
          Ainda não temos turma com esse filtro.{' '}
          <a href={whatsappLink()} {...linkExterno} className="font-semibold text-branco underline underline-offset-4">
            Fale com a gente
          </a>{' '}
          e conte o que você procura.
        </p>
      )}

      <Reveal className="mt-8 rounded-xl border border-cinza-700 p-5 text-cinza-200 md:flex md:items-center md:gap-4">
        <p>
          <strong className="font-semibold text-branco">
            Até {config.vagasPorAula} vagas por aula experimental.
          </strong>{' '}
          Vai trazer amigos? Ótimo: cada um agenda a própria vaga.
        </p>
      </Reveal>
    </Section>
  );
}

interface GrupoFiltroProps<T extends string> {
  rotulo: string;
  opcoes: { valor: T; label: string }[];
  valor: T;
  onChange: (valor: T) => void;
}

function GrupoFiltro<T extends string>({ rotulo, opcoes, valor, onChange }: GrupoFiltroProps<T>) {
  return (
    <div role="group" aria-label={`Filtrar por ${rotulo.toLowerCase()}`}>
      <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-cinza-400 uppercase" aria-hidden="true">
        {rotulo}
      </p>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const ativo = opcao.valor === valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => onChange(opcao.valor)}
              className={`min-h-11 rounded-full border-2 px-4 font-semibold transition-colors ${
                ativo
                  ? 'border-branco bg-branco text-preto'
                  : 'border-cinza-700 text-cinza-200 hover:border-cinza-500 hover:text-branco'
              }`}
            >
              {opcao.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TurmaCard({ turma }: { turma: Turma }) {
  const publicoTexto = turma.publicoLabel ?? PUBLICOS.find((p) => p.valor === turma.publico)?.label;

  return (
    <article
      className={`flex w-full flex-col rounded-2xl border bg-cinza-900 p-5 ${
        turma.selo ? 'border-vermelho' : 'border-cinza-700'
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-semibold tracking-[0.12em] uppercase">
        <span className="text-vermelho-claro">{nomeModalidade(turma.modalidade)}</span>
        <span className="text-cinza-400">{publicoTexto}</span>
      </div>

      <h3 className="mt-2 font-display text-3xl leading-none font-extrabold uppercase">{turma.nome}</h3>

      {(turma.selo || turma.nivelAviso || turma.nivel) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {turma.selo && (
            <span className="rounded-md bg-vermelho px-2.5 py-1 text-sm font-semibold text-branco">{turma.selo}</span>
          )}
          {turma.nivelAviso ? (
            <span className="rounded-md border border-vermelho-claro px-2.5 py-1 text-sm font-semibold text-vermelho-claro">
              {turma.nivelAviso}
            </span>
          ) : (
            turma.nivel && (
              <span className="rounded-md border border-cinza-500 px-2.5 py-1 text-sm font-medium text-cinza-200">
                {turma.nivel}
              </span>
            )
          )}
        </div>
      )}

      <div className="mt-5 border-t border-cinza-700 pt-5">
        {turma.provisorio ? (
          <p className="flex items-start gap-3 text-cinza-200">
            <IconRelogio className="mt-0.5 size-5 shrink-0 text-cinza-400" />
            <span>
              <strong className="block font-semibold text-branco">Horário a confirmar</strong>
              Fale com a gente
            </span>
          </p>
        ) : (
          <>
            <p className="sr-only">
              {diasPorExtenso(turma.dias)}, {faixaHorario(turma.inicio, turma.fim)}
            </p>
            <div aria-hidden="true">
              <p className="font-display text-4xl leading-none font-black">{faixaHorario(turma.inicio, turma.fim)}</p>
              <div className="mt-3 flex gap-1.5">
                {DIAS_UTEIS.map((dia) => {
                  const tem = turma.dias.includes(dia);
                  return (
                    <span
                      key={dia}
                      className={`flex-1 rounded-md py-1 text-center text-sm font-semibold ${
                        tem ? 'bg-branco text-preto' : 'border border-cinza-700 text-cinza-400'
                      }`}
                    >
                      {diaCurto(dia)}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-sm text-cinza-400">
        {turma.professor ? (
          <>
            Professor <span className="font-semibold text-cinza-200">{turma.professor}</span>
          </>
        ) : (
          'Professor a definir'
        )}
      </p>

      <div className="mt-auto pt-5">
        <AcaoTurma turma={turma} />
      </div>
    </article>
  );
}

function AcaoTurma({ turma }: { turma: Turma }) {
  if (turma.provisorio || !turma.aulaExperimental) {
    return (
      <ButtonLink
        href={whatsappLink(mensagens.horariosTurma(turma.nome))}
        {...linkExterno}
        variante="secundario"
        icone={<IconWhatsApp className="size-5" />}
        className="w-full"
      >
        Fale com a gente
      </ButtonLink>
    );
  }

  return (
    <ButtonLink
      href={agendaLink(turma)}
      {...linkExterno}
      icone={<IconCalendario className="size-5" />}
      className="w-full"
      aria-label={`Agendar aula experimental: ${turma.nome}`}
      onClick={() => trackAgendamentoIniciado(`grade:${turma.id}`)}
    >
      Agendar
    </ButtonLink>
  );
}
