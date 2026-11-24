-- 006: validação do gestor (envio com evidência → aprovar ou devolver)

CREATE TABLE IF NOT EXISTS stage_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id       UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  delivery_stage_id UUID REFERENCES delivery_stages(id) ON DELETE CASCADE,
  project_stage_id  UUID REFERENCES project_stages(id) ON DELETE CASCADE,
  author_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name       TEXT NOT NULL,
  done_text         TEXT NOT NULL CHECK (char_length(done_text) BETWEEN 1 AND 2000),
  missing_text      TEXT CHECK (missing_text IS NULL OR char_length(missing_text) <= 2000),
  links             TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'returned')),
  reviewer_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name     TEXT,
  review_note       TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submission_target CHECK (
    (delivery_stage_id IS NOT NULL AND delivery_id IS NOT NULL AND project_stage_id IS NULL)
    OR (project_stage_id IS NOT NULL AND delivery_stage_id IS NULL AND delivery_id IS NULL)
  )
);

-- Só um envio pendente por etapa
CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_pending_delivery_stage
  ON stage_submissions (delivery_stage_id) WHERE status = 'pending' AND delivery_stage_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_pending_project_stage
  ON stage_submissions (project_stage_id) WHERE status = 'pending' AND project_stage_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_status ON stage_submissions (status, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_delivery ON stage_submissions (delivery_id);

-- Prints (o arquivo fica no disco; aqui só o registro)
CREATE TABLE IF NOT EXISTS submission_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES stage_submissions(id) ON DELETE CASCADE,
  stored_name   TEXT NOT NULL UNIQUE,
  mime          TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 2097152),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files (submission_id);