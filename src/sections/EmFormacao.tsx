import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { mensagens } from '../data/config';
import { nomeModalidade } from '../data/modalidades';
import type { Dia, Modalidade, Periodo, PublicoInteresse } from '../data/types';
import { trackInteresseEnviado } from '../lib/analytics';
import {
  IDADE_MAX,
  IDADE_MIN,
  aoEscolherModalidade,
  enviarInteresse,
  formatarWhatsapp,
  linkFormulario,
  modalidadeDaUrl,
  modalidadesEmFormacao,
  validarInteresse,
  type DadosInteresse,
  type ErrosInteresse,
} from '../lib/interesse';
import { linkExterno, whatsappLink } from '../lib/links';
import { Botao, ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { Campo, Erro, Opcoes } from '../components/ui/campos';
import { IconCheck, IconSeta, IconWhatsApp } from '../components/ui/icons';

const DIAS: { valor: Dia; label: string }[] = [
  { valor: 'seg', label: 'Seg' },
  { valor: 'ter', label: 'Ter' },
  { valor: 'qua', label: 'Qua' },
  { valor: 'qui', label: 'Qui' },
  { valor: 'sex', label: 'Sex' },
];

const PUBLICOS: { valor: PublicoInteresse; label: string }[] = [
  { valor: 'adulto', label: 'Adulto' },
  { valor: 'infantil', label: 'Infantil' },
];

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 'manha', label: 'Manhã' },
  { valor: 'tarde', label: 'Tarde' },
  { valor: 'noite', label: 'Noite' },
];

const MODALIDADES = modalidadesEmFormacao.map((m) => ({ valor: m.id, label: m.nome }));

/** Os três passos do formulário e os campos que cada um valida. */
const PASSOS: { titulo: string; campos: (keyof DadosInteresse)[] }[] = [
  { titulo: 'Modalidade', campos: ['modalidade', 'publico', 'idadeCrianca'] },
  { titulo: 'Quando você treinaria?', campos: ['dias', 'periodo'] },
  { titulo: 'Seu contato', campos: ['nome', 'whatsapp', 'consentimento'] },
];
const ULTIMO = PASSOS.length - 1;

/** Passo de um campo (para voltar ao passo certo quando o servidor recusa algo). */
const passoDoCampo = (campo: string) => PASSOS.findIndex((p) => p.campos.includes(campo as keyof DadosInteresse));

const VAZIO: DadosInteresse = {
  nome: '',
  whatsapp: '',
  modalidade: '',
  publico: '',
  idadeCrianca: '',
  dias: [],
  periodo: '',
  consentimento: false,
  empresa: '',
};

type Status = 'preenchendo' | 'enviando' | 'sucesso';

export function EmFormacao() {
  const nomes = modalidadesEmFormacao.map((m) => m.nome).join(' e ');

  return (
    <Section
      id="em-formacao"
      tom="vermelho"
      corte
      granulado
      decoracao={
        // Fotos das modalidades em preto e branco, misturadas ao vermelho (multiply só escurece: o texto branco não perde contraste)
        <div className="absolute inset-0 grid grid-cols-2">
          {modalidadesEmFormacao.map(
            (m) =>
              m.foto && (
                <img
                  key={m.id}
                  src={m.foto.src}
                  alt=""
                  width={m.foto.largura}
                  height={m.foto.altura}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover opacity-55 mix-blend-multiply grayscale"
                />
              ),
          )}
        </div>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-16">
        <div>
          <SectionHeading
            id="em-formacao"
            sobretitulo="Turmas em formação"
            titulo={<>Vem aí: {nomes}</>}
            descricao="A turma abre no dia e no horário que a maioria escolher. Deixe seu interesse em um minuto: você ajuda a definir a turma e a gente te avisa quando começar."
            className="mb-6"
          />
          <Reveal>
            <ul className="flex flex-wrap gap-2 text-sm font-semibold">
              {['Adulto e infantil', 'Sem compromisso', 'Aviso pelo WhatsApp'].map((t) => (
                <li key={t} className="rounded-full border border-tom-borda px-3 py-1.5">
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal>
          <FormularioInteresse />
        </Reveal>
      </div>
    </Section>
  );
}

function FormularioInteresse() {
  const [dados, setDados] = useState<DadosInteresse>(VAZIO);
  const [passo, setPasso] = useState(0);
  const [erros, setErros] = useState<ErrosInteresse>({});
  const [erroGeral, setErroGeral] = useState('');
  const [status, setStatus] = useState<Status>('preenchendo');
  const formRef = useRef<HTMLFormElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const sucessoRef = useRef<HTMLHeadingElement>(null);
  // Só move o foco quando a pessoa troca de passo (não ao carregar a página).
  const trocouPasso = useRef(false);

  // Link com ?modalidade=boxe já marca a modalidade. Fica num efeito (e não no
  // useState) porque o HTML é pré-renderizado no build, sem URL do visitante.
  useEffect(() => {
    const modalidade = modalidadeDaUrl();
    if (modalidade) setDados((d) => ({ ...d, modalidade }));
  }, []);

  // "Quero ser avisado" na seção Modalidades marca a modalidade e volta ao passo 1.
  useEffect(
    () =>
      aoEscolherModalidade((modalidade) => {
        setDados((d) => ({ ...d, modalidade }));
        setErros((e) => ({ ...e, modalidade: undefined }));
        setPasso(0);
        setStatus((s) => (s === 'sucesso' ? 'preenchendo' : s));
      }),
    [],
  );

  useEffect(() => {
    if (!trocouPasso.current) return;
    trocouPasso.current = false;
    tituloRef.current?.focus();
  }, [passo]);

  useEffect(() => {
    if (status === 'sucesso') sucessoRef.current?.focus();
  }, [status]);

  function irPara(novo: number) {
    trocouPasso.current = true;
    setPasso(novo);
  }

  function alterar<K extends keyof DadosInteresse>(campo: K, valor: DadosInteresse[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function alternarDia(dia: Dia) {
    alterar('dias', dados.dias.includes(dia) ? dados.dias.filter((d) => d !== dia) : [...dados.dias, dia]);
  }

  function focarPrimeiroErro() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido="true"] input')?.focus();
    });
  }

  /** Erros só dos campos de um passo. */
  function errosDoPasso(p: number): ErrosInteresse {
    const todos = validarInteresse(dados);
    return Object.fromEntries(Object.entries(todos).filter(([campo]) => PASSOS[p].campos.includes(campo as keyof DadosInteresse)));
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (status === 'enviando') return;
    setErroGeral('');

    // Passos 1 e 2: valida só o passo atual e avança.
    if (passo < ULTIMO) {
      const doPasso = errosDoPasso(passo);
      setErros(doPasso);
      if (Object.keys(doPasso).length > 0) return focarPrimeiroErro();
      return irPara(passo + 1);
    }

    // Último passo: valida tudo; se algo de um passo anterior faltar, volta para ele.
    const todos = validarInteresse(dados);
    setErros(todos);
    const campos = Object.keys(todos);
    if (campos.length > 0) {
      const primeiro = Math.min(...campos.map(passoDoCampo));
      return primeiro < passo ? irPara(primeiro) : focarPrimeiroErro();
    }

    setStatus('enviando');
    try {
      const resposta = await enviarInteresse(dados);
      if (resposta.ok) {
        trackInteresseEnviado(dados.modalidade);
        setStatus('sucesso');
        return;
      }
      // Erro do servidor: volta ao passo do primeiro campo com problema.
      const recusados = Object.keys(resposta.campos ?? {});
      setErros(resposta.campos ?? {});
      setErroGeral(resposta.erro);
      const alvo = recusados.length ? Math.min(...recusados.map(passoDoCampo).filter((p) => p >= 0)) : passo;
      if (alvo !== passo) irPara(alvo);
      else focarPrimeiroErro();
    } catch {
      setErroGeral('Não conseguimos enviar agora. Tente de novo em instantes ou fale com a gente no WhatsApp.');
    }
    setStatus('preenchendo');
  }

  // Enter num chip (radio/checkbox) também avança, como num campo de texto.
  function aoTeclar(e: KeyboardEvent<HTMLFormElement>) {
    const alvo = e.target as HTMLInputElement;
    if (e.key === 'Enter' && alvo.tagName === 'INPUT' && (alvo.type === 'radio' || alvo.type === 'checkbox')) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function novoEnvio() {
    // Mantém contato e público para facilitar marcar a outra modalidade.
    setDados((d) => ({ ...VAZIO, nome: d.nome, whatsapp: d.whatsapp, publico: d.publico, idadeCrianca: d.idadeCrianca }));
    setErros({});
    setPasso(0);
    setStatus('preenchendo');
  }

  const cartao = 'tom-claro rounded-2xl bg-tom-fundo p-5 text-tom-texto shadow-2xl shadow-preto/30 sm:p-7 md:p-8';

  if (status === 'sucesso' && dados.modalidade) {
    const modalidade = nomeModalidade(dados.modalidade);
    const primeiroNome = dados.nome.trim().split(/\s+/)[0];
    return (
      <div className={cartao} role="status">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-vermelho text-branco">
          <IconCheck className="size-7" />
        </span>
        <h3 ref={sucessoRef} tabIndex={-1} className="mt-5 font-display text-4xl leading-none font-black uppercase outline-none">
          Pronto, {primeiroNome}!
        </h3>
        <p className="mt-3 text-lg text-tom-apoio">
          Você está na lista da turma de {modalidade.toLowerCase()}. Quando a turma abrir, a gente te chama no WhatsApp.
        </p>
        <p className="mt-6 font-semibold">Conhece alguém que também quer treinar?</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={`https://wa.me/?text=${encodeURIComponent(mensagens.aviseAmigoTurma(modalidade.toLowerCase(), linkFormulario(dados.modalidade as Modalidade)))}`}
            {...linkExterno}
            tamanho="lg"
            icone={<IconWhatsApp className="size-5" />}
          >
            Avise um amigo
          </ButtonLink>
          <Botao variante="secundario" tamanho="lg" onClick={novoEnvio}>
            Marcar outra modalidade
          </Botao>
        </div>
      </div>
    );
  }

  const infantil = dados.publico === 'infantil';
  const enviando = status === 'enviando';

  return (
    <form ref={formRef} onSubmit={aoEnviar} onKeyDown={aoTeclar} noValidate className={cartao} aria-labelledby="interesse-titulo-passo">
      {/* Progresso */}
      <p className="text-sm font-semibold tracking-[0.12em] text-tom-destaque uppercase">
        Passo {passo + 1} de {PASSOS.length}
      </p>
      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-tom-chip">
        <div
          className="h-full rounded-full bg-vermelho transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${((passo + 1) / PASSOS.length) * 100}%` }}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {`Passo ${passo + 1} de ${PASSOS.length}: ${PASSOS[passo].titulo}`}
      </p>

      <div key={passo} className="passo-entrada mt-6 space-y-7">
        <h3
          ref={tituloRef}
          id="interesse-titulo-passo"
          tabIndex={-1}
          className="font-display text-3xl leading-none font-extrabold uppercase outline-none md:text-4xl"
        >
          {PASSOS[passo].titulo}
        </h3>

        {passo === 0 && (
          <>
            <Opcoes
              legenda="Qual modalidade?"
              id="interesse-modalidade"
              nome="modalidade"
              tipo="radio"
              opcoes={MODALIDADES}
              marcado={(v) => dados.modalidade === v}
              onChange={(v) => alterar('modalidade', v)}
              erro={erros.modalidade}
            />
            <Opcoes
              legenda="Para quem é a turma?"
              id="interesse-publico"
              nome="publico"
              tipo="radio"
              opcoes={PUBLICOS}
              marcado={(v) => dados.publico === v}
              onChange={(v) => alterar('publico', v)}
              erro={erros.publico}
            />
            {infantil && (
              <Campo
                id="interesse-idade"
                rotulo="Idade da criança"
                erro={erros.idadeCrianca}
                className="max-w-40"
                input={{
                  type: 'number',
                  inputMode: 'numeric',
                  min: IDADE_MIN,
                  max: IDADE_MAX,
                  value: dados.idadeCrianca,
                  onChange: (e) => alterar('idadeCrianca', e.target.value),
                }}
              />
            )}
          </>
        )}

        {passo === 1 && (
          <>
            <Opcoes
              legenda="Dias que você pode treinar"
              ajuda="Marque todos que funcionam."
              id="interesse-dias"
              nome="dias"
              tipo="checkbox"
              opcoes={DIAS}
              marcado={(v) => dados.dias.includes(v)}
              onChange={alternarDia}
              erro={erros.dias}
            />
            <Opcoes
              legenda="Melhor período"
              id="interesse-periodo"
              nome="periodo"
              tipo="radio"
              opcoes={PERIODOS}
              marcado={(v) => dados.periodo === v}
              onChange={(v) => alterar('periodo', v)}
              erro={erros.periodo}
            />
          </>
        )}

        {passo === 2 && (
          <>
            <Campo
              id="interesse-nome"
              rotulo={infantil ? 'Nome do responsável' : 'Seu nome'}
              ajuda={infantil ? 'Para turmas infantis, quem preenche é o responsável pela criança.' : undefined}
              erro={erros.nome}
              input={{
                type: 'text',
                autoComplete: 'name',
                maxLength: 100,
                value: dados.nome,
                onChange: (e) => alterar('nome', e.target.value),
              }}
            />
            <Campo
              id="interesse-whatsapp"
              rotulo="WhatsApp com DDD"
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
            <div data-invalido={!!erros.consentimento}>
              <label className="flex cursor-pointer items-start gap-3 text-tom-apoio">
                <input
                  type="checkbox"
                  checked={dados.consentimento}
                  onChange={(e) => alterar('consentimento', e.target.checked)}
                  aria-invalid={!!erros.consentimento}
                  aria-describedby={erros.consentimento ? 'interesse-consentimento-erro' : undefined}
                  className="mt-1 size-5 shrink-0 accent-vermelho"
                />
                <span>
                  Concordo que a Academia Scuzziato use esses dados para me avisar sobre a abertura da turma.{' '}
                  <a href="#privacidade" className="font-semibold text-tom-texto underline underline-offset-4">
                    Aviso de privacidade
                  </a>
                </span>
              </label>
              <Erro id="interesse-consentimento-erro" texto={erros.consentimento} />
            </div>
          </>
        )}
      </div>

      {/* Honeypot: fora dos passos, sempre no formulário. Escondido de pessoas e leitores de tela. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="interesse-empresa">Empresa</label>
        <input
          id="interesse-empresa"
          type="text"
          name="empresa"
          tabIndex={-1}
          autoComplete="off"
          value={dados.empresa}
          onChange={(e) => alterar('empresa', e.target.value)}
        />
      </div>

      {erroGeral && (
        <div role="alert" className="mt-6 rounded-lg border-2 border-tom-destaque p-4 text-tom-apoio">
          <p>{erroGeral}</p>
          <a
            href={whatsappLink()}
            {...linkExterno}
            className="mt-2 inline-flex items-center gap-2 font-semibold text-tom-texto underline underline-offset-4"
          >
            <IconWhatsApp className="size-5" /> Falar no WhatsApp
          </a>
        </div>
      )}

      {/* No celular, os dois botões empilhados com o principal em cima; a partir de sm, lado a lado. */}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
        {passo > 0 && (
          <Botao variante="secundario" tamanho="lg" className="w-full sm:w-auto" onClick={() => irPara(passo - 1)} disabled={enviando}>
            Voltar
          </Botao>
        )}
        <Botao type="submit" tamanho="lg" className="w-full sm:flex-1" disabled={enviando}>
          {passo < ULTIMO ? (
            <>
              Continuar <IconSeta className="size-5" />
            </>
          ) : enviando ? (
            'Enviando…'
          ) : (
            'Enviar meu interesse'
          )}
        </Botao>
      </div>
    </form>
  );
}
