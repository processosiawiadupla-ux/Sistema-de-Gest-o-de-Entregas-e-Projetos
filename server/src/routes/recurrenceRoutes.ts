import { Router, type Response } from 'express';
import type { ZodError } from 'zod';
import { pool } from '../config/database.js';
import { requirePermission } from '../auth/authorize.js';
import { canActOnSector } from '../auth/permissions.js';
import type { AuthUser } from '../auth/types.js';
import {
  recurrenceSchema,
  activeSchema,
  recurrenceIdSchema,
  type RecurrenceInput,
} from '../schemas/recurrenceSchema.js';
import { runRecurrences, nextDueDate, todayISO } from '../jobs/recurrences.js';

const router = Router();

// Só quem pode atribuir entregas (ADMIN e LIDER) mexe em rotinas
router.use('/recurrences', requirePermission('deliveries:assign'));

function sendValidationError(res: Response, error: ZodError) {
  res.status(400).json({
    message: error.issues[0].message,
    errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
  });
}

function sendNotFound(res: Response) {
  res.status(404).json({ message: 'Rotina não encontrada.' });
}

const FORBIDDEN_SECTOR = 'Você só pode gerenciar rotinas do seu setor.';

const SELECT_RECURRENCES = `
  SELECT r.*,
         u.name AS assigned_to_name,
         u.status AS assigned_to_status,
         s.name AS sector_name,
         (SELECT count(*)::int FROM deliveries d WHERE d.recurrence_id = r.id) AS deliveries_count
  FROM delivery_recurrences r
  JOIN users u ON u.id = r.assigned_to_id
  JOIN sectors s ON s.id = r.sector_id
`;

// Acrescenta o próximo prazo, para a tela mostrar
function withNextDue<T extends Parameters<typeof nextDueDate>[0] & { active: boolean }>(row: T) {
  return { ...row, next_due_date: row.active ? nextDueDate(row, todayISO()) : null };
}

async function findRecurrence(id: string) {
  const result = await pool.query(`${SELECT_RECURRENCES} WHERE r.id = $1;`, [id]);
  return result.rows[0] ?? null;
}

// O responsável precisa estar ativo e ser do setor da rotina
async function checkAssignee(user: AuthUser, data: RecurrenceInput): Promise<{ status: number; message: string } | null> {
  if (!canActOnSector(user, data.sector_id)) return { status: 403, message: FORBIDDEN_SECTOR };

  const found = await pool.query<{ sector_id: string | null }>(
    `SELECT sector_id FROM users WHERE id = $1 AND status = 'ATIVO';`,
    [data.assigned_to_id],
  );
  if (!found.rows[0]) return { status: 400, message: 'Responsável não encontrado ou inativo.' };
  if (found.rows[0].sector_id && found.rows[0].sector_id !== data.sector_id) {
    return { status: 400, message: 'O responsável não pertence ao setor escolhido.' };
  }
  return null;
}

// Campos que dependem da frequência: o que não se aplica vira null
function ruleValues(data: RecurrenceInput) {
  return {
    weekday: data.frequency === 'WEEKLY' ? data.weekday ?? null : null,
    month_day: data.frequency === 'MONTHLY' ? data.month_day ?? null : null,
  };
}

// Listar rotinas (ADMIN: todas; LIDER: as do seu setor)
router.get('/recurrences', async (req, res) => {
  const user = req.user!;
  try {
    const result = await pool.query(
      `${SELECT_RECURRENCES}
       WHERE ($1::uuid IS NULL OR r.sector_id = $1)
       ORDER BY r.active DESC, r.title;`,
      [user.role === 'ADMIN' ? null : user.sectorId],
    );
    res.json(result.rows.map(withNextDue));
  } catch (error) {
    console.error('Erro ao listar rotinas:', error);
    res.status(500).json({ message: 'Erro ao listar as rotinas.' });
  }
});

// Criar rotina (e já criar as entregas que entram na janela de antecedência)
router.post('/recurrences', async (req, res) => {
  const user = req.user!;
  const parsed = recurrenceSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const data = parsed.data;
  const today = todayISO();
  const startDate = data.start_date ?? today;

  if (startDate < today) {
    res.status(400).json({ message: 'A rotina não pode começar numa data que já passou.' });
    return;
  }
  if (data.end_date && data.end_date < startDate) {
    res.status(400).json({ message: 'O término deve ser depois do início.' });
    return;
  }

  try {
    const problem = await checkAssignee(user, data);
    if (problem) {
      res.status(problem.status).json({ message: problem.message });
      return;
    }

    const { weekday, month_day } = ruleValues(data);
    const created = await pool.query<{ id: string }>(
      `INSERT INTO delivery_recurrences
         (title, description, sector_id, assigned_to_id, created_by_id, created_by_name,
          frequency, weekday, month_day, lead_days, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id;`,
      [
        data.title,
        data.description || null,
        data.sector_id,
        data.assigned_to_id,
        user.id,
        user.name,
        data.frequency,
        weekday,
        month_day,
        data.lead_days,
        startDate,
        data.end_date ?? null,
      ],
    );

    const id = created.rows[0].id;
    await runRecurrences(id);
    res.status(201).json(withNextDue(await findRecurrence(id)));
  } catch (error) {
    console.error('Erro ao criar rotina:', error);
    res.status(500).json({ message: 'Erro ao criar a rotina.' });
  }
});

// Editar rotina (vale para as próximas entregas; as já criadas não mudam)
router.put('/recurrences/:id', async (req, res) => {
  const user = req.user!;
  const id = recurrenceIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = recurrenceSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const data = parsed.data;

  try {
    const current = await findRecurrence(id.data);
    if (!current) {
      sendNotFound(res);
      return;
    }
    if (!canActOnSector(user, current.sector_id)) {
      res.status(403).json({ message: FORBIDDEN_SECTOR });
      return;
    }

    const today = todayISO();
    const startDate = data.start_date ?? current.start_date;
    if (startDate !== current.start_date && startDate < today) {
      res.status(400).json({ message: 'A rotina não pode começar numa data que já passou.' });
      return;
    }
    if (data.end_date && data.end_date < startDate) {
      res.status(400).json({ message: 'O término deve ser depois do início.' });
      return;
    }

    const problem = await checkAssignee(user, data);
    if (problem) {
      res.status(problem.status).json({ message: problem.message });
      return;
    }

    const { weekday, month_day } = ruleValues(data);
    await pool.query(
      `UPDATE delivery_recurrences
       SET title = $1, description = $2, sector_id = $3, assigned_to_id = $4,
           frequency = $5, weekday = $6, month_day = $7, lead_days = $8,
           start_date = $9, end_date = $10
       WHERE id = $11;`,
      [
        data.title,
        data.description || null,
        data.sector_id,
        data.assigned_to_id,
        data.frequency,
        weekday,
        month_day,
        data.lead_days,
        startDate,
        data.end_date ?? null,
        id.data,
      ],
    );

    await runRecurrences(id.data);
    res.json(withNextDue(await findRecurrence(id.data)));
  } catch (error) {
    console.error('Erro ao editar rotina:', error);
    res.status(500).json({ message: 'Erro ao editar a rotina.' });
  }
});

// Pausar ou reativar
router.patch('/recurrences/:id/active', async (req, res) => {
  const user = req.user!;
  const id = recurrenceIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = activeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const current = await findRecurrence(id.data);
    if (!current) {
      sendNotFound(res);
      return;
    }
    if (!canActOnSector(user, current.sector_id)) {
      res.status(403).json({ message: FORBIDDEN_SECTOR });
      return;
    }

    // Ao reativar, NÃO cria as entregas do período em que ficou pausada:
    // a contagem recomeça a partir de hoje
    await pool.query(
      `UPDATE delivery_recurrences
       SET active = $1,
           generated_until = CASE
             WHEN $1 AND NOT active
               THEN GREATEST(COALESCE(generated_until, start_date - 1), $3::date - 1)
             ELSE generated_until
           END
       WHERE id = $2;`,
      [parsed.data.active, id.data, todayISO()],
    );

    if (parsed.data.active) await runRecurrences(id.data);
    res.json(withNextDue(await findRecurrence(id.data)));
  } catch (error) {
    console.error('Erro ao pausar/reativar rotina:', error);
    res.status(500).json({ message: 'Erro ao atualizar a rotina.' });
  }
});

// Excluir rotina (as entregas já criadas continuam existindo)
router.delete('/recurrences/:id', async (req, res) => {
  const user = req.user!;
  const id = recurrenceIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  try {
    const current = await findRecurrence(id.data);
    if (!current) {
      sendNotFound(res);
      return;
    }
    if (!canActOnSector(user, current.sector_id)) {
      res.status(403).json({ message: FORBIDDEN_SECTOR });
      return;
    }

    await pool.query('DELETE FROM delivery_recurrences WHERE id = $1;', [id.data]);
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir rotina:', error);
    res.status(500).json({ message: 'Erro ao excluir a rotina.' });
  }
});

export default router;