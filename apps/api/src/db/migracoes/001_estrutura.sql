-- Cada bloco pertence a um módulo. Um módulo só lê e escreve as próprias tabelas;
-- dados de outro módulo são obtidos pela interface pública dele (arquivo *.api.ts).

-- ===== Módulo Pessoas =====
CREATE TABLE diretoria (
  id      SERIAL PRIMARY KEY,
  nome    TEXT NOT NULL,
  diretor TEXT NOT NULL,
  ordem   INT  NOT NULL DEFAULT 0
);

CREATE TABLE area (
  id           SERIAL PRIMARY KEY,
  diretoria_id INT  NOT NULL REFERENCES diretoria(id),
  nome         TEXT NOT NULL,
  apoio        BOOLEAN NOT NULL DEFAULT FALSE, -- área de apoio / terceirizada
  ordem        INT  NOT NULL DEFAULT 0
);

CREATE TABLE cargo (
  id               SERIAL PRIMARY KEY,
  area_id          INT  NOT NULL REFERENCES area(id),
  nome             TEXT NOT NULL,
  nivel            TEXT NOT NULL,
  ordem            INT  NOT NULL DEFAULT 0,
  coordenacao      BOOLEAN NOT NULL DEFAULT FALSE,
  descricao        JSONB NOT NULL DEFAULT '{"responsabilidades":[],"conhecimentos":[],"habilidades":[],"atitudes":[],"indicadores":[]}',
  formacao         TEXT NOT NULL DEFAULT '',
  experiencia      TEXT NOT NULL DEFAULT '',
  proximo_cargo_id INT  REFERENCES cargo(id),
  salario_min      NUMERIC(10,2),
  salario_max      NUMERIC(10,2)
);

CREATE TABLE colaborador (
  id              SERIAL PRIMARY KEY,
  nome            TEXT NOT NULL,
  iniciais        TEXT NOT NULL,
  perfil          TEXT NOT NULL CHECK (perfil IN ('gestor', 'colaborador')),
  cargo_id        INT  NOT NULL REFERENCES cargo(id),
  gestor_id       INT  REFERENCES colaborador(id),
  inicio_no_cargo DATE NOT NULL
);

-- Trilha de conhecimentos obrigatória de cada cargo
CREATE TABLE cargo_curso (
  cargo_id     INT  NOT NULL REFERENCES cargo(id),
  curso_id     INT  NOT NULL,
  prazo_dias   INT  NOT NULL,
  vinculado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (cargo_id, curso_id)
);

-- ===== Módulo Catálogo =====
CREATE TABLE curso (
  id           SERIAL PRIMARY KEY,
  nome         TEXT NOT NULL,
  competencia  TEXT NOT NULL,
  entidade     TEXT NOT NULL,
  modalidade   TEXT NOT NULL,
  carga_horas  NUMERIC(6,1) NOT NULL,
  investimento NUMERIC(10,2) NOT NULL DEFAULT 0,
  link         TEXT NOT NULL DEFAULT ''
);

-- ===== Módulo Trilhas =====
CREATE TABLE meta_horas (
  nivel     TEXT PRIMARY KEY,
  horas_mes NUMERIC(5,1) NOT NULL
);

CREATE TABLE inscricao (
  id             SERIAL PRIMARY KEY,
  colaborador_id INT  NOT NULL,
  curso_id       INT  NOT NULL,
  origem         TEXT NOT NULL CHECK (origem IN ('obrigatorio', 'pdi', 'livre')),
  status         TEXT NOT NULL DEFAULT 'em_andamento'
                 CHECK (status IN ('em_andamento', 'enviado', 'devolvido', 'concluido')),
  iniciada_em    DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (colaborador_id, curso_id)
);

CREATE TABLE conclusao (
  id                  SERIAL PRIMARY KEY,
  inscricao_id        INT  NOT NULL UNIQUE REFERENCES inscricao(id),
  data_realizacao     DATE NOT NULL,
  codigo_certificado  TEXT NOT NULL,
  carga_horas         NUMERIC(6,1) NOT NULL,
  investimento        NUMERIC(10,2) NOT NULL DEFAULT 0,
  resumo              TEXT NOT NULL,
  nota_conteudo       INT  NOT NULL,
  nota_didatica       INT  NOT NULL,
  nota_aplicabilidade INT  NOT NULL,
  certificado_nome    TEXT,
  certificado_arquivo TEXT,
  status              TEXT NOT NULL CHECK (status IN ('enviado', 'devolvido', 'concluido')),
  enviado_em          DATE NOT NULL,
  validado_em         DATE,
  validado_por        INT,
  eficacia            TEXT,
  motivo_devolucao    TEXT
);

-- ===== Módulo PDI =====
CREATE TABLE pdi (
  id             SERIAL PRIMARY KEY,
  colaborador_id INT  NOT NULL,
  ciclo          TEXT NOT NULL,
  inicio         DATE NOT NULL,
  fim            DATE NOT NULL,
  UNIQUE (colaborador_id, ciclo)
);

CREATE TABLE pdi_acao (
  id          SERIAL PRIMARY KEY,
  pdi_id      INT  NOT NULL REFERENCES pdi(id) ON DELETE CASCADE,
  o_que_fazer TEXT NOT NULL,
  como_fazer  TEXT NOT NULL DEFAULT '',
  responsavel TEXT NOT NULL,
  prazo       DATE NOT NULL,
  progresso   INT  NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  curso_id    INT
);

-- ===== Módulo Avaliação =====
CREATE TABLE avaliacao (
  id                    SERIAL PRIMARY KEY,
  colaborador_id        INT  NOT NULL,
  ciclo                 TEXT NOT NULL,
  etapa                 TEXT NOT NULL DEFAULT 'autoavaliacao'
                        CHECK (etapa IN ('autoavaliacao', 'avaliacao_gestor', 'consenso', 'concluida')),
  objetivos_5_anos      TEXT NOT NULL DEFAULT '',
  comentario_resultados TEXT NOT NULL DEFAULT '',
  UNIQUE (colaborador_id, ciclo)
);

CREATE TABLE avaliacao_criterio (
  id           SERIAL PRIMARY KEY,
  avaliacao_id INT  NOT NULL REFERENCES avaliacao(id) ON DELETE CASCADE,
  grupo        TEXT NOT NULL CHECK (grupo IN ('conhecimentos', 'habilidades', 'atitudes')),
  texto        TEXT NOT NULL,
  ordem        INT  NOT NULL DEFAULT 0,
  auto         TEXT,
  gestor       TEXT,
  consenso     TEXT
);

CREATE TABLE avaliacao_resultado (
  id           SERIAL PRIMARY KEY,
  avaliacao_id INT  NOT NULL REFERENCES avaliacao(id) ON DELETE CASCADE,
  indicador    TEXT NOT NULL,
  meta         TEXT NOT NULL DEFAULT '',
  realizado    TEXT NOT NULL DEFAULT '',
  atingido     BOOLEAN NOT NULL DEFAULT FALSE,
  ordem        INT  NOT NULL DEFAULT 0
);
