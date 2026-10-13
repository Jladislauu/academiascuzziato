export type Modalidade = 'jiu-jitsu' | 'judo' | 'muay-thai' | 'boxe';
export type Publico = 'infantil' | 'juvenil-adulto';
export type Dia = 'seg' | 'ter' | 'qua' | 'qui' | 'sex';

export interface Turma {
  id: string;
  modalidade: Modalidade;
  nome: string;
  /** Usado no filtro da grade. */
  publico: Publico;
  /** Texto exibido no card, quando diferente do público do filtro (ex.: "Adulto"). */
  publicoLabel?: string;
  nivel: string | null;
  /** Aviso de nível em destaque no card (ex.: "Avançado — para quem já treina"). */
  nivelAviso?: string;
  /** Selo de destaque (ex.: "Ideal para começar"). */
  selo?: string;
  /** null = "Professor a definir". */
  professor: string | null;
  dias: Dia[];
  /** "HH:MM" */
  inicio: string;
  /** "HH:MM" */
  fim: string;
  aulaExperimental: boolean;
  /** true = dias e horário NÃO aparecem no site; mostra "Horário a confirmar". */
  provisorio: boolean;
  /** IDs do Easy!Appointments para abrir a agenda já na turma. */
  agendaProviderId?: number;
  agendaServiceId?: number;
}

export type PlanoId = 'uma-modalidade' | 'livre';

export interface Plano {
  id: PlanoId;
  nome: string;
  precoMensal: number;
  descricao: string;
  inclui: string[];
  recomendado: boolean;
  /** Frase de destaque no card (ex.: "Por R$ 40 a mais, treine tudo"). */
  chamada?: string;
}

export interface Config {
  siteUrl: string;
  agendaUrl: string;
  /** Só dígitos, com 55 + DDD. Vazio = ainda não recebido. */
  whatsapp: string;
  instagram: string;
  email: string;
  endereco: {
    rua: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  funcionamento: string;
  vagasPorAula: number;
  avisoPrivacidade: string;
  /** Endpoint PHP do formulário "Turmas em formação". */
  interesseEndpoint: string;
  /** Link do gateway por plano. null = botão abre o WhatsApp com mensagem pronta. */
  matriculaLinks: Record<PlanoId, string | null>;
}

export interface Foto {
  src: string;
  alt: string;
  largura: number;
  altura: number;
}

export interface Professor {
  id: string;
  /** Igual ao `professor` em turmas.ts: as turmas do card saem de lá. */
  nome: string;
  faixa: string | null;
  bio: string | null;
  foto: Foto | null;
}

export interface FotoEstrutura {
  foto: Foto | null;
  legenda: string | null;
}

export type PublicoInteresse = 'adulto' | 'infantil';
export type Periodo = 'manha' | 'tarde' | 'noite';

export interface ModalidadeInfo {
  id: Modalidade;
  nome: string;
  descricao: string;
  publicos: string[];
  niveis: string[];
  emFormacao: boolean;
}

export interface FaqItem {
  pergunta: string;
  resposta: string;
  /**
   * false = rascunho que depende de regra da academia. Aparece só no `npm run dev`
   * (com selo de rascunho); no site publicado, a pergunta leva para o WhatsApp.
   */
  confirmado: boolean;
}
