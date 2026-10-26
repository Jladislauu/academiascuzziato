import type { Config } from './types';

export const config: Config = {
  // Produção. Na homologação (branch dev), o workflow troca por VITE_SITE_URL.
  siteUrl: import.meta.env?.VITE_SITE_URL || 'https://www.academiascuzziato.com.br',

  // Agendamento da aula experimental, no próprio site (regras em agenda.ts).
  // Arquivo em public/api/; credenciais no config.local.php do servidor (ver server/).
  agendamentoEndpoint: '/api/agendamento.php',

  // WhatsApp da academia, só dígitos: 55 + DDD + número ((41) 93300-2563).
  whatsapp: '5541933002563',

  instagram: 'https://www.instagram.com/academiascuzziato',

  email: 'academiascuzziato@gmail.com',

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
    'Os dados que você envia pelo site, como nome e WhatsApp, são usados só para falar com você sobre as aulas da Academia Scuzziato. Não vendemos nem compartilhamos seus dados. Para corrigir ou apagar seus dados, é só pedir pelo WhatsApp.',

  // Arquivo em public/api/; credenciais no config.local.php do servidor (ver server/).
  interesseEndpoint: '/api/interesse.php',

  // Links de pagamento do Asaas (enviados pelo Rhaue em 25/10/2026).
  matriculaLinks: {
    'uma-modalidade': 'https://www.asaas.com/000/c/2kfjbff4ec5zywty',
    livre: 'https://www.asaas.com/000/c/emf71zbp52nbr6j5',
  },
};

/** Mensagens prontas do WhatsApp. */
export const mensagens = {
  geral: 'Olá! Vim pelo site da Academia Scuzziato e quero tirar uma dúvida.',
  horariosTurma: (turma: string) => `Olá! Quero saber os horários de ${turma}`,
  matricula: (plano: string) => `Olá! Quero me matricular no plano ${plano} da Academia Scuzziato.`,
  aviseAmigoTurma: (modalidade: string, link: string) =>
    `Entrei na lista da turma de ${modalidade} da Academia Scuzziato, em Pinhais. Bora treinar junto? Deixa seu interesse aqui: ${link}`,
  duvidaFaq: (pergunta: string) => `Olá! Tenho uma dúvida: ${pergunta}`,
  conviteAmigo: (link: string) =>
    `Bora treinar comigo na Academia Scuzziato? A primeira semana é grátis. Agenda a sua aula experimental aqui: ${link}`,
  conviteAmigoTurma: (turma: string, quando: string, link: string) =>
    `Agendei uma aula experimental de ${turma} na Academia Scuzziato, em Pinhais, ${quando}. A primeira semana é grátis. Bora junto? Agenda a sua vaga aqui: ${link}`,
};
