import { Router, type Response } from 'express';
import type { PoolClient } from 'pg';
import type { ZodError } from 'zod';
import { pool } from '../config/database.js';
import { requirePermission } from '../auth/authorize.js';
import { canActOnSector } from '../auth/permissions.js';
import type { AuthUser } from '../auth/types.js';
import {
  createProjectSchema,
  updateProjectSchema,
  stageSchema,
  moveStageSchema,
  projectIdSchema,
  type UpdateProjectInput,
} from '../schemas/projectSchema.js';

const router = Router();
type Db = PoolClient | typeof pool;

// ---------- Ajudantes ----------

function sendValidationError(res: Response, error: ZodError) {
  res.status(400).json({
    message: error.issues[0].message,
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

function sendNotFound(res: Response, what = 'Projeto') {
  res.status(404).json({ message: `${what} não encontrado.` });
}

const FORBIDDEN_SECTOR = 'Você só pode gerenciar projetos do seu setor.';
const INVALID_RESPONSIBLE =
  'Responsável inválido: escolha uma pessoa ativa do setor do projeto.';

// Código 23503 do PostgreSQL: a chave estrangeira aponta para algo que não existe
function isForeignKeyError(error: unknown) {
  return (error as { code?: string }).code === '23503';
}

// $3 = owner_id (o nome do responsável é buscado pelo banco)
function toValues(data: UpdateProjectInput) {
  return [
    data.name,
    data.description || null,
    data.owner_id,
    data.sector_id ?? null,
    data.start_date ?? null,
    data.due_date ?? null,
    data.status ?? null,
    data.notes || null,
  ];
}

// Projeto + setor + etapas (na ordem em que foram criadas)
const SELECT_PROJECTS = `
  SELECT p.*,
         s.name AS sector_name,
         COALESCE(st.stages, '[]'::json) AS stages
  FROM projects p
  LEFT JOIN sectors s ON s.id = p.sector_id
  LEFT JOIN LATERAL (
    SELECT json_agg(
             json_build_object(
               'id', ps.id,
               'position', ps.position,
               'title', ps.title,
               'due_date', ps.due_date,
               'responsible_id', ps.responsible_id,
               'responsible_name', u.name,
               'status', ps.status,
               'completed_at', ps.completed_at
             ) ORDER BY ps.position
           ) AS stages
    FROM project_stages ps
    JOIN users u ON u.id = ps.responsible_id
    WHERE ps.project_id = p.id
  ) st ON TRUE
`;

async function findProject(db: Db, id: string) {
  const result = await db.query(`${SELECT_PROJECTS} WHERE p.id = $1;`, [id]);
  return result.rows[0] ?? null;
}

// Dados do projeto usados nas checagens de permissão e de prazo
async function loadProjectInfo(db: Db, id: string) {
  const result = await db.query(
    'SELECT sector_id, start_date, due_date FROM projects WHERE id = $1;',
    [id],
  );
  return (result.rows[0] as
    | { sector_id: string | null; start_date: string | null; due_date: string | null }
    | undefined) ?? null;
}

// O responsável precisa estar ATIVO, ser do setor do projeto (se houver)
// e, para o LIDER, ser do setor dele.
async function responsiblesAreValid(
  db: Db,
  user: AuthUser,
  ids: string[],
  projectSectorId: string | null,
) {
  const unique = [...new Set(ids)];
  const result = await db.query(
    `SELECT id FROM users
     WHERE id = ANY($1::uuid[])
       AND status = 'ATIVO'
       AND ($2::uuid IS NULL OR sector_id = $2)
       AND ($3::uuid IS NULL OR sector_id = $3);`,
    [unique, user.role === 'ADMIN' ? null : user.sectorId, projectSectorId],
  );
  return result.rowCount === unique.length;
}

// ---------- Rotas ----------

// Pessoas que podem ser responsáveis (a tela filtra pelo setor escolhido)
router.get('/projects/assignees', requirePermission('projects:manage'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.sector_id, s.name AS sector_name
       FROM users u
       LEFT JOIN sectors s ON s.id = u.sector_id
       WHERE u.status = 'ATIVO'
         AND ($1::uuid IS NULL OR u.sector_id = $1)
       ORDER BY u.name;`,
      [req.user!.role === 'ADMIN' ? null : req.user!.sectorId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar responsáveis:', error);
    res.status(500).json({ message: 'Erro ao listar responsáveis.' });
  }
});

// Listar projetos com as etapas
router.get('/projects', requirePermission('projects:view'), async (_req, res) => {
  try {
    const result = await pool.query(`${SELECT_PROJECTS} ORDER BY p.created_at DESC;`);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({ message: 'Erro ao listar projetos.' });
  }
});

// Criar projeto + etapas (tudo ou nada)
router.post('/projects', requirePermission('projects:manage'), async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const data = parsed.data;
  const sectorId = data.sector_id ?? null;

  if (!canActOnSector(req.user!, sectorId)) {
    res.status(403).json({ message: FORBIDDEN_SECTOR });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = [data.owner_id, ...data.stages.map((s) => s.responsible_id)];
    if (!(await responsiblesAreValid(client, req.user!, ids, sectorId))) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: INVALID_RESPONSIBLE });
      return;
    }

    const created = await client.query(
      `INSERT INTO projects
         (name, description, owner_id, owner, sector_id, start_date, due_date, status, notes)
       VALUES ($1, $2, $3, (SELECT name FROM users WHERE id = $3), $4, $5, $6,
               COALESCE($7, 'not_started'), $8)
       RETURNING id;`,
      toValues(data),
    );
    const projectId: string = created.rows[0].id;

    for (const [index, stage] of data.stages.entries()) {
      await client.query(
        `INSERT INTO project_stages (project_id, position, title, due_date, responsible_id)
         VALUES ($1, $2, $3, $4, $5);`,
        [projectId, index + 1, stage.title, stage.due_date, stage.responsible_id],
      );
    }

    const project = await findProject(client, projectId);
    await client.query('COMMIT');
    res.status(201).json(project);
  } catch (error) {
    await client.query('ROLLBACK');
    if (isForeignKeyError(error)) {
      res.status(400).json({ message: 'O setor ou o responsável informado não existe.' });
      return;
    }
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ message: 'Erro ao criar projeto.' });
  } finally {
    client.release();
  }
});

// Editar dados gerais do projeto
router.put('/projects/:id', requirePermission('projects:manage'), async (req, res) => {
  const id = projectIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const data = parsed.data;
  const newSectorId = data.sector_id ?? null;

  try {
    const current = await loadProjectInfo(pool, id.data);
    if (!current) {
      sendNotFound(res);
      return;
    }
    // Precisa poder mexer no setor atual E no novo
    if (!canActOnSector(req.user!, current.sector_id) || !canActOnSector(req.user!, newSectorId)) {
      res.status(403).json({ message: FORBIDDEN_SECTOR });
      return;
    }

    if (!(await responsiblesAreValid(pool, req.user!, [data.owner_id], newSectorId))) {
      res.status(400).json({ message: INVALID_RESPONSIBLE });
      return;
    }

    // Ao trocar de setor, as etapas não podem ficar com gente de outro setor
    if (newSectorId) {
      const foreign = await pool.query(
        `SELECT 1 FROM project_stages ps
         JOIN users u ON u.id = ps.responsible_id
         WHERE ps.project_id = $1 AND u.sector_id IS DISTINCT FROM $2
         LIMIT 1;`,
        [id.data, newSectorId],
      );
      if (foreign.rowCount) {
        res.status(400).json({
          message: 'Há etapas com responsáveis de outro setor. Ajuste as etapas antes de trocar o setor.',
        });
        return;
      }
    }

    // O novo prazo final não pode ficar antes do prazo de alguma etapa
    if (data.due_date) {
      const late = await pool.query(
        'SELECT 1 FROM project_stages WHERE project_id = $1 AND due_date > $2 LIMIT 1;',
        [id.data, data.due_date],
      );
      if (late.rowCount) {
        res.status(400).json({ message: 'Há etapas com prazo depois do novo prazo final.' });
        return;
      }
    }

    await pool.query(
      `UPDATE projects
       SET name = $1, description = $2,
           owner_id = $3, owner = (SELECT name FROM users WHERE id = $3),
           sector_id = $4, start_date = $5, due_date = $6,
           status = COALESCE($7, status), notes = $8
       WHERE id = $9;`,
      [...toValues(data), id.data],
    );
    res.json(await findProject(pool, id.data));
  } catch (error) {
    if (isForeignKeyError(error)) {
      res.status(400).json({ message: 'O setor ou o responsável informado não existe.' });
      return;
    }
    console.error('Erro ao editar projeto:', error);
    res.status(500).json({ message: 'Erro ao editar projeto.' });
  }
});

// Kanban: mover um cartão de coluna
router.patch(
  '/projects/:id/stages/:stageId',
  requirePermission('projects:manage'),
  async (req, res) => {
    const id = projectIdSchema.safeParse(req.params.id);
    const stageId = projectIdSchema.safeParse(req.params.stageId);
    if (!id.success || !stageId.success) {
      sendNotFound(res, 'Etapa');
      return;
    }

    const parsed = moveStageSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }

    try {
      const project = await loadProjectInfo(pool, id.data);
      if (!project) {
        sendNotFound(res);
        return;
      }
      if (!canActOnSector(req.user!, project.sector_id)) {
        res.status(403).json({ message: FORBIDDEN_SECTOR });
        return;
      }

      // $4 diz se a etapa foi para "Concluído" (parâmetro separado, sem conflito de tipo)
      const result = await pool.query(
        `UPDATE project_stages
         SET status = $1,
             completed_at = CASE WHEN $4 THEN COALESCE(completed_at, NOW()) ELSE NULL END
         WHERE id = $2 AND project_id = $3;`,
        [parsed.data.status, stageId.data, id.data, parsed.data.status === 'done'],
      );
      if (result.rowCount === 0) {
        sendNotFound(res, 'Etapa');
        return;
      }
      res.json(await findProject(pool, id.data));
    } catch (error) {
      console.error('Erro ao mover etapa:', error);
      res.status(500).json({ message: 'Erro ao mover etapa.' });
    }
  },
);

// Editar título, prazo ou responsável de uma etapa
router.put(
  '/projects/:id/stages/:stageId',
  requirePermission('projects:manage'),
  async (req, res) => {
    const id = projectIdSchema.safeParse(req.params.id);
    const stageId = projectIdSchema.safeParse(req.params.stageId);
    if (!id.success || !stageId.success) {
      sendNotFound(res, 'Etapa');
      return;
    }

    const parsed = stageSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    const stage = parsed.data;

    try {
      const project = await loadProjectInfo(pool, id.data);
      if (!project) {
        sendNotFound(res);
        return;
      }
      if (!canActOnSector(req.user!, project.sector_id)) {
        res.status(403).json({ message: FORBIDDEN_SECTOR });
        return;
      }
      if (!(await responsiblesAreValid(pool, req.user!, [stage.responsible_id], project.sector_id))) {
        res.status(400).json({ message: INVALID_RESPONSIBLE });
        return;
      }

      const { start_date, due_date } = project;
      if ((due_date && stage.due_date > due_date) || (start_date && stage.due_date < start_date)) {
        res.status(400).json({ message: 'O prazo da etapa deve ficar dentro das datas do projeto.' });
        return;
      }

      const result = await pool.query(
        `UPDATE project_stages
         SET title = $1, due_date = $2, responsible_id = $3
         WHERE id = $4 AND project_id = $5;`,
        [stage.title, stage.due_date, stage.responsible_id, stageId.data, id.data],
      );
      if (result.rowCount === 0) {
        sendNotFound(res, 'Etapa');
        return;
      }
      res.json(await findProject(pool, id.data));
    } catch (error) {
      console.error('Erro ao editar etapa:', error);
      res.status(500).json({ message: 'Erro ao editar etapa.' });
    }
  },
);

// Excluir projeto (as etapas vão junto, pelo ON DELETE CASCADE)
router.delete('/projects/:id', requirePermission('projects:manage'), async (req, res) => {
  const id = projectIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  try {
    const project = await loadProjectInfo(pool, id.data);
    if (!project) {
      sendNotFound(res);
      return;
    }
    if (!canActOnSector(req.user!, project.sector_id)) {
      res.status(403).json({ message: FORBIDDEN_SECTOR });
      return;
    }

    await pool.query('DELETE FROM projects WHERE id = $1;', [id.data]);
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    res.status(500).json({ message: 'Erro ao excluir projeto.' });
  }
});

export default router;