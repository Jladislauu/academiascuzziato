-- Tabela do formulário "Turmas em formação" (public/api/interesse.php).
-- Rodar uma vez no phpMyAdmin da Hostinger, no banco configurado no config.local.php.

CREATE TABLE IF NOT EXISTS interesses (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  criado_em        DATETIME NOT NULL,                       -- horário de Brasília
  nome             VARCHAR(100) NOT NULL,                   -- no infantil, nome do responsável
  whatsapp         VARCHAR(11) NOT NULL,                    -- só dígitos: DDD + número
  modalidade       VARCHAR(20) NOT NULL,                    -- 'muay-thai', 'boxe'
  publico          ENUM('adulto', 'infantil') NOT NULL,
  idade_crianca    TINYINT UNSIGNED NULL,                   -- só no infantil
  dias             SET('seg', 'ter', 'qua', 'qui', 'sex') NOT NULL,
  periodo          ENUM('manha', 'tarde', 'noite') NOT NULL,
  consentimento_em DATETIME NOT NULL,                       -- quando aceitou o uso dos dados (LGPD)
  ip_hash          CHAR(64) NOT NULL,                       -- hash do IP, só para o limite de envios
  PRIMARY KEY (id),
  KEY idx_ip_criado (ip_hash, criado_em),
  KEY idx_turma (modalidade, publico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------
-- Consultas úteis para decidir quando abrir as turmas
-- ---------------------------------------------------------------

-- Quantas pessoas por turma
-- SELECT modalidade, publico, COUNT(*) AS pessoas
-- FROM interesses GROUP BY modalidade, publico ORDER BY pessoas DESC;

-- Melhor dia + período para uma turma (troque a modalidade e o público)
-- SELECT d.dia, i.periodo, COUNT(*) AS pessoas
-- FROM interesses i
-- JOIN (SELECT 'seg' AS dia UNION ALL SELECT 'ter' UNION ALL SELECT 'qua'
--       UNION ALL SELECT 'qui' UNION ALL SELECT 'sex') d ON FIND_IN_SET(d.dia, i.dias)
-- WHERE i.modalidade = 'muay-thai' AND i.publico = 'adulto'
-- GROUP BY d.dia, i.periodo ORDER BY pessoas DESC;

-- Lista para chamar no WhatsApp quando a turma abrir
-- SELECT nome, whatsapp, idade_crianca, dias, periodo, criado_em
-- FROM interesses WHERE modalidade = 'boxe' AND publico = 'infantil' ORDER BY criado_em;
