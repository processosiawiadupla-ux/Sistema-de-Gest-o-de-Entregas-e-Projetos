import { Router, type Response } from 'express';
import { z, type ZodError } from 'zod';
import { pool } from '../config/database.js';
import { can, canActOnSector } from '../auth/permissions.js';

// Etapas de projeto vistas como "entregas":
// aparecem em Minhas entregas / Entregas, entram nos indicadores
// e podem ser concluídas (e reabertas) por lá, sincronizando com o Kanban.
const router = Router();

const listSchema = z.object({
  scope: z.enum(['mine', 'team']).default('mine'),
  sector_id: z.uuid('Setor inválido.').optional(),
});

const completeSchema = z.object({
  done_text: z
    .string('Descreva o que foi feito.')
    .trim()
    .min(1, 'Descreva o que foi feito.')
    .max(1500, 'O texto pode ter no máximo 1500 caracteres.'),
  missing_text: z.string().trim().max(400, 'O texto pode ter no máximo 400 caracteres.').nullish(),
});

const idSchema = z.uuid();

function sendValidationError(res: Response, error: ZodError) {
  res.status(400).json({ message: error.issues[0].message });
}

// Mesmo formato das entregas, para as telas tratarem tudo igual
const SELECT_TASKS = `
  SELECT ps.id,
         ps.title,
         NULL::text AS description,
         ps.responsible_id AS assigned_to_id,
         u.name AS assigned_to_name,
         p.owner AS assigned_by_name,
         COALESCE(p.sector_id, u.sector_id) AS sector_id,
         s.name AS sector_name,
         ps.due_date::text AS due_date,
         1 AS stage_count,
         CASE WHEN ps.status = 'done' THEN 100 ELSE 0 END AS progress,
         json_build_array(json_build_object(
           'id', ps.id,
           'position', 1,
           'title', ps.title,
           'due_date', ps.due_date,
           'completed', ps.status = 'done',
           'completed_at', ps.completed_at
         )) AS stages,
         (ps.status = 'done') AS completed,
         ps.completed_at,
         (SELECT count(*)::int FROM project_stage_notes n WHERE n.stage_id = ps.id) AS comments_count,
         p.created_at,
         'project_stage' AS kind,
         p.id AS project_id,
         p.name AS project_name
  FROM project_stages ps
  JOIN projects p ON p.id = ps.project_id
  JOIN users u ON u.id = ps.responsible_id
  LEFT JOIN sectors s ON s.id = COALESCE(p.sector_id, u.sector_id)
  WHERE p.status <> 'cancelled'
`;

// Listar: ?scope=mine (as minhas) ou ?scope=team (mesmas regras das entregas)
router.get('/project-tasks', async (req, res) => {
  const user = req.user!;
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { scope, sector_id } = parsed.data;
  let where = '';
  const params: string[] = [];

  if (scope === 'mine') {
    where = 'AND ps.responsible_id = $1';
    params.push(user.id);
  } else {
    if (!can(user, 'deliveries:view_team')) {
      res.status(403).json({ message: 'Você não tem permissão para esta ação.' });
      return;
    }
    if (user.role === 'ADMIN') {
      if (sector_id) {
        where = 'AND COALESCE(p.sector_id, u.sector_id) = $1';
        params.push(sector_id);
      }
    } else {
      if (!user.sectorId) {
        res.json([]);
        return;
      }
      where = 'AND COALESCE(p.sector_id, u.sector_id) = $1'; // LIDER: sempre o próprio setor
      params.push(user.sectorId);
    }
  }

  try {
    const result = await pool.query(`${SELECT_TASKS} ${where} ORDER BY ps.due_date ASC;`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar etapas de projeto:', error);
    res.status(500).json({ message: 'Erro ao listar as etapas de projeto.' });
  }
});

// Concluir uma etapa (só o responsável): vai para "Concluído" no Kanban
// e o que foi feito fica registrado nas observações da etapa
router.post('/project-tasks/:stageId/complete', async (req, res) => {
  const user = req.user!;
  const stageId = idSchema.safeParse(req.params.stageId);
  if (!stageId.success) {
    res.status(404).json({ message: 'Etapa não encontrada.' });
    return;
  }
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query<{ responsible_id: string; status: string; project_status: string }>(
      `SELECT ps.responsible_id, ps.status, p.status AS project_status
       FROM project_stages ps
       JOIN projects p ON p.id = ps.project_id
       WHERE ps.id = $1
       FOR UPDATE OF ps;`,
      [stageId.data],
    );
    const stage = found.rows[0];

    if (!stage) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Etapa não encontrada.' });
      return;
    }
    if (stage.responsible_id !== user.id) {
      await client.query('ROLLBACK');
      res.status(403).json({ message: 'Só o responsável pela etapa pode concluí-la.' });
      return;
    }
    if (stage.project_status === 'cancelled') {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Este projeto foi cancelado.' });
      return;
    }
    if (stage.status === 'done') {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Esta etapa já foi concluída.' });
      return;
    }

    await client.query(
      `UPDATE project_stages SET status = 'done', completed_at = NOW() WHERE id = $1;`,
      [stageId.data],
    );

    const { done_text, missing_text } = parsed.data;
    const text = missing_text
      ? `Concluída. Feito: ${done_text}\nFaltou: ${missing_text}`
      : `Concluída. Feito: ${done_text}`;

    await client.query(
      `INSERT INTO project_stage_notes (stage_id, author_id, author_name, text)
       VALUES ($1, $2, $3, $4);`,
      [stageId.data, user.id, user.name, text],
    );

    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao concluir etapa de projeto:', error);
    res.status(500).json({ message: 'Erro ao concluir a etapa.' });
  } finally {
    client.release();
  }
});

// Reabrir uma etapa concluída (ADMIN, LIDER do setor ou líder do projeto)
router.patch('/project-tasks/:stageId/reopen', async (req, res) => {
  const user = req.user!;
  const stageId = idSchema.safeParse(req.params.stageId);
  if (!stageId.success) {
    res.status(404).json({ message: 'Etapa não encontrada.' });
    return;
  }

  try {
    const found = await pool.query<{ status: string; sector_id: string | null; owner_id: string | null }>(
      `SELECT ps.status, p.sector_id, p.owner_id
       FROM project_stages ps
       JOIN projects p ON p.id = ps.project_id
       WHERE ps.id = $1;`,
      [stageId.data],
    );
    const stage = found.rows[0];

    if (!stage) {
      res.status(404).json({ message: 'Etapa não encontrada.' });
      return;
    }
    if (!canActOnSector(user, stage.sector_id) && stage.owner_id !== user.id) {
      res.status(403).json({ message: 'Só o líder do projeto pode reabrir etapas.' });
      return;
    }
    if (stage.status !== 'done') {
      res.status(409).json({ message: 'Esta etapa não está concluída.' });
      return;
    }

    await pool.query(
      `UPDATE project_stages SET status = 'doing', completed_at = NULL WHERE id = $1;`,
      [stageId.data],
    );
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao reabrir etapa de projeto:', error);
    res.status(500).json({ message: 'Erro ao reabrir a etapa.' });
  }
});

export default router;