-- Tabelas do agendamento da aula experimental (public/api/agendamento.php e public/painel/).
-- Rodar uma vez no phpMyAdmin da Hostinger, no mesmo banco do config.local.php
-- (o mesmo da tabela `interesses`).

CREATE TABLE IF NOT EXISTS agendamentos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  criado_em        DATETIME NOT NULL,                       -- horário de Brasília
  turma_id         VARCHAR(40) NOT NULL,                    -- id em src/data/turmas.ts
  turma_nome       VARCHAR(100) NOT NULL,                   -- nome da turma no dia do agendamento
  data_aula        DATE NOT NULL,
  inicio           TIME NOT NULL,
  fim              TIME NOT NULL,
  nome             VARCHAR(100) NOT NULL,                   -- quem agendou (o responsável, se for menor)
  whatsapp         VARCHAR(11) NOT NULL,                    -- só dígitos: DDD + número
  para_menor       TINYINT(1) NOT NULL DEFAULT 0,           -- 1 = agendado pelo responsável
  aluno_nome       VARCHAR(100) NOT NULL,                   -- quem vai treinar
  aluno_chave      VARCHAR(100) NOT NULL,                   -- nome do aluno em minúsculas (evita agendamento repetido)
  aluno_idade      TINYINT UNSIGNED NULL,                   -- só para menor de idade
  experiencia      ENUM('nunca', 'ja-treinou') NOT NULL,
  status           ENUM('agendado', 'compareceu', 'faltou', 'cancelado') NOT NULL DEFAULT 'agendado',
  status_em        DATETIME NULL,                           -- quando o status foi mudado no painel
  consentimento_em DATETIME NOT NULL,                       -- quando aceitou o uso dos dados (LGPD)
  ip_hash          CHAR(64) NOT NULL,                       -- hash do IP, só para o limite de envios
  PRIMARY KEY (id),
  KEY idx_aula (data_aula, turma_id, status),
  KEY idx_pessoa (whatsapp, aluno_chave),
  KEY idx_ip_criado (ip_hash, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tentativas de login no painel que deram errado (limite contra tentativa e erro de senha).
CREATE TABLE IF NOT EXISTS painel_tentativas (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_hash   CHAR(64) NOT NULL,
  criado_em DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ip_criado (ip_hash, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------
-- Consultas úteis
-- ---------------------------------------------------------------

-- Agendamentos por turma e status nos últimos 30 dias (quantos vieram, quantos faltaram)
-- SELECT turma_nome, status, COUNT(*) AS pessoas
-- FROM agendamentos WHERE data_aula >= CURDATE() - INTERVAL 30 DAY
-- GROUP BY turma_nome, status ORDER BY turma_nome, status;

-- Quem fez aula experimental e ainda pode ser chamado para a matrícula
-- SELECT aluno_nome, nome, whatsapp, turma_nome, data_aula
-- FROM agendamentos WHERE status = 'compareceu' ORDER BY data_aula DESC;
