import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { mensagens } from '../../data/config';
import { nomeModalidade } from '../../data/modalidades';
import { turmas } from '../../data/turmas';
import type { Turma } from '../../data/types';
import {
  IDADE_MAX,
  IDADE_MIN,
  arquivoAgenda,
  carregarAulas,
  conviteDepoisDeAgendar,
  dataPorExtenso,
  ehParaMenor,
  enviarAgendamento,
  fimSemanaGratis,
  lerHashAgenda,
  turmaPorId,
  turmasDoAgendamento,
  validarAgendamento,
  type AulaComVagas,
  type DadosAgendamento,
  type ErrosAgendamento,
  type Experiencia,
  type ParaQuem,
} from '../../lib/agenda';
import { diaDaData, diaMes } from '../../lib/aulas';
import { trackAgendamentoConcluido, trackAgendamentoIniciado } from '../../lib/analytics';
import { diaCurto, diasPorExtenso, faixaHorario } from '../../lib/format';
import { formatarWhatsapp } from '../../lib/interesse';
import { comoChegarUrl, enderecoCompleto, linkExterno, whatsappLink } from '../../lib/links';
import { Botao, ButtonLink } from '../ui/Button';
import { Campo, Erro, Opcoes } from '../ui/campos';
import { IconCalendario, IconCheck, IconFechar, IconSeta, IconWhatsApp } from '../ui/icons';

/*
 * Janela de agendamento da aula experimental, aberta por qualquer link para
 * #agendar ou #agendar/<turma> (ver src/lib/agenda.ts).
 *
 *   turma → dia → dados → pronto
 *
 * O conteúdo só existe com a janela aberta: no HTML pré-renderizado vai só o
 * <dialog> vazio (as datas dependem do dia em que a pessoa abre o site).
 */

type Passo = 'turma' | 'dia' | 'dados' | 'pronto';

const NUMERO_PASSO: Record<Exclude<Passo, 'pronto'>, number> = { turma: 1, dia: 2, dados: 3 };

const VAZIO: DadosAgendamento = {
  turma: '',
  data: '',
  paraQuem: '',
  nome: '',
  aluno: '',
  idade: '',
  whatsapp: '',
  experiencia: '',
  consentimento: false,
  empresa: '',
};

/** Depois desse tempo, reabrir a janela busca as vagas de novo. */
const VALIDADE_AULAS_MS = 2 * 60 * 1000;

const ERRO_CONEXAO = 'Não conseguimos falar com o servidor agora. Tente de novo em instantes ou fale com a gente no WhatsApp.';

const PARA_QUEM: { valor: ParaQuem; label: string }[] = [
  { valor: 'eu', label: 'Eu' },
  { valor: 'menor', label: 'Meu filho ou filha' },
];

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';
const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function Agendamento() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>('turma');
  const [dados, setDados] = useState<DadosAgendamento>(VAZIO);
  const [erros, setErros] = useState<ErrosAgendamento>({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [aulas, setAulas] = useState<AulaComVagas[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroAulas, setErroAulas] = useState(false);

  // Refs para os ouvintes de hashchange (criados uma vez só) lerem o estado atual.
  const passoRef = useRef(passo);
  passoRef.current = passo;
  const aulasEmRef = useRef(0);
  /** true = abriu por um clique no site (há uma entrada no histórico para voltar). */
  const abriuNavegando = useRef(false);

  const turma = turmaPorId(dados.turma);
  const aula = aulas?.find((a) => a.turmaId === dados.turma && a.data === dados.data);

  const buscarAulas = useCallback(async () => {
    setCarregando(true);
    setErroAulas(false);
    try {
      setAulas(await carregarAulas());
      aulasEmRef.current = Date.now();
    } catch {
      setErroAulas(true);
    }
    setCarregando(false);
  }, []);

  const abrir = useCallback(
    (turmaId: string | undefined, navegando: boolean) => {
      abriuNavegando.current = navegando;

      // Depois de um agendamento concluído, começa de novo (mantendo o contato).
      if (passoRef.current === 'pronto') {
        setDados((d) => ({ ...VAZIO, nome: d.nome, whatsapp: d.whatsapp }));
        setPasso('turma');
      }
      if (turmaId) {
        setDados((d) => (d.turma === turmaId ? d : { ...d, turma: turmaId, data: '' }));
        setPasso('dia');
      }
      setErros({});
      setErroGeral('');
      setAberto(true);

      if (Date.now() - aulasEmRef.current > VALIDADE_AULAS_MS) void buscarAulas();
    },
    [buscarAulas],
  );

  // Abre pela âncora: clique nos botões "Agendar" ou link compartilhado (#agendar).
  useEffect(() => {
    const conferir = (navegando: boolean) => {
      const alvo = lerHashAgenda(window.location.hash);
      if (alvo) abrir(alvo.turmaId, navegando);
      else if (dialogRef.current?.open) dialogRef.current.close();
    };

    if (lerHashAgenda(window.location.hash)) trackAgendamentoIniciado('link');
    conferir(false);

    const aoMudar = () => conferir(true);
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, [abrir]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (aberto && dialog && !dialog.open) dialog.showModal();
  }, [aberto]);

  // Leva o foco para o título a cada passo (leitor de tela anuncia onde está).
  useEffect(() => {
    if (aberto) tituloRef.current?.focus();
  }, [aberto, passo]);

  /** Fechou (X, Esc, clique fora ou "voltar" do celular): tira o #agendar da URL. */
  function aoFechar() {
    setAberto(false);
    if (!lerHashAgenda(window.location.hash)) return; // fechou pelo "voltar"
    if (abriuNavegando.current) window.history.back();
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const fechar = () => dialogRef.current?.close();

  function alterar<K extends keyof DadosAgendamento>(campo: K, valor: DadosAgendamento[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function escolherTurma(id: string) {
    setDados((d) => (d.turma === id ? d : { ...d, turma: id, data: '' }));
    setErroGeral('');
    setPasso('dia');
  }

  function escolherDia(data: string) {
    alterar('data', data);
    setErroGeral('');
    setPasso('dados');
  }

  function focarPrimeiroErro() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido="true"] input')?.focus();
    });
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErroGeral('');

    const todos = validarAgendamento(dados);
    setErros(todos);
    if (todos.turma) return setPasso('turma');
    if (todos.data) return setPasso('dia');
    if (Object.keys(todos).length > 0) return focarPrimeiroErro();

    setEnviando(true);
    try {
      const resposta = await enviarAgendamento(dados);
      if (resposta.ok) {
        trackAgendamentoConcluido(dados.turma);
        aulasEmRef.current = 0; // as vagas mudaram
        setPasso('pronto');
      } else if (resposta.atualizar) {
        // A aula lotou ou saiu da lista: volta para a escolha do dia, com as vagas atualizadas.
        setErroGeral(resposta.erro);
        setDados((d) => ({ ...d, data: '' }));
        setPasso('dia');
        void buscarAulas();
      } else {
        setErros(resposta.campos ?? {});
        setErroGeral(resposta.erro);
        focarPrimeiroErro();
      }
    } catch {
      setErroGeral(ERRO_CONEXAO);
    }
    setEnviando(false);
  }

  const numero = passo === 'pronto' ? null : NUMERO_PASSO[passo];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="agenda-titulo"
      onClose={aoFechar}
      // Clique no fundo escuro (fora do cartão) fecha.
      onClick={(e) => e.target === dialogRef.current && fechar()}
      className="tom-claro m-0 h-dvh max-h-none w-full max-w-none bg-tom-fundo p-0 text-tom-texto backdrop:bg-preto/80 open:flex open:flex-col sm:m-auto sm:h-fit sm:max-h-[min(92dvh,56rem)] sm:max-w-xl sm:rounded-2xl sm:shadow-2xl"
    >
      {aberto && (
        <>
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-tom-borda px-5 py-3 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-3 text-sm font-semibold tracking-[0.12em] uppercase">
                <span className="text-tom-destaque">Aula experimental</span>
                {numero && <span className="text-xs text-tom-suave">Passo {numero} de 3</span>}
              </p>
              {numero && (
                <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-tom-chip">
                  <div
                    className="h-full rounded-full bg-vermelho transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${(numero / 3) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar agendamento"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-tom-texto hover:bg-tom-chip"
            >
              <IconFechar className="size-6" />
            </button>
          </div>

          <div key={passo} className="passo-entrada flex-1 overflow-y-auto px-5 pt-6 pb-8 sm:px-7">
            {passo === 'turma' && (
              <PassoTurma tituloRef={tituloRef} escolhida={dados.turma} onEscolher={escolherTurma} />
            )}

            {passo === 'dia' && turma && (
              <PassoDia
                tituloRef={tituloRef}
                turma={turma}
                aulas={aulas?.filter((a) => a.turmaId === turma.id) ?? null}
                escolhida={dados.data}
                carregando={carregando}
                erroAulas={erroAulas}
                erroGeral={erroGeral}
                onTentarDeNovo={buscarAulas}
                onTrocarTurma={() => setPasso('turma')}
                onEscolher={escolherDia}
              />
            )}

            {passo === 'dados' && turma && aula && (
              <form ref={formRef} onSubmit={aoEnviar} noValidate>
                <Titulo tituloRef={tituloRef}>Seus dados</Titulo>
                <ResumoAula turma={turma} data={aula.data} onTrocar={() => setPasso('dia')} rotuloTrocar="Trocar o dia" />
                <CamposDados dados={dados} turma={turma} erros={erros} alterar={alterar} />

                {erroGeral && <AvisoErro texto={erroGeral} />}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                  <Botao variante="secundario" tamanho="lg" className="w-full sm:w-auto" onClick={() => setPasso('dia')} disabled={enviando}>
                    Voltar
                  </Botao>
                  <Botao type="submit" tamanho="lg" className="w-full sm:flex-1" disabled={enviando}>
                    {enviando ? 'Agendando…' : 'Confirmar agendamento'}
                  </Botao>
                </div>
              </form>
            )}

            {passo === 'pronto' && turma && aula && (
              <Pronto tituloRef={tituloRef} turma={turma} aula={aula} dados={dados} onFechar={fechar} />
            )}
          </div>
        </>
      )}
    </dialog>
  );
}

/* ---------- passos ---------- */

type RefTitulo = { tituloRef: RefObject<HTMLHeadingElement | null> };

function Titulo({ tituloRef, children }: RefTitulo & { children: ReactNode }) {
  return (
    <h2
      ref={tituloRef}
      id="agenda-titulo"
      tabIndex={-1}
      className="font-display text-4xl leading-none font-black uppercase outline-none"
    >
      {children}
    </h2>
  );
}

function PassoTurma({ tituloRef, escolhida, onEscolher }: RefTitulo & { escolhida: string; onEscolher: (id: string) => void }) {
  // Turmas que aceitam aula experimental, mas ainda não abriram (horário ou professor a confirmar).
  const aConfirmar = turmas
    .filter((t) => t.aulaExperimental && !turmasDoAgendamento.includes(t))
    .map((t) => t.nome);

  return (
    <>
      <Titulo tituloRef={tituloRef}>Escolha a turma</Titulo>
      <p className="mt-3 text-tom-apoio">
        A primeira semana é grátis. Você agenda só a primeira aula; depois, é só vir nas outras.
      </p>

      <ul className="mt-6 grid gap-3">
        {turmasDoAgendamento.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onEscolher(t.id)}
              aria-current={t.id === escolhida ? 'true' : undefined}
              className={`group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors hover:border-tom-texto ${
                t.id === escolhida ? 'border-tom-texto' : 'border-tom-borda'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-[0.12em] text-tom-destaque uppercase">
                  {nomeModalidade(t.modalidade)} · {t.publicoLabel ?? (t.publico === 'infantil' ? 'Infantil' : 'Juvenil/Adulto')}
                </span>
                <span className="mt-1 block font-display text-2xl leading-none font-extrabold uppercase">{t.nome}</span>
                {(t.selo || t.nivelAviso) && (
                  <span
                    className={`mt-2 inline-block rounded-md px-2 py-0.5 text-sm font-semibold ${
                      t.selo ? 'bg-vermelho text-branco' : 'border border-tom-destaque text-tom-destaque'
                    }`}
                  >
                    {t.selo ?? t.nivelAviso}
                  </span>
                )}
                <span className="mt-2 block text-tom-apoio">
                  {maiuscula(diasPorExtenso(t.dias))}, {faixaHorario(t.inicio, t.fim)}
                </span>
              </span>
              <IconSeta className="size-6 shrink-0 text-tom-suave transition-colors group-hover:text-tom-texto" />
            </button>
          </li>
        ))}
      </ul>

      {aConfirmar.length > 0 && (
        <p className="mt-6 text-sm text-tom-suave">
          {aConfirmar.length === 1 ? `${aConfirmar[0]} está` : `${aConfirmar.slice(0, -1).join(', ')} e ${aConfirmar.at(-1)} estão`}{' '}
          com horário ou professor a confirmar.{' '}
          <a href={whatsappLink()} {...linkExterno} className="font-semibold text-tom-texto underline underline-offset-4">
            Fale com a gente
          </a>
          .
        </p>
      )}
    </>
  );
}

interface PassoDiaProps extends RefTitulo {
  turma: Turma;
  aulas: AulaComVagas[] | null;
  escolhida: string;
  carregando: boolean;
  erroAulas: boolean;
  erroGeral: string;
  onTentarDeNovo: () => void;
  onTrocarTurma: () => void;
  onEscolher: (data: string) => void;
}

function PassoDia({ tituloRef, turma, aulas, escolhida, carregando, erroAulas, erroGeral, onTentarDeNovo, onTrocarTurma, onEscolher }: PassoDiaProps) {
  return (
    <>
      <Titulo tituloRef={tituloRef}>Escolha o dia</Titulo>
      <ResumoAula turma={turma} onTrocar={onTrocarTurma} rotuloTrocar="Trocar a turma" />

      {erroGeral && <AvisoErro texto={erroGeral} />}

      <div aria-live="polite" aria-busy={carregando}>
        {carregando && !aulas && <p className="mt-6 text-tom-suave">Carregando os horários…</p>}

        {erroAulas && !carregando && (
          <div role="alert" className="mt-6 rounded-lg border-2 border-tom-destaque p-4 text-tom-apoio">
            <p>Não conseguimos carregar os horários agora.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Botao variante="secundario" onClick={onTentarDeNovo}>
                Tentar de novo
              </Botao>
              <ButtonLink href={whatsappLink()} {...linkExterno} variante="secundario" icone={<IconWhatsApp className="size-5" />}>
                WhatsApp
              </ButtonLink>
            </div>
          </div>
        )}

        {aulas && aulas.length === 0 && (
          <p className="mt-6 rounded-xl border border-dashed border-tom-borda p-5 text-tom-apoio">
            Nenhuma aula dessa turma aberta para agendamento nos próximos dias.{' '}
            <a href={whatsappLink(mensagens.horariosTurma(turma.nome))} {...linkExterno} className="font-semibold text-tom-texto underline underline-offset-4">
              Fale com a gente
            </a>{' '}
            ou escolha outra turma.
          </p>
        )}

        {aulas && aulas.length > 0 && (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {aulas.map((a) => {
              const dia = diaDaData(a.data);
              const lotada = a.vagas <= 0;
              const vagas = lotada ? 'Lotada' : a.vagas === 1 ? 'Última vaga' : `${a.vagas} vagas`;
              return (
                <li key={a.data}>
                  <button
                    type="button"
                    disabled={lotada}
                    onClick={() => onEscolher(a.data)}
                    aria-label={`${maiuscula(dataPorExtenso(a.data))}, ${faixaHorario(a.inicio, a.fim)}${a.professor ? `, professor ${a.professor}` : ''}. ${vagas}`}
                    aria-current={a.data === escolhida ? 'true' : undefined}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors enabled:hover:border-tom-texto disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-60 ${
                      a.data === escolhida ? 'border-tom-texto' : 'border-tom-borda'
                    }`}
                  >
                    <span>
                      <span className="block font-display text-2xl leading-none font-extrabold uppercase">
                        {dia ? diaCurto(dia) : ''} {diaMes(a.data)}
                      </span>
                      <span className="text-sm text-tom-suave">
                        {faixaHorario(a.inicio, a.fim)}
                        {a.professor && ` · Prof. ${a.professor.split(' ')[0]}`}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${
                        lotada ? 'bg-tom-chip text-tom-suave' : a.vagas <= 2 ? 'bg-vermelho text-branco' : 'bg-tom-chip text-tom-chip-texto'
                      }`}
                    >
                      {vagas}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

interface CamposDadosProps {
  dados: DadosAgendamento;
  turma: Turma;
  erros: ErrosAgendamento;
  alterar: <K extends keyof DadosAgendamento>(campo: K, valor: DadosAgendamento[K]) => void;
}

function CamposDados({ dados, turma, erros, alterar }: CamposDadosProps) {
  const infantil = turma.publico === 'infantil';
  const menor = ehParaMenor(dados, turma);
  const modalidade = nomeModalidade(turma.modalidade).toLowerCase();
  const experiencias: { valor: Experiencia; label: string }[] = [
    { valor: 'nunca', label: menor ? 'Nunca treinou' : 'Nunca treinei' },
    { valor: 'ja-treinou', label: menor ? 'Já treinou' : 'Já treinei' },
  ];

  return (
    <div className="mt-6 space-y-6">
      {!infantil && (
        <Opcoes
          id="agenda-para-quem"
          legenda="Quem vai treinar?"
          nome="paraQuem"
          tipo="radio"
          opcoes={PARA_QUEM}
          marcado={(v) => dados.paraQuem === v}
          onChange={(v) => alterar('paraQuem', v)}
          erro={erros.paraQuem}
        />
      )}

      <Campo
        id="agenda-nome"
        rotulo={menor ? 'Nome do responsável' : 'Seu nome'}
        ajuda={menor ? 'Menores de 18 anos agendam pelo responsável.' : undefined}
        erro={erros.nome}
        input={{
          type: 'text',
          autoComplete: 'name',
          maxLength: 100,
          value: dados.nome,
          onChange: (e) => alterar('nome', e.target.value),
        }}
      />

      {menor && (
        <div className="grid gap-6 sm:grid-cols-[1fr_8rem]">
          <Campo
            id="agenda-aluno"
            rotulo="Nome de quem vai treinar"
            erro={erros.aluno}
            input={{
              type: 'text',
              autoComplete: 'off',
              maxLength: 100,
              value: dados.aluno,
              onChange: (e) => alterar('aluno', e.target.value),
            }}
          />
          <Campo
            id="agenda-idade"
            rotulo="Idade"
            erro={erros.idade}
            className="max-w-40"
            input={{
              type: 'number',
              inputMode: 'numeric',
              min: IDADE_MIN,
              max: IDADE_MAX,
              value: dados.idade,
              onChange: (e) => alterar('idade', e.target.value),
            }}
          />
        </div>
      )}

      <Campo
        id="agenda-whatsapp"
        rotulo="WhatsApp com DDD"
        ajuda="A academia usa esse número para confirmar a aula."
        erro={erros.whatsapp}
        input={{
          type: 'tel',
          inputMode: 'tel',
          autoComplete: 'tel-national',
          placeholder: '(41) 99999-9999',
          value: dados.whatsapp,
          onChange: (e) => alterar('whatsapp', formatarWhatsapp(e.target.value)),
        }}
      />

      <Opcoes
        id="agenda-experiencia"
        legenda={menor ? `Já treinou ${modalidade}?` : `Você já treinou ${modalidade}?`}
        nome="experiencia"
        tipo="radio"
        opcoes={experiencias}
        marcado={(v) => dados.experiencia === v}
        onChange={(v) => alterar('experiencia', v)}
        erro={erros.experiencia}
      />

      <div data-invalido={!!erros.consentimento}>
        <label className="flex cursor-pointer items-start gap-3 text-tom-apoio">
          <input
            type="checkbox"
            checked={dados.consentimento}
            onChange={(e) => alterar('consentimento', e.target.checked)}
            aria-invalid={!!erros.consentimento}
            aria-describedby={erros.consentimento ? 'agenda-consentimento-erro' : undefined}
            className="mt-1 size-5 shrink-0 accent-vermelho"
          />
          <span>
            Concordo que a Academia Scuzziato use esses dados para falar comigo sobre a aula experimental.{' '}
            <a href="#privacidade" className="font-semibold text-tom-texto underline underline-offset-4">
              Aviso de privacidade
            </a>
          </span>
        </label>
        <Erro id="agenda-consentimento-erro" texto={erros.consentimento} />
      </div>

      {/* Honeypot: escondido de pessoas e leitores de tela. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="agenda-empresa">Empresa</label>
        <input
          id="agenda-empresa"
          type="text"
          name="empresa"
          tabIndex={-1}
          autoComplete="off"
          value={dados.empresa}
          onChange={(e) => alterar('empresa', e.target.value)}
        />
      </div>
    </div>
  );
}

interface ProntoProps extends RefTitulo {
  turma: Turma;
  aula: AulaComVagas;
  dados: DadosAgendamento;
  onFechar: () => void;
}

function Pronto({ tituloRef, turma, aula, dados, onFechar }: ProntoProps) {
  const menor = ehParaMenor(dados, turma);
  const nome = primeiroNome(dados.nome);
  const aluno = primeiroNome(dados.aluno);
  const endereco = enderecoCompleto();

  function salvarNaAgenda() {
    const url = URL.createObjectURL(arquivoAgenda(turma, aula, endereco));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aula-experimental-academia-scuzziato.ics';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div role="status">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-vermelho text-branco">
        <IconCheck className="size-7" />
      </span>
      <div className="mt-5">
        <Titulo tituloRef={tituloRef}>Aula marcada{nome ? `, ${nome}` : ''}!</Titulo>
      </div>
      <p className="mt-3 text-lg text-tom-apoio">
        {menor ? `A vaga de ${aluno} está garantida.` : 'Sua vaga está garantida.'} Te esperamos no tatame.
      </p>

      <div className="mt-6 rounded-xl bg-tom-card p-5">
        <p className="text-sm font-semibold tracking-[0.12em] text-tom-destaque uppercase">{turma.nome}</p>
        <p className="mt-1 font-display text-3xl leading-none font-black uppercase">{maiuscula(dataPorExtenso(aula.data))}</p>
        <p className="mt-1 text-lg font-semibold">{faixaHorario(aula.inicio, aula.fim)}</p>
        {aula.professor && <p className="mt-3 text-tom-apoio">Prof. {aula.professor}</p>}
        <p className="mt-1 text-tom-apoio">
          {endereco}
          {turma.observacao && ` · ${turma.observacao}`}
        </p>
      </div>

      <p className="mt-6 text-tom-apoio">
        <strong className="font-semibold text-tom-texto">Depois dessa aula, a semana grátis continua</strong> até{' '}
        {dataPorExtenso(fimSemanaGratis(aula.data))}: {menor ? `${aluno} pode vir` : 'venha'} nas próximas aulas da turma sem
        precisar agendar de novo.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Botao variante="secundario" icone={<IconCalendario className="size-5" />} onClick={salvarNaAgenda}>
          Salvar na agenda
        </Botao>
        <ButtonLink href={comoChegarUrl()} {...linkExterno} variante="secundario" icone={<IconSeta className="size-5" />}>
          Como chegar
        </ButtonLink>
        <ButtonLink
          href={conviteDepoisDeAgendar(turma, aula)}
          {...linkExterno}
          icone={<IconWhatsApp className="size-5" />}
          className="sm:col-span-2"
        >
          Convidar um amigo
        </ButtonLink>
      </div>

      <p className="mt-6 text-sm text-tom-suave">
        Não vai conseguir ir?{' '}
        <a
          href={whatsappLink(`Olá! Agendei uma aula experimental de ${turma.nome} (${dataPorExtenso(aula.data)}) e não vou conseguir ir.`)}
          {...linkExterno}
          className="font-semibold text-tom-texto underline underline-offset-4"
        >
          Avise pelo WhatsApp
        </a>{' '}
        para liberar a vaga.
      </p>

      <Botao variante="secundario" tamanho="lg" className="mt-8 w-full" onClick={onFechar}>
        Fechar
      </Botao>

    </div>
  );
}

/* ---------- pedaços ---------- */

function ResumoAula({ turma, data, onTrocar, rotuloTrocar }: { turma: Turma; data?: string; onTrocar: () => void; rotuloTrocar: string }) {
  return (
    <div className="mt-5 flex items-start justify-between gap-4 rounded-xl bg-tom-card p-4">
      <div className="min-w-0">
        <p className="font-semibold">{turma.nome}</p>
        <p className="text-tom-apoio">
          {data ? `${maiuscula(dataPorExtenso(data))}, ${faixaHorario(turma.inicio, turma.fim)}` : `${maiuscula(diasPorExtenso(turma.dias))}, ${faixaHorario(turma.inicio, turma.fim)}`}
        </p>
      </div>
      <button type="button" onClick={onTrocar} className="shrink-0 font-semibold text-tom-texto underline underline-offset-4">
        {rotuloTrocar}
      </button>
    </div>
  );
}

function AvisoErro({ texto }: { texto: string }) {
  return (
    <div role="alert" className="mt-6 rounded-lg border-2 border-tom-destaque p-4 text-tom-apoio">
      <p>{texto}</p>
      <a href={whatsappLink()} {...linkExterno} className="mt-2 inline-flex items-center gap-2 font-semibold text-tom-texto underline underline-offset-4">
        <IconWhatsApp className="size-5" /> Falar no WhatsApp
      </a>
    </div>
  );
}
