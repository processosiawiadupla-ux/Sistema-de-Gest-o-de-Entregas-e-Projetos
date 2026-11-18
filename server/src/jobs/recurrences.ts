import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import type { Frequency } from '../schemas/recurrenceSchema.js';

const TIME_ZONE = 'America/Sao_Paulo';
const ONE_HOUR = 60 * 60 * 1000;
const MAX_DAYS_PER_RUN = 366; // limite de segurança por rodada

export interface RecurrenceRule {
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
  start_date: string;
  end_date: string | null;
}

// ---------- Datas no formato 'AAAA-MM-DD' (sem confusão de fuso) ----------

// Hoje, no horário de Brasília (independe do fuso do servidor)
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => fromUTC(toUTC(iso) + days * 86_400_000);

// 1 = segunda ... 7 = domingo
const isoWeekday = (iso: string) => ((new Date(toUTC(iso)).getUTCDay() + 6) % 7) + 1;

const lastDayOfMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

const maxISO = (a: string, b: string) => (a > b ? a : b);

// Esta data é um prazo da rotina?
export function isDueDate(rule: RecurrenceRule, iso: string): boolean {
  switch (rule.frequency) {
    case 'DAILY':
      return isoWeekday(iso) <= 5; // só dias úteis (seg–sex)
    case 'WEEKLY':
      return isoWeekday(iso) === rule.weekday;
    case 'MONTHLY': {
      const day = Number(iso.slice(8, 10));
      return day === Math.min(rule.month_day ?? 1, lastDayOfMonth(iso));
    }
  }
}

// Próximo prazo a partir de uma data (para mostrar na tela)
export function nextDueDate(rule: RecurrenceRule, fromISO: string): string | null {
  let day = maxISO(fromISO, rule.start_date);
  for (let i = 0; i < 400; i++) {
    if (rule.end_date && day > rule.end_date) return null;
    if (isDueDate(rule, day)) return day;
    day = addDays(day, 1);
  }
  return null;
}

// ---------- Criação das entregas ----------

interface RecurrenceRow extends RecurrenceRule {
  id: string;
  title: string;
  description: string | null;
  sector_id: string;
  assigned_to_id: string;
  created_by_id: string | null;
  created_by_name: string | null;
  lead_days: number;
  generated_until: string | null;
  assignee_name: string;
  assignee_status: string;
}

// Cria as entregas de UMA rotina cujo prazo já entrou na janela de antecedência
async function generateFor(client: PoolClient, rec: RecurrenceRow, today: string): Promise<number> {
  // Começa logo depois do último prazo já criado (ou no início da rotina)
  const from = rec.generated_until ? maxISO(rec.start_date, addDays(rec.generated_until, 1)) : rec.start_date;

  // Vai até "hoje + antecedência", sem passar do término nem do limite de segurança
  let to = addDays(today, rec.lead_days);
  if (rec.end_date && rec.end_date < to) to = rec.end_date;
  const cap = addDays(from, MAX_DAYS_PER_RUN - 1);
  if (cap < to) to = cap;

  if (from > to) return 0;

  let created = 0;

  if (rec.assignee_status === 'ATIVO') {
    for (let day = from; day <= to; day = addDays(day, 1)) {
      if (!isDueDate(rec, day)) continue;

      // ON CONFLICT: a mesma rotina nunca cria duas entregas com o mesmo prazo
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO deliveries
           (title, description, assigned_to_id, assigned_to_name, assigned_by_id, assigned_by_name,
            sector_id, due_date, stage_count, recurrence_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9)
         ON CONFLICT (recurrence_id, due_date) WHERE recurrence_id IS NOT NULL DO NOTHING
         RETURNING id;`,
        [
          rec.title,
          rec.description,
          rec.assigned_to_id,
          rec.assignee_name,
          rec.created_by_id,
          rec.created_by_name ?? 'Rotina automática',
          rec.sector_id,
          day,
          rec.id,
        ],
      );

      if (inserted.rows[0]) {
        // Etapa única: concluída = 100%
        await client.query(
          `INSERT INTO delivery_stages (delivery_id, position, title, due_date)
           VALUES ($1, 1, $2, $3);`,
          [inserted.rows[0].id, rec.title, day],
        );
        created += 1;
      }
    }
  } else {
    console.warn(`🔁 Rotina "${rec.title}": responsável inativo, nenhuma entrega criada.`);
  }

  await client.query('UPDATE delivery_recurrences SET generated_until = $1 WHERE id = $2;', [to, rec.id]);
  return created;
}

// Roda todas as rotinas ativas (ou só uma, quando acaba de ser criada/editada)
export async function runRecurrences(onlyId?: string): Promise<number> {
  const today = todayISO();
  const list = await pool.query<{ id: string }>(
    'SELECT id FROM delivery_recurrences WHERE active AND ($1::uuid IS NULL OR id = $1);',
    [onlyId ?? null],
  );

  let total = 0;
  for (const { id } of list.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // SKIP LOCKED: se duas rodadas coincidirem, cada rotina é processada por uma só
      const found = await client.query<RecurrenceRow>(
        `SELECT r.*, u.name AS assignee_name, u.status AS assignee_status
         FROM delivery_recurrences r
         JOIN users u ON u.id = r.assigned_to_id
         WHERE r.id = $1 AND r.active
         FOR UPDATE OF r SKIP LOCKED;`,
        [id],
      );
      if (found.rows[0]) total += await generateFor(client, found.rows[0], today);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`Erro ao gerar entregas da rotina ${id}:`, error);
    } finally {
      client.release();
    }
  }
  return total;
}

// ---------- Verificação automática ----------

let running = false;

async function tick() {
  if (running) return; // não deixa duas rodadas se sobreporem
  running = true;
  try {
    const created = await runRecurrences();
    if (created > 0) console.log(`🔁 Rotinas: ${created} entrega(s) criada(s).`);
  } catch (error) {
    console.error('Erro na verificação das rotinas:', error);
  } finally {
    running = false;
  }
}

// Roda agora e depois de hora em hora, enquanto o backend estiver ligado
export function startRecurrenceScheduler() {
  void tick();
  setInterval(() => void tick(), ONE_HOUR);
  console.log('🔁 Rotinas: verificação automática ligada (de hora em hora).');
}