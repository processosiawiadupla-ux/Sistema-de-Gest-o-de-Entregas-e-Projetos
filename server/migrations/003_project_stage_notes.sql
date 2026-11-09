CREATE TABLE IF NOT EXISTS project_stage_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id    UUID NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES users(id),
  author_name VARCHAR(255) NOT NULL,
  text        TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_stage_notes_stage
  ON project_stage_notes (stage_id, created_at);