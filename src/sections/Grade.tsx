import { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { config, mensagens } from '../data/config';
import { modalidades, nomeModalidade } from '../data/modalidades';
import { openMat, turmas } from '../data/turmas';
import type { Dia, Modalidade, Publico, Turma } from '../data/types';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { professoresDaTurma, turmasAgendaveis } from '../lib/aulas';
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
  // Só anima os cards que entram depois de um filtro. Na primeira renderização
  // (a que vira HTML no build) os cards saem sem opacity 0.
  const [filtrou, setFiltrou] = useState(false);

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
    <Section id="horarios" tom="grafite">
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
          onChange={(v) => {
            setFiltrou(true);
            setModalidade(v);
          }}
        />
        <GrupoFiltro
          rotulo="Público"
          opcoes={[{ valor: 'todas', label: 'Todos' }, ...PUBLICOS]}
          valor={publico}
          onChange={(v) => {
            setFiltrou(true);
            setPublico(v);
          }}
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
              initial={filtrou ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex"
            >
              <TurmaCard turma={turma} />
            </m.li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-tom-borda p-8 text-center text-tom-suave">
          Ainda não temos turma com esse filtro.{' '}
          <a href={whatsappLink()} {...linkExterno} className="font-semibold text-tom-texto underline underline-offset-4">
            Fale com a gente
          </a>{' '}
          e conte o que você procura.
        </p>
      )}

      <Reveal className="mt-8 flex flex-col gap-1 rounded-xl border border-tom-borda bg-tom-card p-5 sm:flex-row sm:items-baseline sm:gap-4">
        <p className="font-display text-2xl font-extrabold uppercase">
          {openMat.dia}: open mat
        </p>
        <p className="text-tom-apoio">
          <strong className="font-semibold text-tom-texto">{faixaHorario(openMat.inicio, openMat.fim)}.</strong> Treino livre no
          tatame.
        </p>
      </Reveal>

      <Reveal className="mt-4 rounded-xl border border-tom-borda p-5 text-tom-apoio md:flex md:items-center md:gap-4">
        <p>
          <strong className="font-semibold text-tom-texto">
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
      <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-tom-suave uppercase" aria-hidden="true">
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
                  ? 'border-tom-texto bg-tom-texto text-tom-fundo'
                  : 'border-tom-borda text-tom-apoio hover:border-tom-borda-forte hover:text-tom-texto'
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
      className={`tom-claro flex w-full flex-col rounded-2xl border bg-tom-fundo p-5 text-tom-texto shadow-lg shadow-preto/30 ${
        turma.selo ? 'border-vermelho' : 'border-tom-borda'
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-semibold tracking-[0.12em] uppercase">
        <span className="text-tom-destaque">{nomeModalidade(turma.modalidade)}</span>
        <span className="text-tom-suave">{publicoTexto}</span>
      </div>

      <h3 className="mt-2 font-display text-3xl leading-none font-extrabold uppercase">{turma.nome}</h3>

      {(turma.selo || turma.nivelAviso || turma.nivel) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {turma.selo && (
            <span className="rounded-md bg-vermelho px-2.5 py-1 text-sm font-semibold text-branco">{turma.selo}</span>
          )}
          {turma.nivelAviso ? (
            <span className="rounded-md border border-tom-destaque px-2.5 py-1 text-sm font-semibold text-tom-destaque">
              {turma.nivelAviso}
            </span>
          ) : (
            turma.nivel && (
              <span className="rounded-md border border-tom-borda-forte px-2.5 py-1 text-sm font-medium text-tom-apoio">
                {turma.nivel}
              </span>
            )
          )}
        </div>
      )}

      <div className="mt-5 border-t border-tom-borda pt-5">
        {turma.provisorio ? (
          <p className="flex items-start gap-3 text-tom-apoio">
            <IconRelogio className="mt-0.5 size-5 shrink-0 text-tom-suave" />
            <span>
              <strong className="block font-semibold text-tom-texto">Horário a confirmar</strong>
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
                        tem ? 'bg-tom-texto text-tom-fundo' : 'border border-tom-borda text-tom-suave'
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

      <ProfessoresTurma turma={turma} />

      {turma.observacao && <p className="mt-2 text-sm font-semibold text-tom-apoio">{turma.observacao}</p>}

      <div className="mt-auto pt-5">
        <AcaoTurma turma={turma} />
      </div>
    </article>
  );
}

/** "Prof. Rhaue Scuzziato (seg, ter) · Camilo Scuzziato (qua, qui)" */
function ProfessoresTurma({ turma }: { turma: Turma }) {
  // Professores confirmados primeiro; "a confirmar" por último.
  const grupos = professoresDaTurma(turma).sort((a, b) => Number(a.nome === null) - Number(b.nome === null));
  const varios = grupos.length > 1 && !turma.provisorio;
  return (
    <p className="mt-4 text-sm text-tom-suave">
      Prof.{' '}
      {grupos.map((g, i) => (
        <span key={g.nome ?? 'a-confirmar'}>
          {i > 0 && ' · '}
          <span className={g.nome ? 'font-semibold text-tom-apoio' : ''}>{g.nome ?? 'a confirmar'}</span>
          {varios && ` (${g.dias.map(diaCurto).join(', ').toLowerCase()})`}
        </span>
      ))}
    </p>
  );
}

const ID_AGENDAVEIS = new Set(turmasAgendaveis(turmas).map((t) => t.id));

function AcaoTurma({ turma }: { turma: Turma }) {
  if (!ID_AGENDAVEIS.has(turma.id)) {
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
      icone={<IconCalendario className="size-5" />}
      className="w-full"
      aria-label={`Agendar aula experimental: ${turma.nome}`}
      onClick={() => trackAgendamentoIniciado(`grade:${turma.id}`)}
    >
      Agendar
    </ButtonLink>
  );
}
