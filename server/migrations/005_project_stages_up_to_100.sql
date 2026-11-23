-- 005: projetos podem ter de 1 a 100 etapas (antes: até 10)
ALTER TABLE project_stages DROP CONSTRAINT IF EXISTS project_stages_position_check;

ALTER TABLE project_stages
  ADD CONSTRAINT project_stages_position_check CHECK (position BETWEEN 1 AND 100);