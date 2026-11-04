-- Tabelas da matrícula online (public/api/matricula.php e public/api/asaas-webhook.php).
-- Rodar uma vez no phpMyAdmin da Hostinger, no mesmo banco das tabelas `interesses` e `agendamentos`.
--
-- Solução provisória (depois migra para a Thryve Agenda): o CPF NUNCA fica
-- gravado aqui, só no Asaas. O que identifica a pessoa para não duplicar
-- matrícula é o WhatsApp + o nome de quem vai treinar (aluno_chave), igual ao
-- agendamento.

CREATE TABLE IF NOT EXISTS alunos (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome                 VARCHAR(100) NOT NULL,                   -- quem vai treinar
  aluno_chave          VARCHAR(100) NOT NULL,                    -- nome em minúsculas (evita matrícula duplicada)
  data_nascimento      DATE NOT NULL,
  whatsapp             VARCHAR(11) NOT NULL,                     -- do responsável, quando menor; senão do próprio aluno
  email                VARCHAR(190) NOT NULL,                    -- idem
  responsavel_nome     VARCHAR(100) NULL,                        -- preenchido quando o aluno é menor de idade
  asaas_customer_id    VARCHAR(40) NOT NULL,                     -- cliente no Asaas (quem paga: aluno ou responsável)
  imagem_autorizada    TINYINT(1) NOT NULL DEFAULT 0,             -- autorização de uso de imagem (opcional, separada do termo)
  imagem_autorizada_em DATETIME NULL,
  consentimento_em     DATETIME NOT NULL,                        -- quando aceitou o uso dos dados (LGPD)
  termo_aceito_em      DATETIME NOT NULL,                        -- quando aceitou o termo de adesão
  termo_versao         VARCHAR(20) NOT NULL,                     -- versão do termo aceita (src/data/matricula.ts)
  criado_em            DATETIME NOT NULL,
  ip_hash              CHAR(64) NOT NULL,                        -- hash do IP, só para o limite de envios
  PRIMARY KEY (id),
  KEY idx_pessoa (whatsapp, aluno_chave),
  KEY idx_ip_criado (ip_hash, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matriculas (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  aluno_id               INT UNSIGNED NOT NULL,
  plano_id               VARCHAR(40) NOT NULL,                   -- id em src/data/planos.ts
  modalidade             VARCHAR(40) NULL,                       -- só no plano 'uma-modalidade'
  turmas                 VARCHAR(255) NULL,                      -- ids de turmas.ts que pretende frequentar, separados por vírgula
  valor                  DECIMAL(10,2) NOT NULL,                 -- mensalidade (preço do plano; sem taxa de matrícula)
  status                 ENUM('aguardando_pagamento', 'ativa', 'inadimplente', 'cancelada') NOT NULL DEFAULT 'aguardando_pagamento',
  asaas_subscription_id  VARCHAR(40) NOT NULL,
  criado_em              DATETIME NOT NULL,
  ativada_em             DATETIME NULL,                          -- primeira vez que o status virou 'ativa'
  cancelada_em           DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_aluno (aluno_id),
  UNIQUE KEY idx_subscription (asaas_subscription_id),
  CONSTRAINT fk_matriculas_aluno FOREIGN KEY (aluno_id) REFERENCES alunos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cobrancas (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  matricula_id     INT UNSIGNED NOT NULL,
  asaas_payment_id VARCHAR(40) NOT NULL,
  vencimento       DATE NOT NULL,
  valor            DECIMAL(10,2) NOT NULL,
  status           VARCHAR(30) NOT NULL,                         -- status do Asaas (PENDING, RECEIVED, CONFIRMED, OVERDUE...)
  pago_em          DATETIME NULL,
  link_fatura      VARCHAR(255) NOT NULL,
  criado_em        DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_payment (asaas_payment_id),
  KEY idx_matricula (matricula_id),
  CONSTRAINT fk_cobrancas_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Eventos do webhook do Asaas já processados (evita processar o mesmo evento duas vezes).
CREATE TABLE IF NOT EXISTS asaas_eventos (
  id          VARCHAR(60) NOT NULL,                              -- id do evento, mandado pelo Asaas
  tipo        VARCHAR(60) NOT NULL,                               -- ex.: PAYMENT_CONFIRMED, SUBSCRIPTION_DELETED
  recebido_em DATETIME NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------
-- Consultas úteis
-- ---------------------------------------------------------------

-- Matrículas aguardando pagamento há mais de 2 dias (ligar para a pessoa?)
-- SELECT a.nome, a.whatsapp, m.plano_id, m.criado_em
-- FROM matriculas m JOIN alunos a ON a.id = m.aluno_id
-- WHERE m.status = 'aguardando_pagamento' AND m.criado_em < NOW() - INTERVAL 2 DAY;

-- Alunos inadimplentes agora
-- SELECT a.nome, a.whatsapp, m.plano_id, m.valor
-- FROM matriculas m JOIN alunos a ON a.id = m.aluno_id
-- WHERE m.status = 'inadimplente';
