import { Router, type Response } from 'express';
import type { PoolClient } from 'pg';
import type { ZodError } from 'zod';
import { pool } from '../config/database.js';
import type { AuthUser } from '../auth/types.js';
import { can, canActOnSector } from '../auth/permissions.js'
import { requirePermission } from '../auth/authorize.js';
import {
  createDeliverySchema,
  updateDeliverySchema,
  launchSchema,
  listDeliveriesSchema,
  deliveryIdSchema,
  type DeliveryBaseInput,
  type LaunchNote,
} from '../schemas/deliverySchema.js';

const router = Router();

function sendValidationError(res: Response, error: ZodError) {
  res.status(400).json({
    message: error.issues[0].message,
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

function sendNotFound(res: Response) {
  res.status(404).json({ message: 'Entrega não encontrada.' });
}

function sendForbidden(res: Response, message = 'Você não tem permissão para esta ação.') {
  res.status(403).json({ message });
}

// Código 23503 do PostgreSQL: a chave estrangeira aponta para algo que não existe
function isForeignKeyError(error: unknown) {
  return (error as { code?: string }).code === '23503';
}

// Entregas com o nome do setor e a lista de etapas, em ordem
const SELECT_DELIVERIES = `
  SELECT d.*, s.name AS sector_name,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', st.id,
        'position', st.position,
        'title', st.title,
        'due_date', st.due_date,
        'completed', st.completed,
        'completed_at', st.completed_at
      ) ORDER BY st.position)
      FROM delivery_stages st
      WHERE st.delivery_id = d.id
    ), '[]') AS stages
  FROM deliveries d
  LEFT JOIN sectors s ON s.id = d.sector_id
`;

interface DeliveryScope {
  sector_id: string;
  assigned_to_id: string | null;
  stage_count: number;
}

// Dados de uma entrega usados para conferir permissões
async function findDeliveryScope(id: string): Promise<DeliveryScope | null> {
  const result = await pool.query<DeliveryScope>(
    'SELECT sector_id, assigned_to_id, stage_count FROM deliveries WHERE id = $1;',
    [id]
  );
  return result.rows[0] ?? null;
}

// Usuário ativo que vai receber a entrega
async function findAssignee(id: string) {
  const result = await pool.query<{ id: string; name: string; sector_id: string | null }>(
    `SELECT id, name, sector_id FROM users WHERE id = $1 AND status = 'ATIVO';`,
    [id]
  );
  return result.rows[0] ?? null;
}

type Assignment =
  | { ok: true; assignedToId: string; assignedToName: string; sectorId: string }
  | { ok: false; status: number; message: string };

// Decide para quem e em qual setor a entrega fica, conforme o papel de quem pede
async function resolveAssignment(user: AuthUser, data: DeliveryBaseInput): Promise<Assignment> {
  const forSelf = !data.assigned_to_id || data.assigned_to_id === user.id;

  // COLABORADOR: sempre para si, no próprio setor
  if (!can(user, 'deliveries:assign')) {
    if (!forSelf) {
      return { ok: false, status: 403, message: 'Você só pode lançar entregas para você mesmo.' };
    }
    if (!user.sectorId) {
      return { ok: false, status: 403, message: 'Seu usuário não tem setor definido.' };
    }
    return { ok: true, assignedToId: user.id, assignedToName: user.name, sectorId: user.sectorId };
  }

  // LIDER: só no próprio setor (ADMIN: qualquer setor)
  if (!canActOnSector(user, data.sector_id)) {
    return { ok: false, status: 403, message: 'Você só pode registrar entregas do seu setor.' };
  }

  if (forSelf) {
    return { ok: true, assignedToId: user.id, assignedToName: user.name, sectorId: data.sector_id };
  }

  const assignee = await findAssignee(data.assigned_to_id!);
  if (!assignee) {
    return { ok: false, status: 400, message: 'Responsável não encontrado ou inativo.' };
  }
  if (assignee.sector_id && assignee.sector_id !== data.sector_id) {
    return { ok: false, status: 400, message: 'O responsável não pertence ao setor escolhido.' };
  }
  return { ok: true, assignedToId: assignee.id, assignedToName: assignee.name, sectorId: data.sector_id };
}

// Recalcula o percentual da entrega a partir das etapas concluídas
async function recalcProgress(client: PoolClient, deliveryId: string) {
  const result = await client.query(
    `UPDATE deliveries d
     SET progress = sub.pct,
         completed = (sub.pct = 100),
         completed_at = CASE WHEN sub.pct = 100 THEN COALESCE(d.completed_at, NOW()) ELSE NULL END
     FROM (
       SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE completed) / COUNT(*))::int AS pct
       FROM delivery_stages
       WHERE delivery_id = $1
     ) sub
     WHERE d.id = $1
     RETURNING d.*;`,
    [deliveryId]
  );
  return result.rows[0];
}

// Conclui uma etapa, recalcula o percentual e registra no histórico
async function completeStage(
  client: PoolClient,
  deliveryId: string,
  stageId: string,
  user: AuthUser,
  note: LaunchNote
) {
  await client.query(
    `UPDATE delivery_stages
     SET completed = TRUE, completed_at = NOW(), completed_by_id = $1
     WHERE id = $2;`,
    [user.id, stageId]
  );

  const delivery = await recalcProgress(client, deliveryId);

  await client.query(
    `INSERT INTO delivery_updates (delivery_id, stage_id, author_id, author_name, done_text, missing_text, progress)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [deliveryId, stageId, user.id, user.name, note.done_text, note.missing_text || null, delivery.progress]
  );

  return delivery;
}

// Pessoas para quem o usuário pode atribuir (LIDER: o seu setor; ADMIN: o setor escolhido ou todos)
router.get('/assignees', requirePermission('deliveries:assign'), async (req, res) => {
  const user = req.user!;
  const requested = typeof req.query.sector_id === 'string' ? req.query.sector_id : undefined;

  if (user.role !== 'ADMIN' && !user.sectorId) {
    res.json([]);
    return;
  }

  const sectorId = user.role === 'ADMIN' ? requested : user.sectorId!;
  if (sectorId && !deliveryIdSchema.safeParse(sectorId).success) {
    res.status(400).json({ message: 'Setor inválido.' });
    return;
  }

  const params: string[] = [];
  let where = `WHERE u.status = 'ATIVO'`;
  if (sectorId) {
    where += ' AND u.sector_id = $1';
    params.push(sectorId);
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.role, u.sector_id FROM users u ${where} ORDER BY u.name;`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar responsáveis:', error);
    res.status(500).json({ message: 'Erro ao listar responsáveis.' });
  }
});

// Listar entregas: ?scope=mine (minhas) ou ?scope=team (da equipe)
router.get('/deliveries', async (req, res) => {
  const user = req.user!;
  const parsed = listDeliveriesSchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const { scope, sector_id } = parsed.data;
  let where: string;
  const params: string[] = [];

  if (scope === 'mine') {
    where = 'WHERE d.assigned_to_id = $1';
    params.push(user.id);
  } else {
    if (!can(user, 'deliveries:view_team')) {
      sendForbidden(res);
      return;
    }

    if (user.role === 'ADMIN') {
      where = sector_id ? 'WHERE d.sector_id = $1' : '';
      if (sector_id) params.push(sector_id);
    } else {
      if (!user.sectorId) {
        res.json([]);
        return;
      }
      where = 'WHERE d.sector_id = $1'; // LIDER: sempre o próprio setor
      params.push(user.sectorId);
    }
  }

  try {
    const result = await pool.query(
      `${SELECT_DELIVERIES} ${where} ORDER BY d.due_date ASC, d.created_at DESC;`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar entregas:', error);
    res.status(500).json({ message: 'Erro ao listar entregas.' });
  }
});

// Criar entrega: etapa única ou 5/10 etapas (ou atividade não atribuída, já concluída)
router.post('/deliveries', async (req, res) => {
  const user = req.user!;
  const parsed = createDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  let assignment: Assignment;
  try {
    assignment = await resolveAssignment(user, parsed.data);
  } catch (error) {
    console.error('Erro ao validar responsável:', error);
    res.status(500).json({ message: 'Erro ao criar entrega.' });
    return;
  }

  if (!assignment.ok) {
    res.status(assignment.status).json({ message: assignment.message });
    return;
  }

  const { first_update } = parsed.data;
  if (first_update && assignment.assignedToId !== user.id) {
    res.status(400).json({ message: 'Só é possível lançar uma atividade sua.' });
    return;
  }

  // Sem etapas informadas: etapa única, com o título e o prazo da entrega
  const stages = parsed.data.stages ?? [{ title: parsed.data.title, due_date: parsed.data.due_date }];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO deliveries
         (title, description, assigned_to_id, assigned_to_name, assigned_by_id, assigned_by_name,
          sector_id, due_date, stage_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        parsed.data.title,
        parsed.data.description || null,
        assignment.assignedToId,
        assignment.assignedToName,
        user.id,
        user.name,
        assignment.sectorId,
        parsed.data.due_date,
        stages.length,
      ]
    );

    let delivery = inserted.rows[0];
    const stageIds: string[] = [];

    for (const [index, stage] of stages.entries()) {
      const createdStage = await client.query<{ id: string }>(
        `INSERT INTO delivery_stages (delivery_id, position, title, due_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id;`,
        [delivery.id, index + 1, stage.title, stage.due_date]
      );
      stageIds.push(createdStage.rows[0].id);
    }

    if (first_update) {
      delivery = await completeStage(client, delivery.id, stageIds[0], user, first_update);
    }

    await client.query('COMMIT');
    res.status(201).json(delivery);
  } catch (error) {
    await client.query('ROLLBACK');
    if (isForeignKeyError(error)) {
      res.status(400).json({ message: 'O setor informado não existe.' });
      return;
    }
    console.error('Erro ao criar entrega:', error);
    res.status(500).json({ message: 'Erro ao criar entrega.' });
  } finally {
    client.release();
  }
});

// Lançar: concluir uma etapa da entrega, contando o que foi feito
router.post('/deliveries/:id/updates', async (req, res) => {
  const user = req.user!;
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = launchSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE: trava a entrega até o fim da transação (evita dois lançamentos simultâneos)
    const found = await client.query<{ assigned_to_id: string | null }>(
      'SELECT assigned_to_id FROM deliveries WHERE id = $1 FOR UPDATE;',
      [id.data]
    );
    if (!found.rows[0]) {
      await client.query('ROLLBACK');
      sendNotFound(res);
      return;
    }
    if (found.rows[0].assigned_to_id !== user.id) {
      await client.query('ROLLBACK');
      sendForbidden(res, 'Só o responsável pode lançar nesta entrega.');
      return;
    }

    const stage = await client.query<{ completed: boolean }>(
      'SELECT completed FROM delivery_stages WHERE id = $1 AND delivery_id = $2 FOR UPDATE;',
      [parsed.data.stage_id, id.data]
    );
    if (!stage.rows[0]) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Etapa não encontrada nesta entrega.' });
      return;
    }
    if (stage.rows[0].completed) {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Esta etapa já foi concluída.' });
      return;
    }

    const delivery = await completeStage(client, id.data, parsed.data.stage_id, user, parsed.data);
    await client.query('COMMIT');
    res.status(201).json(delivery);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao lançar etapa:', error);
    res.status(500).json({ message: 'Erro ao lançar a etapa.' });
  } finally {
    client.release();
  }
});

// Histórico de lançamentos de uma entrega
router.get('/deliveries/:id/updates', async (req, res) => {
  const user = req.user!;
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  try {
    const scope = await findDeliveryScope(id.data);
    if (!scope) {
      sendNotFound(res);
      return;
    }
    if (scope.assigned_to_id !== user.id && !canActOnSector(user, scope.sector_id)) {
      sendForbidden(res);
      return;
    }

    const result = await pool.query(
      `SELECT u.id, u.author_name, u.done_text, u.missing_text, u.progress, u.created_at,
              st.title AS stage_title, st.position AS stage_position
       FROM delivery_updates u
       LEFT JOIN delivery_stages st ON st.id = u.stage_id
       WHERE u.delivery_id = $1
       ORDER BY u.created_at ASC;`,
      [id.data]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar histórico:', error);
    res.status(500).json({ message: 'Erro ao listar o histórico.' });
  }
});

// Reabrir uma etapa concluída (só LIDER do setor e ADMIN)
router.patch('/deliveries/:id/stages/:stageId/reopen', requirePermission('deliveries:edit'), async (req, res) => {
  const user = req.user!;
  const id = deliveryIdSchema.safeParse(req.params.id);
  const stageId = deliveryIdSchema.safeParse(req.params.stageId);
  if (!id.success || !stageId.success) {
    sendNotFound(res);
    return;
  }

  const scope = await findDeliveryScope(id.data).catch(() => null);
  if (!scope) {
    sendNotFound(res);
    return;
  }
  if (!canActOnSector(user, scope.sector_id)) {
    sendForbidden(res, 'Você só pode reabrir etapas de entregas do seu setor.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reopened = await client.query(
      `UPDATE delivery_stages
       SET completed = FALSE, completed_at = NULL, completed_by_id = NULL
       WHERE id = $1 AND delivery_id = $2
       RETURNING id;`,
      [stageId.data, id.data]
    );
    if (reopened.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Etapa não encontrada nesta entrega.' });
      return;
    }

    const delivery = await recalcProgress(client, id.data);
    await client.query('COMMIT');
    res.json(delivery);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao reabrir etapa:', error);
    res.status(500).json({ message: 'Erro ao reabrir a etapa.' });
  } finally {
    client.release();
  }
});

// Editar os dados gerais da entrega
router.put('/deliveries/:id', requirePermission('deliveries:edit'), async (req, res) => {
  const user = req.user!;
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = updateDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const client = await pool.connect();
  try {
    const scope = await findDeliveryScope(id.data);
    if (!scope) {
      sendNotFound(res);
      return;
    }
    if (!canActOnSector(user, scope.sector_id)) {
      sendForbidden(res, 'Você só pode editar entregas do seu setor.');
      return;
    }

    const assignment = await resolveAssignment(user, parsed.data);
    if (!assignment.ok) {
      res.status(assignment.status).json({ message: assignment.message });
      return;
    }

    // O prazo da entrega não pode ficar antes do prazo de alguma etapa
    if (scope.stage_count > 1) {
      const latest = await client.query<{ max: string | null }>(
        'SELECT MAX(due_date)::text AS max FROM delivery_stages WHERE delivery_id = $1;',
        [id.data]
      );
      const latestStage = latest.rows[0]?.max;
      if (latestStage && parsed.data.due_date < latestStage) {
        res.status(400).json({ message: 'O prazo da entrega não pode ficar antes do prazo das etapas.' });
        return;
      }
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE deliveries
       SET title = $1, description = $2, assigned_to_id = $3, assigned_to_name = $4,
           sector_id = $5, due_date = $6
       WHERE id = $7
       RETURNING *;`,
      [
        parsed.data.title,
        parsed.data.description || null,
        assignment.assignedToId,
        assignment.assignedToName,
        assignment.sectorId,
        parsed.data.due_date,
        id.data,
      ]
    );

    // Etapa única: acompanha o título e o prazo da entrega
    if (scope.stage_count === 1) {
      await client.query(
        'UPDATE delivery_stages SET title = $1, due_date = $2 WHERE delivery_id = $3;',
        [parsed.data.title, parsed.data.due_date, id.data]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (isForeignKeyError(error)) {
      res.status(400).json({ message: 'O setor informado não existe.' });
      return;
    }
    console.error('Erro ao editar entrega:', error);
    res.status(500).json({ message: 'Erro ao editar entrega.' });
  } finally {
    client.release();
  }
});

// Excluir entrega (etapas e histórico vão junto, pelo ON DELETE CASCADE)
router.delete('/deliveries/:id', requirePermission('deliveries:delete'), async (req, res) => {
  const user = req.user!;
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  try {
    const scope = await findDeliveryScope(id.data);
    if (!scope) {
      sendNotFound(res);
      return;
    }
    if (!canActOnSector(user, scope.sector_id)) {
      sendForbidden(res, 'Você só pode excluir entregas do seu setor.');
      return;
    }

    await pool.query('DELETE FROM deliveries WHERE id = $1;', [id.data]);
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir entrega:', error);
    res.status(500).json({ message: 'Erro ao excluir entrega.' });
  }
});

export default router;