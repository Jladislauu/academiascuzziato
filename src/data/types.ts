export type Modalidade = 'jiu-jitsu' | 'judo' | 'muay-thai' | 'boxe';
export type Publico = 'infantil' | 'juvenil-adulto';
export type Dia = 'seg' | 'ter' | 'qua' | 'qui' | 'sex';
/** Dias de funcionamento (a grade de turmas usa só Dia, de segunda a sexta). */
export type DiaSemana = Dia | 'sab' | 'dom';

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
  /** Professor da turma. null = "a definir". */
  professor: string | null;
  /**
   * Professor diferente em algum dia (ex.: { qua: 'Camilo Scuzziato' }).
   * null num dia = professor a confirmar nesse dia: a aula aparece na grade,
   * mas esse dia não abre para agendamento.
   */
  professorPorDia?: Partial<Record<Dia, string | null>>;
  /** Aviso curto no card e na confirmação do agendamento (ex.: "No tatame da frente"). */
  observacao?: string;
  dias: Dia[];
  /** "HH:MM" */
  inicio: string;
  /** "HH:MM" */
  fim: string;
  aulaExperimental: boolean;
  /** true = dias e horário NÃO aparecem no site; mostra "Horário a confirmar". */
  provisorio: boolean;
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
  /** Endpoint PHP do agendamento da aula experimental (próximas aulas e reserva). */
  agendamentoEndpoint: string;
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
  /** Horário da academia. Vira o texto do site e o horário do schema.org. */
  funcionamento: {
    dias: DiaSemana[];
    /** "HH:MM" */
    abre: string;
    /** "HH:MM" */
    fecha: string;
  };
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

export interface Destaque {
  texto: string;
  /**
   * false = rascunho ainda não confirmado. Aparece só no `npm run dev` (com selo
   * de rascunho) e não vai para o site publicado. Mesmo esquema do FAQ.
   */
  confirmado: boolean;
}

export interface Professor {
  id: string;
  /** Igual ao `professor` em turmas.ts: as turmas do card saem de lá. */
  nome: string;
  faixa: string | null;
  /** Frase curta abaixo do nome (o papel do professor na academia). */
  chamada: string | null;
  /** 2 a 3 frases, falando com o visitante. */
  bio: string | null;
  /** No máximo 4, contando os rascunhos. */
  destaques: Destaque[];
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
  /** Nome da equipe (ex.: "Scuzziato Team Jiu-Jitsu"), subtítulo do card. */
  equipe: string;
  descricao: string;
  publicos: string[];
  niveis: string[];
  emFormacao: boolean;
  /** Foto do card (3:2). */
  foto: Foto | null;
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

export interface Seo {
  /** <title>: o que aparece no Google. Até ~60 caracteres. */
  titulo: string;
  /** Descrição no Google. Até ~155 caracteres. */
  descricao: string;
  /** Cartão de compartilhamento (WhatsApp, Instagram, Facebook). */
  compartilhamento: {
    titulo: string;
    descricao: string;
    /** Caminho em public/, 1200x630. */
    imagem: string;
    imagemAlt: string;
  };
}
