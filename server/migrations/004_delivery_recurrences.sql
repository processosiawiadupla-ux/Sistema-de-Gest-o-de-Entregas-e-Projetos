-- 004: rotinas (entregas que se repetem)
CREATE TABLE IF NOT EXISTS delivery_recurrences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  sector_id       UUID NOT NULL REFERENCES sectors(id),
  assigned_to_id  UUID NOT NULL REFERENCES users(id),
  created_by_id   UUID REFERENCES users(id),
  created_by_name VARCHAR(255),
  frequency       VARCHAR(10) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  weekday         SMALLINT CHECK (weekday BETWEEN 1 AND 7),     -- semanal: 1 = segunda ... 7 = domingo
  month_day       SMALLINT CHECK (month_day BETWEEN 1 AND 31),  -- mensal: dia do prazo
  lead_days       SMALLINT NOT NULL DEFAULT 0 CHECK (lead_days BETWEEN 0 AND 30),
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  generated_until DATE,                                         -- até que prazo já foi criado
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recurrence_rule CHECK (
    (frequency = 'DAILY'   AND weekday IS NULL     AND month_day IS NULL) OR
    (frequency = 'WEEKLY'  AND weekday IS NOT NULL AND month_day IS NULL) OR
    (frequency = 'MONTHLY' AND month_day IS NOT NULL AND weekday IS NULL)
  ),
  CONSTRAINT recurrence_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Cada entrega criada por uma rotina guarda de qual rotina veio
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES delivery_recurrences(id) ON DELETE SET NULL;

-- Garante que a mesma rotina nunca cria duas entregas com o mesmo prazo
CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_recurrence_due
  ON deliveries (recurrence_id, due_date) WHERE recurrence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_recurrences_active ON delivery_recurrences (active);