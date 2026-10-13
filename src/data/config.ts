import type { Config } from './types';

export const config: Config = {
  // Produção. Na homologação (branch dev), o workflow troca por VITE_SITE_URL.
  siteUrl: import.meta.env?.VITE_SITE_URL || 'https://arenapinhais.com.br',

  // Provisório: Easy!Appointments. Vai ser trocado pela Thryve Agenda.
  agendaUrl: 'https://agenda.arenapinhais.com.br',

  // TODO: número do WhatsApp da academia, só dígitos (ex.: '5541999999999').
  // Enquanto estiver vazio, os botões abrem o WhatsApp sem destinatário.
  whatsapp: '',

  // TODO: URL do perfil no Instagram (ex.: 'https://instagram.com/arenapinhais').
  instagram: '',

  // TODO: e-mail de contato da academia.
  email: '',

  endereco: {
    rua: "R. Vicente D'Andréa, 617",
    bairro: 'Estância Pinhais',
    cidade: 'Pinhais',
    uf: 'PR',
    cep: '83323-190',
  },

  // Vira o texto "Segunda a sexta, 8h às 23h" no site e o horário no schema.org.
  funcionamento: {
    dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
    abre: '08:00',
    fecha: '23:00',
  },

  vagasPorAula: 5,

  // TODO: revisar o texto de privacidade com a academia.
  avisoPrivacidade:
    'Os dados que você envia pelo site, como nome e WhatsApp, são usados só para falar com você sobre as aulas da Arena Pinhais. Não vendemos nem compartilhamos seus dados. Para corrigir ou apagar seus dados, é só pedir pelo WhatsApp.',

  // Arquivo em public/api/; credenciais no config.local.php do servidor (ver server/).
  interesseEndpoint: '/api/interesse.php',

  matriculaLinks: {
    // TODO: links do gateway de pagamento (ainda não existem).
    'uma-modalidade': null,
    livre: null,
  },
};

/** Mensagens prontas do WhatsApp. */
export const mensagens = {
  geral: 'Olá! Vim pelo site da Arena Pinhais e quero tirar uma dúvida.',
  horariosTurma: (turma: string) => `Olá! Quero saber os horários de ${turma}`,
  matricula: (plano: string) => `Olá! Quero me matricular no plano ${plano} da Arena Pinhais.`,
  aviseAmigoTurma: (modalidade: string, link: string) =>
    `Entrei na lista da turma de ${modalidade} da Arena Pinhais, em Pinhais. Bora treinar junto? Deixa seu interesse aqui: ${link}`,
  duvidaFaq: (pergunta: string) => `Olá! Tenho uma dúvida: ${pergunta}`,
  conviteAmigo: (agendaUrl: string) =>
    `Bora treinar comigo na Arena Pinhais? A primeira semana é grátis. Agenda a sua aula experimental aqui: ${agendaUrl}`,
};
