-- Tabela de Setores
CREATE TABLE IF NOT EXISTS sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sectors (name) VALUES
  ('Diretoria'),
  ('Engenharia e Obras'),
  ('Produção'),
  ('Logística e Expedição'),
  ('Comercial'),
  ('Marketing'),
  ('Administrativo e Financeiro'),
  ('Compras e Suprimentos'),
  ('Processos e Tecnologia')
ON CONFLICT (name) DO NOTHING;

-- Tabela de Utilizadores
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'COLABORADOR',
  status VARCHAR(50) DEFAULT 'ATIVO',
  sector VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  owner VARCHAR(255),
  sector_id UUID REFERENCES sectors(id),
  start_date DATE,
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'waiting', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Entregas (independente de projetos)
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to_id UUID REFERENCES users(id),
  assigned_to_name VARCHAR(255),
  assigned_by_id UUID REFERENCES users(id),
  assigned_by_name VARCHAR(255),
  sector_id UUID NOT NULL REFERENCES sectors(id),
  due_date DATE NOT NULL,
   completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);