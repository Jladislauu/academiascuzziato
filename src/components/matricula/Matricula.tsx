import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { matricula as regrasMatricula } from '../../data/matricula';
import { modalidades, nomeModalidade } from '../../data/modalidades';
import { planos } from '../../data/planos';
import { turmas } from '../../data/turmas';
import type { Modalidade, Plano } from '../../data/types';
import {
  VAZIA,
  ehMenorEscolha,
  enviarMatricula,
  formatarCpf,
  lerHashMatricula,
  planoPorId,
  turmaMatriculaPorId,
  turmasParaEscolher,
  validarMatricula,
  valorPlano,
  type DadosMatricula,
  type ErrosMatricula,
  type ParaQuem,
} from '../../lib/matricula';
import { diasPorExtenso, faixaHorario, preco } from '../../lib/format';
import { formatarWhatsapp } from '../../lib/interesse';
import { linkExterno, whatsappLink } from '../../lib/links';
import { Botao, ButtonLink } from '../ui/Button';
import { Campo, Erro, Opcoes } from '../ui/campos';
import { IconCheck, IconFechar, IconSeta, IconWhatsApp } from '../ui/icons';

/*
 * Ficha de matrícula, aberta por qualquer link para #matricula ou
 * #matricula/<plano> (ver "Quero me matricular" em src/sections/Planos.tsx).
 *
 *   plano → quem vai treinar → dados → turmas → resumo → pronto
 *
 * Cria a assinatura mensal no Asaas (public/api/matricula.php). A matrícula só
 * fica ativa quando a primeira mensalidade é paga — confirmado pelo webhook do
 * Asaas, do lado do servidor (ver asaas-webhook.php).
 */

type Passo = 'plano' | 'quem' | 'dados' | 'turmas' | 'resumo' | 'pronto';

const NUMERO_PASSO: Record<Exclude<Passo, 'pronto'>, number> = { plano: 1, quem: 2, dados: 3, turmas: 4, resumo: 5 };
const TOTAL_PASSOS = 5;

const CAMPOS_DADOS = ['nomeResponsavel', 'nomeAluno', 'dataNascimento', 'cpfPagador', 'emailPagador', 'whatsappPagador'] as const;

const ERRO_CONEXAO = 'Não conseguimos falar com o servidor agora. Tente de novo em instantes ou fale com a gente no WhatsApp.';

const PARA_QUEM: { valor: ParaQuem; label: string }[] = [
  { valor: 'eu', label: 'Eu' },
  { valor: 'menor', label: 'Meu filho ou filha' },
];

// Modalidade matriculável: tem pelo menos uma turma com horário confirmado (não provisória).
const MODALIDADES_COM_TURMA = new Set(turmas.filter((t) => !t.provisorio).map((t) => t.modalidade));
const MODALIDADES_MATRICULAVEIS = modalidades.filter((m) => MODALIDADES_COM_TURMA.has(m.id));

export function Matricula() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>('plano');
  const [dados, setDados] = useState<DadosMatricula>(VAZIA);
  const [erros, setErros] = useState<ErrosMatricula>({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ faturaUrl: string; jaExiste?: boolean } | null>(null);

  const passoRef = useRef(passo);
  passoRef.current = passo;
  /** true = abriu por um clique no site (há uma entrada no histórico para voltar). */
  const abriuNavegando = useRef(false);

  const plano = planoPorId(dados.plano);

  const abrir = useCallback((planoId: Plano['id'] | undefined, navegando: boolean) => {
    abriuNavegando.current = navegando;

    // Depois de uma matrícula concluída, começa de novo (sem manter dados pessoais).
    if (passoRef.current === 'pronto') {
      setDados(VAZIA);
      setResultado(null);
      setPasso('plano');
    }
    if (planoId) {
      setDados((d) => (d.plano === planoId ? d : { ...d, plano: planoId, modalidade: '' }));
      setPasso(planoId === 'uma-modalidade' ? 'plano' : 'quem');
    }
    setErros({});
    setErroGeral('');
    setAberto(true);
  }, []);

  // Abre pela âncora: clique em "Quero me matricular" ou link compartilhado (#matricula).
  useEffect(() => {
    const conferir = (navegando: boolean) => {
      const alvo = lerHashMatricula(window.location.hash);
      if (alvo) abrir(alvo.planoId, navegando);
      else if (dialogRef.current?.open) dialogRef.current.close();
    };

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

  /** Fechou (X, Esc, clique fora ou "voltar" do celular): tira o #matricula da URL. */
  function aoFechar() {
    setAberto(false);
    if (!lerHashMatricula(window.location.hash)) return; // fechou pelo "voltar"
    if (abriuNavegando.current) window.history.back();
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const fechar = () => dialogRef.current?.close();

  function alterar<K extends keyof DadosMatricula>(campo: K, valor: DadosMatricula[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function focarPrimeiroErro() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido="true"] input')?.focus();
    });
  }

  function escolherPlano(id: Plano['id']) {
    setDados((d) => ({ ...d, plano: id, modalidade: id === 'uma-modalidade' ? d.modalidade : '' }));
    setErroGeral('');
    if (id !== 'uma-modalidade') setPasso('quem');
  }

  function escolherModalidade(m: Modalidade) {
    alterar('modalidade', m);
    setPasso('quem');
  }

  function escolherParaQuem(v: ParaQuem) {
    setDados((d) => ({ ...d, paraQuem: v, nomeResponsavel: v === 'eu' ? '' : d.nomeResponsavel }));
    setErroGeral('');
    setPasso('dados');
  }

  function aoContinuarDados() {
    const todos = validarMatricula(dados);
    const relevantes: ErrosMatricula = {};
    for (const campo of CAMPOS_DADOS) if (todos[campo]) relevantes[campo] = todos[campo];
    setErros(relevantes);
    if (Object.keys(relevantes).length > 0) return focarPrimeiroErro();
    setPasso('turmas');
  }

  function alternarTurma(id: string) {
    setDados((d) => ({ ...d, turmas: d.turmas.includes(id) ? d.turmas.filter((t) => t !== id) : [...d.turmas, id] }));
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErroGeral('');

    const todos = validarMatricula(dados);
    setErros(todos);
    if (CAMPOS_DADOS.some((c) => todos[c])) return setPasso('dados');
    if (todos.plano || todos.modalidade) return setPasso('plano');
    if (todos.paraQuem) return setPasso('quem');
    if (Object.keys(todos).length > 0) return focarPrimeiroErro();

    setEnviando(true);
    try {
      const resposta = await enviarMatricula(dados);
      if (resposta.ok) {
        setResultado({ faturaUrl: resposta.faturaUrl, jaExiste: resposta.jaExiste });
        setPasso('pronto');
      } else {
        setErros(resposta.campos ?? {});
        setErroGeral(resposta.erro);
        if (resposta.campos && Object.keys(resposta.campos).length > 0) focarPrimeiroErro();
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
      aria-labelledby="matricula-titulo"
      onClose={aoFechar}
      onClick={(e) => e.target === dialogRef.current && fechar()}
      className="tom-claro m-0 h-dvh max-h-none w-full max-w-none bg-tom-fundo p-0 text-tom-texto backdrop:bg-preto/80 open:flex open:flex-col sm:m-auto sm:h-fit sm:max-h-[min(92dvh,56rem)] sm:max-w-xl sm:rounded-2xl sm:shadow-2xl"
    >
      {aberto && (
        <>
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-tom-borda px-5 py-3 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-3 text-sm font-semibold tracking-[0.12em] uppercase">
                <span className="text-tom-destaque">Matrícula</span>
                {numero && <span className="text-xs text-tom-suave">Passo {numero} de {TOTAL_PASSOS}</span>}
              </p>
              {numero && (
                <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-tom-chip">
                  <div
                    className="h-full rounded-full bg-vermelho transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${(numero / TOTAL_PASSOS) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar matrícula"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-tom-texto hover:bg-tom-chip"
            >
              <IconFechar className="size-6" />
            </button>
          </div>

          <div key={passo} className="passo-entrada flex-1 overflow-y-auto px-5 pt-6 pb-8 sm:px-7">
            {passo === 'plano' && (
              <PassoPlano tituloRef={tituloRef} dados={dados} onEscolherPlano={escolherPlano} onEscolherModalidade={escolherModalidade} />
            )}

            {passo === 'quem' && <PassoQuem tituloRef={tituloRef} escolhido={dados.paraQuem} onEscolher={escolherParaQuem} />}

            {passo === 'dados' && plano && (
              <>
                <Titulo tituloRef={tituloRef}>Seus dados</Titulo>
                <CamposDados dados={dados} erros={erros} alterar={alterar} />
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                  <Botao variante="secundario" tamanho="lg" className="w-full sm:w-auto" onClick={() => setPasso('quem')}>
                    Voltar
                  </Botao>
                  <Botao tamanho="lg" className="w-full sm:flex-1" onClick={aoContinuarDados}>
                    Continuar
                  </Botao>
                </div>
              </>
            )}

            {passo === 'turmas' && plano && (
              <PassoTurmas
                tituloRef={tituloRef}
                dados={dados}
                onAlternar={alternarTurma}
                onVoltar={() => setPasso('dados')}
                onContinuar={() => setPasso('resumo')}
              />
            )}

            {passo === 'resumo' && plano && (
              <form ref={formRef} onSubmit={aoEnviar} noValidate>
                <Titulo tituloRef={tituloRef}>Resumo</Titulo>
                <ResumoMatricula dados={dados} plano={plano} onTrocarPlano={() => setPasso('plano')} />
                <TermoEConsentimento dados={dados} erros={erros} alterar={alterar} />

                {erroGeral && <AvisoErro texto={erroGeral} />}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                  <Botao variante="secundario" tamanho="lg" className="w-full sm:w-auto" onClick={() => setPasso('turmas')} disabled={enviando}>
                    Voltar
                  </Botao>
                  <Botao type="submit" tamanho="lg" className="w-full sm:flex-1" disabled={enviando}>
                    {enviando ? 'Enviando…' : 'Ir para o pagamento'}
                  </Botao>
                </div>
              </form>
            )}

            {passo === 'pronto' && plano && resultado && (
              <Pronto tituloRef={tituloRef} plano={plano} dados={dados} resultado={resultado} onFechar={fechar} />
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
    <h2 ref={tituloRef} id="matricula-titulo" tabIndex={-1} className="font-display text-4xl leading-none font-black uppercase outline-none">
      {children}
    </h2>
  );
}

interface PassoPlanoProps extends RefTitulo {
  dados: DadosMatricula;
  onEscolherPlano: (id: Plano['id']) => void;
  onEscolherModalidade: (m: Modalidade) => void;
}

function PassoPlano({ tituloRef, dados, onEscolherPlano, onEscolherModalidade }: PassoPlanoProps) {
  return (
    <>
      <Titulo tituloRef={tituloRef}>Escolha o plano</Titulo>
      <p className="mt-3 text-tom-apoio">A mensalidade é paga pelo Asaas, em Pix, boleto ou cartão. A matrícula fica ativa quando o pagamento é aprovado.</p>

      <ul className="mt-6 grid gap-3">
        {planos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onEscolherPlano(p.id)}
              aria-current={p.id === dados.plano ? 'true' : undefined}
              className={`flex w-full items-center justify-between gap-4 rounded-xl border-2 p-4 text-left transition-colors hover:border-tom-texto ${
                p.id === dados.plano ? 'border-tom-texto' : 'border-tom-borda'
              }`}
            >
              <span>
                <span className="block font-display text-2xl leading-none font-extrabold uppercase">{p.nome}</span>
                <span className="mt-1 block text-tom-apoio">{p.descricao}</span>
              </span>
              <span className="shrink-0 font-display text-xl font-extrabold whitespace-nowrap">{preco(valorPlano(p))}/mês</span>
            </button>
          </li>
        ))}
      </ul>

      {dados.plano === 'uma-modalidade' && (
        <div className="mt-6">
          <Opcoes
            id="matricula-modalidade"
            legenda="Qual modalidade?"
            nome="modalidade"
            tipo="radio"
            opcoes={MODALIDADES_MATRICULAVEIS.map((m) => ({ valor: m.id, label: m.nome }))}
            marcado={(v) => dados.modalidade === v}
            onChange={onEscolherModalidade}
          />
        </div>
      )}
    </>
  );
}

function PassoQuem({ tituloRef, escolhido, onEscolher }: RefTitulo & { escolhido: ParaQuem | ''; onEscolher: (v: ParaQuem) => void }) {
  return (
    <>
      <Titulo tituloRef={tituloRef}>Quem vai treinar?</Titulo>
      <div className="mt-6">
        <Opcoes id="matricula-para-quem" legenda="Quem vai treinar?" nome="paraQuem" tipo="radio" opcoes={PARA_QUEM} marcado={(v) => escolhido === v} onChange={onEscolher} />
      </div>
    </>
  );
}

interface CamposDadosProps {
  dados: DadosMatricula;
  erros: ErrosMatricula;
  alterar: <K extends keyof DadosMatricula>(campo: K, valor: DadosMatricula[K]) => void;
}

function CamposDados({ dados, erros, alterar }: CamposDadosProps) {
  const menor = ehMenorEscolha(dados);

  return (
    <div className="mt-6 space-y-6">
      {menor && (
        <Campo
          id="matricula-nome-responsavel"
          rotulo="Nome do responsável"
          erro={erros.nomeResponsavel}
          input={{
            type: 'text',
            autoComplete: 'name',
            maxLength: 100,
            value: dados.nomeResponsavel,
            onChange: (e) => alterar('nomeResponsavel', e.target.value),
          }}
        />
      )}

      <Campo
        id="matricula-nome-aluno"
        rotulo={menor ? 'Nome de quem vai treinar' : 'Seu nome'}
        erro={erros.nomeAluno}
        input={{
          type: 'text',
          autoComplete: menor ? 'off' : 'name',
          maxLength: 100,
          value: dados.nomeAluno,
          onChange: (e) => alterar('nomeAluno', e.target.value),
        }}
      />

      <Campo
        id="matricula-data-nascimento"
        rotulo={menor ? 'Data de nascimento de quem vai treinar' : 'Sua data de nascimento'}
        erro={erros.dataNascimento}
        input={{
          type: 'date',
          max: new Date().toISOString().slice(0, 10),
          value: dados.dataNascimento,
          onChange: (e) => alterar('dataNascimento', e.target.value),
        }}
      />

      <Campo
        id="matricula-cpf"
        rotulo={menor ? 'CPF do responsável' : 'Seu CPF'}
        ajuda="O CPF é enviado só para o Asaas, para gerar o pagamento. Não fica guardado no nosso site."
        erro={erros.cpfPagador}
        input={{
          type: 'text',
          inputMode: 'numeric',
          autoComplete: 'off',
          placeholder: '000.000.000-00',
          value: dados.cpfPagador,
          onChange: (e) => alterar('cpfPagador', formatarCpf(e.target.value)),
        }}
      />

      <Campo
        id="matricula-email"
        rotulo={menor ? 'E-mail do responsável' : 'Seu e-mail'}
        ajuda="O Asaas usa esse e-mail para avisar sobre a fatura."
        erro={erros.emailPagador}
        input={{
          type: 'email',
          autoComplete: 'email',
          maxLength: 190,
          value: dados.emailPagador,
          onChange: (e) => alterar('emailPagador', e.target.value),
        }}
      />

      <Campo
        id="matricula-whatsapp"
        rotulo={menor ? 'WhatsApp do responsável' : 'Seu WhatsApp'}
        ajuda="A academia usa esse número para falar sobre a matrícula."
        erro={erros.whatsappPagador}
        input={{
          type: 'tel',
          inputMode: 'tel',
          autoComplete: 'tel-national',
          placeholder: '(41) 99999-9999',
          value: dados.whatsappPagador,
          onChange: (e) => alterar('whatsappPagador', formatarWhatsapp(e.target.value)),
        }}
      />

      {/* Honeypot: escondido de pessoas e leitores de tela. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="matricula-empresa">Empresa</label>
        <input
          id="matricula-empresa"
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

interface PassoTurmasProps extends RefTitulo {
  dados: DadosMatricula;
  onAlternar: (id: string) => void;
  onVoltar: () => void;
  onContinuar: () => void;
}

function PassoTurmas({ tituloRef, dados, onAlternar, onVoltar, onContinuar }: PassoTurmasProps) {
  const disponiveis = turmasParaEscolher(dados.plano === 'uma-modalidade' ? dados.modalidade : '');

  return (
    <>
      <Titulo tituloRef={tituloRef}>Turmas que pretende frequentar</Titulo>
      <p className="mt-3 text-tom-apoio">Opcional — ajuda a gente a te colocar na turma certa. Pode escolher mais de uma, ou nenhuma agora.</p>

      <ul className="mt-6 grid gap-2">
        {disponiveis.map((t) => (
          <li key={t.id}>
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-tom-borda p-4 transition-colors hover:border-tom-texto has-checked:border-tom-texto">
              <input type="checkbox" checked={dados.turmas.includes(t.id)} onChange={() => onAlternar(t.id)} className="size-5 shrink-0 accent-vermelho" />
              <span className="min-w-0">
                <span className="block font-semibold">{t.nome}</span>
                <span className="block text-sm text-tom-suave">
                  {t.provisorio ? 'Horário a confirmar' : `${diasPorExtenso(t.dias)}, ${faixaHorario(t.inicio, t.fim)}`}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
        <Botao variante="secundario" tamanho="lg" className="w-full sm:w-auto" onClick={onVoltar}>
          Voltar
        </Botao>
        <Botao tamanho="lg" className="w-full sm:flex-1" onClick={onContinuar}>
          Continuar
        </Botao>
      </div>
    </>
  );
}

function ResumoMatricula({ dados, plano, onTrocarPlano }: { dados: DadosMatricula; plano: Plano; onTrocarPlano: () => void }) {
  const menor = ehMenorEscolha(dados);
  const turmasEscolhidas = dados.turmas.map((id) => turmaMatriculaPorId(id)).filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="mt-5 rounded-xl bg-tom-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">
            {plano.nome}
            {dados.modalidade && ` · ${nomeModalidade(dados.modalidade)}`}
          </p>
          <p className="font-display text-2xl leading-none font-extrabold">{preco(valorPlano(plano))}/mês</p>
        </div>
        <button type="button" onClick={onTrocarPlano} className="shrink-0 font-semibold text-tom-texto underline underline-offset-4">
          Trocar o plano
        </button>
      </div>

      <p className="mt-4 text-tom-apoio">
        {menor ? (
          <>
            {dados.nomeAluno} (responsável: {dados.nomeResponsavel})
          </>
        ) : (
          dados.nomeAluno
        )}
      </p>

      {turmasEscolhidas.length > 0 && (
        <p className="mt-1 text-tom-apoio">Turmas: {turmasEscolhidas.map((t) => t.nome).join(', ')}</p>
      )}
    </div>
  );
}

interface TermoProps {
  dados: DadosMatricula;
  erros: ErrosMatricula;
  alterar: <K extends keyof DadosMatricula>(campo: K, valor: DadosMatricula[K]) => void;
}

function TermoEConsentimento({ dados, erros, alterar }: TermoProps) {
  return (
    <div className="mt-6 space-y-5">
      <details className="rounded-lg border border-tom-borda p-4">
        <summary className="cursor-pointer font-semibold">Ler o termo de adesão (versão {regrasMatricula.termoAdesao.versao})</summary>
        <p className="mt-3 whitespace-pre-line text-sm text-tom-apoio">{regrasMatricula.termoAdesao.texto}</p>
      </details>

      <div data-invalido={!!erros.aceiteTermo}>
        <label className="flex cursor-pointer items-start gap-3 text-tom-apoio">
          <input
            type="checkbox"
            checked={dados.aceiteTermo}
            onChange={(e) => alterar('aceiteTermo', e.target.checked)}
            aria-invalid={!!erros.aceiteTermo}
            aria-describedby={erros.aceiteTermo ? 'matricula-termo-erro' : undefined}
            className="mt-1 size-5 shrink-0 accent-vermelho"
          />
          <span>Li e aceito o termo de adesão.</span>
        </label>
        <Erro id="matricula-termo-erro" texto={erros.aceiteTermo} />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-tom-apoio">
        <input
          type="checkbox"
          checked={dados.imagemAutorizada}
          onChange={(e) => alterar('imagemAutorizada', e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-vermelho"
        />
        <span>{regrasMatricula.autorizacaoImagem} (opcional)</span>
      </label>

      <div data-invalido={!!erros.consentimento}>
        <label className="flex cursor-pointer items-start gap-3 text-tom-apoio">
          <input
            type="checkbox"
            checked={dados.consentimento}
            onChange={(e) => alterar('consentimento', e.target.checked)}
            aria-invalid={!!erros.consentimento}
            aria-describedby={erros.consentimento ? 'matricula-consentimento-erro' : undefined}
            className="mt-1 size-5 shrink-0 accent-vermelho"
          />
          <span>
            Concordo que a Academia Scuzziato use esses dados para a matrícula.{' '}
            <a href="#privacidade" className="font-semibold text-tom-texto underline underline-offset-4">
              Aviso de privacidade
            </a>
          </span>
        </label>
        <Erro id="matricula-consentimento-erro" texto={erros.consentimento} />
      </div>
    </div>
  );
}

interface ProntoProps extends RefTitulo {
  plano: Plano;
  dados: DadosMatricula;
  resultado: { faturaUrl: string; jaExiste?: boolean };
  onFechar: () => void;
}

function Pronto({ tituloRef, dados, resultado, onFechar }: ProntoProps) {
  const menor = ehMenorEscolha(dados);
  const nome = (dados.nomeAluno.trim().split(/\s+/)[0] ?? '') || 'você';

  return (
    <div role="status">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-vermelho text-branco">
        <IconCheck className="size-7" />
      </span>
      <div className="mt-5">
        <Titulo tituloRef={tituloRef}>Falta só o pagamento!</Titulo>
      </div>
      <p className="mt-3 text-lg text-tom-apoio">
        {resultado.jaExiste
          ? `Você já tinha uma matrícula aguardando pagamento, ${nome}. Aqui está o link da fatura de novo.`
          : `A matrícula de ${menor ? dados.nomeAluno : nome} é confirmada assim que o pagamento da primeira mensalidade for aprovado.`}
      </p>

      <div className="mt-6 grid gap-3">
        <ButtonLink href={resultado.faturaUrl} {...linkExterno} icone={<IconSeta className="size-5" />}>
          Ir para o pagamento
        </ButtonLink>
        <ButtonLink href={whatsappLink()} {...linkExterno} variante="secundario" icone={<IconWhatsApp className="size-5" />}>
          Falar no WhatsApp
        </ButtonLink>
      </div>

      <Botao variante="secundario" tamanho="lg" className="mt-8 w-full" onClick={onFechar}>
        Fechar
      </Botao>
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
