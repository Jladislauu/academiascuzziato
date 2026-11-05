/*
 * Regras da matrícula online (pagamento da mensalidade pelo Asaas).
 *
 * Solução provisória: depois será migrada para a Thryve Agenda. Por isso o
 * modelo fica simples e os nomes claros (aluno, responsável, matrícula, cobrança).
 *
 * Confirmado pelo Rhaue em 04/11/2026: sem taxa de matrícula, sem fidelidade,
 * vencimento da mensalidade no dia da matrícula (a assinatura no Asaas nasce
 * com o primeiro vencimento na data da matrícula), sem multa e sem juros por
 * atraso — não configurar `fine` nem `interest` na assinatura do Asaas.
 */
export const matricula = {
  /** Taxa de matrícula, somada à primeira mensalidade. Confirmado: sem taxa. */
  taxaAdesao: 0,

  /** Meses de fidelidade. Confirmado: sem fidelidade. */
  fidelidadeMeses: 0,

  /**
   * Matrícula `aguardando_pagamento` há mais desse tanto de dias é considerada
   * abandonada: o cron diário (public/api/cron/cancelar-matriculas-abandonadas.php)
   * cancela a assinatura no Asaas e marca a matrícula como `cancelada`.
   */
  diasAbandono: 7,

  /**
   * Termo de adesão mostrado na ficha (abre o texto completo antes do
   * pagamento). Texto placeholder — o João troca pelo texto aprovado pela
   * academia antes de publicar. Subir a `versao` sempre que o texto mudar: é
   * ela que fica gravada em `alunos.termo_versao`, para saber qual versão
   * cada matrícula aceitou.
   */
  termoAdesao: {
    versao: '1',
    // TODO: substituir pelo texto definitivo do termo de adesão, aprovado pela Academia Scuzziato.
    texto:
      'RASCUNHO — este termo de adesão ainda não foi aprovado pela Academia Scuzziato e não ' +
      'pode ir ao ar como está. Ao se matricular, o aluno (ou o responsável, quando o aluno for ' +
      'menor de idade) concorda com o plano e o valor mensal escolhidos, com a cobrança ' +
      'recorrente mensal até o cancelamento, e com o uso dos dados conforme o aviso de privacidade.',
  },

  /**
   * Autorização de uso de imagem: opcional, separada do termo de adesão.
   * Gravada em `alunos.imagem_autorizada` e `alunos.imagem_autorizada_em`.
   */
  autorizacaoImagem:
    'Autorizo o uso de fotos e vídeos das aulas e eventos da Academia Scuzziato com minha imagem ' +
    '(ou a de meu filho ou filha) para divulgação da academia — redes sociais, site e materiais de marketing.',
};
