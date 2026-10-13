import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
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
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconCheck, IconWhatsApp } from '../components/ui/icons';

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
  const nomes = modalidadesEmFormacao.map((m) => m.nome.toLowerCase()).join(' e ');

  return (
    <Section id="em-formacao">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <SectionHeading
            id="em-formacao"
            sobretitulo="Turmas em formação"
            titulo={<>Vem aí: {nomes}</>}
            descricao="Conte pra gente quais dias e horários funcionam para você. Assim a gente abre as turmas no horário certo e te avisa quando começar."
          />
        </div>
        <Reveal>
          <FormularioInteresse />
        </Reveal>
      </div>
    </Section>
  );
}

function FormularioInteresse() {
  const [dados, setDados] = useState<DadosInteresse>(() => ({ ...VAZIO, modalidade: modalidadeDaUrl() }));
  const [erros, setErros] = useState<ErrosInteresse>({});
  const [erroGeral, setErroGeral] = useState('');
  const [status, setStatus] = useState<Status>('preenchendo');
  const formRef = useRef<HTMLFormElement>(null);
  const sucessoRef = useRef<HTMLHeadingElement>(null);

  // "Quero ser avisado" na seção Modalidades marca a modalidade aqui.
  useEffect(
    () =>
      aoEscolherModalidade((modalidade) => {
        setDados((d) => ({ ...d, modalidade }));
        setErros((e) => ({ ...e, modalidade: undefined }));
        setStatus((s) => (s === 'sucesso' ? 'preenchendo' : s));
      }),
    [],
  );

  useEffect(() => {
    if (status === 'sucesso') sucessoRef.current?.focus();
  }, [status]);

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

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (status === 'enviando') return;

    const encontrados = validarInteresse(dados);
    setErros(encontrados);
    setErroGeral('');
    if (Object.keys(encontrados).length > 0) {
      focarPrimeiroErro();
      return;
    }

    setStatus('enviando');
    try {
      const resposta = await enviarInteresse(dados);
      if (resposta.ok) {
        trackInteresseEnviado(dados.modalidade);
        setStatus('sucesso');
        return;
      }
      setErros(resposta.campos ?? {});
      setErroGeral(resposta.erro);
      focarPrimeiroErro();
    } catch {
      setErroGeral('Não conseguimos enviar agora. Tente de novo em instantes ou fale com a gente no WhatsApp.');
    }
    setStatus('preenchendo');
  }

  function novoEnvio() {
    // Mantém nome e WhatsApp para facilitar marcar a outra modalidade.
    setDados((d) => ({ ...VAZIO, nome: d.nome, whatsapp: d.whatsapp, publico: d.publico, idadeCrianca: d.idadeCrianca }));
    setStatus('preenchendo');
  }

  if (status === 'sucesso' && dados.modalidade) {
    const modalidade = nomeModalidade(dados.modalidade);
    const primeiroNome = dados.nome.trim().split(/\s+/)[0];
    return (
      <div className="rounded-2xl border border-cinza-700 bg-cinza-900 p-6 md:p-8" role="status">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-vermelho text-branco">
          <IconCheck className="size-7" />
        </span>
        <h3 ref={sucessoRef} tabIndex={-1} className="mt-5 font-display text-4xl leading-none font-black uppercase outline-none">
          Pronto, {primeiroNome}!
        </h3>
        <p className="mt-3 text-lg text-cinza-200">
          Você está na lista da turma de {modalidade.toLowerCase()}. Quando a turma abrir, a gente te chama no WhatsApp.
        </p>
        <p className="mt-6 font-semibold">Conhece alguém que também quer treinar?</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensagens.aviseAmigoTurma(modalidade.toLowerCase(), linkFormulario(dados.modalidade as Modalidade)))}`}
            {...linkExterno}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-vermelho px-7 font-display text-xl font-extrabold text-branco uppercase transition-colors hover:bg-vermelho-escuro"
          >
            <IconWhatsApp className="size-5" /> Avise um amigo
          </a>
          <button
            type="button"
            onClick={novoEnvio}
            className="inline-flex min-h-14 items-center justify-center rounded-lg border-2 border-cinza-500 px-7 font-display text-xl font-extrabold uppercase hover:border-branco hover:bg-cinza-800"
          >
            Marcar outra modalidade
          </button>
        </div>
      </div>
    );
  }

  const infantil = dados.publico === 'infantil';

  return (
    <form
      ref={formRef}
      onSubmit={enviar}
      noValidate
      className="space-y-7 rounded-2xl border border-cinza-700 bg-cinza-900 p-5 sm:p-6 md:p-8"
    >
      <Opcoes
        legenda="Modalidade"
        nome="modalidade"
        tipo="radio"
        opcoes={MODALIDADES}
        marcado={(v) => dados.modalidade === v}
        onChange={(v) => alterar('modalidade', v)}
        erro={erros.modalidade}
      />

      <Opcoes
        legenda="Para quem é a turma?"
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

      <Opcoes
        legenda="Dias que você pode treinar"
        ajuda="Marque todos que funcionam."
        nome="dias"
        tipo="checkbox"
        opcoes={DIAS}
        marcado={(v) => dados.dias.includes(v)}
        onChange={alternarDia}
        erro={erros.dias}
      />

      <Opcoes
        legenda="Melhor período"
        nome="periodo"
        tipo="radio"
        opcoes={PERIODOS}
        marcado={(v) => dados.periodo === v}
        onChange={(v) => alterar('periodo', v)}
        erro={erros.periodo}
      />

      {/* Honeypot: escondido de pessoas e leitores de tela. */}
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

      <div data-invalido={!!erros.consentimento}>
        <label className="flex cursor-pointer items-start gap-3 text-cinza-200">
          <input
            type="checkbox"
            checked={dados.consentimento}
            onChange={(e) => alterar('consentimento', e.target.checked)}
            aria-invalid={!!erros.consentimento}
            aria-describedby={erros.consentimento ? 'interesse-consentimento-erro' : undefined}
            className="mt-1 size-5 shrink-0 accent-vermelho"
          />
          <span>
            Concordo que a Arena Pinhais use esses dados para me avisar sobre a abertura da turma.{' '}
            <a href="#privacidade" className="font-semibold text-branco underline underline-offset-4">
              Aviso de privacidade
            </a>
          </span>
        </label>
        <Erro id="interesse-consentimento-erro" texto={erros.consentimento} />
      </div>

      {erroGeral && (
        <div role="alert" className="rounded-lg border border-vermelho-claro p-4 text-cinza-200">
          <p>{erroGeral}</p>
          <a
            href={whatsappLink()}
            {...linkExterno}
            className="mt-2 inline-flex items-center gap-2 font-semibold text-branco underline underline-offset-4"
          >
            <IconWhatsApp className="size-5" /> Falar no WhatsApp
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'enviando'}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-vermelho px-7 font-display text-xl font-extrabold text-branco uppercase transition-colors hover:bg-vermelho-escuro disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {status === 'enviando' ? 'Enviando…' : 'Quero ser avisado'}
      </button>
    </form>
  );
}

/* ---------- campos ---------- */

interface CampoProps {
  id: string;
  rotulo: string;
  ajuda?: string;
  erro?: string;
  className?: string;
  input: InputHTMLAttributes<HTMLInputElement>;
}

function Campo({ id, rotulo, ajuda, erro, className = '', input }: CampoProps) {
  const descricoes = [ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {rotulo}
      </label>
      {ajuda && (
        <p id={`${id}-ajuda`} className="-mt-1 mb-2 text-sm text-cinza-400">
          {ajuda}
        </p>
      )}
      <input
        id={id}
        {...input}
        aria-invalid={!!erro}
        aria-describedby={descricoes}
        className={`min-h-12 w-full rounded-lg border-2 bg-preto px-4 text-lg text-branco placeholder:text-cinza-500 focus:border-branco focus:outline-none ${
          erro ? 'border-vermelho-claro' : 'border-cinza-700'
        }`}
      />
      <Erro id={`${id}-erro`} texto={erro} />
    </div>
  );
}

interface OpcoesProps<T extends string> {
  legenda: string;
  ajuda?: string;
  nome: string;
  tipo: 'radio' | 'checkbox';
  opcoes: { valor: T; label: string }[];
  marcado: (valor: T) => boolean;
  onChange: (valor: T) => void;
  erro?: string;
}

function Opcoes<T extends string>({ legenda, ajuda, nome, tipo, opcoes, marcado, onChange, erro }: OpcoesProps<T>) {
  const id = `interesse-${nome}`;
  const descricoes = [ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset data-invalido={!!erro} aria-describedby={descricoes}>
      <legend className="mb-2 font-semibold">{legenda}</legend>
      {ajuda && (
        <p id={`${id}-ajuda`} className="-mt-1 mb-2 text-sm text-cinza-400">
          {ajuda}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <Opcao key={opcao.valor} invalido={!!erro}>
            <input
              type={tipo}
              name={nome}
              value={opcao.valor}
              checked={marcado(opcao.valor)}
              onChange={() => onChange(opcao.valor)}
              className="sr-only"
            />
            {opcao.label}
          </Opcao>
        ))}
      </div>
      <Erro id={`${id}-erro`} texto={erro} />
    </fieldset>
  );
}

function Opcao({ children, invalido }: { children: ReactNode; invalido: boolean }) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 font-semibold text-cinza-200 transition-colors select-none hover:border-cinza-500 hover:text-branco has-checked:border-branco has-checked:bg-branco has-checked:text-preto has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-branco ${
        invalido ? 'border-vermelho-claro' : 'border-cinza-700'
      }`}
    >
      {children}
    </label>
  );
}

function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-2 text-sm font-semibold text-vermelho-claro">
      {texto}
    </p>
  );
}
