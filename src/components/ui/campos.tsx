import type { InputHTMLAttributes, ReactNode } from 'react';

/*
 * Campos de formulário (turmas em formação e agendamento da aula experimental).
 * As cores vêm do tom em volta (usar dentro de um cartão .tom-claro).
 */
interface CampoProps {
  id: string;
  rotulo: string;
  ajuda?: string;
  erro?: string;
  className?: string;
  input: InputHTMLAttributes<HTMLInputElement>;
}

export function Campo({ id, rotulo, ajuda, erro, className = '', input }: CampoProps) {
  const descricoes = [ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {rotulo}
      </label>
      {ajuda && (
        <p id={`${id}-ajuda`} className="-mt-1 mb-2 text-sm text-tom-suave">
          {ajuda}
        </p>
      )}
      <input
        id={id}
        {...input}
        aria-invalid={!!erro}
        aria-describedby={descricoes}
        className={`min-h-12 w-full rounded-lg border-2 bg-tom-fundo px-4 text-lg text-tom-texto placeholder:text-tom-suave focus:border-tom-texto focus:outline-none ${
          erro ? 'border-tom-destaque' : 'border-tom-borda-forte'
        }`}
      />
      <Erro id={`${id}-erro`} texto={erro} />
    </div>
  );
}

interface OpcoesProps<T extends string> {
  /** Prefixo dos ids de ajuda e erro (ex.: 'interesse-dias'). */
  id: string;
  legenda: string;
  ajuda?: string;
  nome: string;
  tipo: 'radio' | 'checkbox';
  opcoes: { valor: T; label: string }[];
  marcado: (valor: T) => boolean;
  onChange: (valor: T) => void;
  erro?: string;
}

export function Opcoes<T extends string>({ id, legenda, ajuda, nome, tipo, opcoes, marcado, onChange, erro }: OpcoesProps<T>) {
  const descricoes = [ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset data-invalido={!!erro} aria-describedby={descricoes}>
      <legend className="mb-2 font-semibold">{legenda}</legend>
      {ajuda && (
        <p id={`${id}-ajuda`} className="-mt-1 mb-2 text-sm text-tom-suave">
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
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 font-semibold text-tom-apoio transition-colors select-none hover:border-tom-texto hover:text-tom-texto has-checked:border-tom-texto has-checked:bg-tom-texto has-checked:text-tom-fundo has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-tom-texto ${
        invalido ? 'border-tom-destaque' : 'border-tom-borda-forte'
      }`}
    >
      {children}
    </label>
  );
}

export function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-2 text-sm font-semibold text-tom-destaque">
      {texto}
    </p>
  );
}
