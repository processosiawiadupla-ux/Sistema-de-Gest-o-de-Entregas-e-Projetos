import { Router, type Response } from 'express';
import type { ZodError } from 'zod';
import { pool } from '../config/database.js';
import {
  createProjectSchema,
  projectIdSchema,
  type CreateProjectInput,
} from '../schemas/projectSchema.js';

const router = Router();

// Resposta padrão para dados inválidos
function sendValidationError(res: Response, error: ZodError) {
  res.status(400).json({
    message: error.issues[0].message,
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

// Resposta padrão para projeto inexistente
function sendNotFound(res: Response) {
  res.status(404).json({ message: 'Projeto não encontrado.' });
}

// Converte os dados validados na lista de valores da query
function toValues(data: CreateProjectInput) {
  return [
    data.name,
    data.description || null,
    data.owner || null,
    data.department || null,
    data.start_date ?? null,
    data.due_date ?? null,
    data.status ?? null,
    data.notes || null,
  ];
}

// Listar projetos
router.get('/projects', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC;');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    res.status(500).json({ message: 'Erro ao listar projetos.' });
  }
});

// Criar projeto
router.post('/projects', async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const query = `
    INSERT INTO projects (name, description, owner, department, start_date, due_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'not_started'), $8)
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, toValues(parsed.data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ message: 'Erro ao criar projeto.' });
  }
});

// Editar projeto
router.put('/projects/:id', async (req, res) => {
  const id = projectIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const query = `
    UPDATE projects
    SET name = $1,
        description = $2,
        owner = $3,
        department = $4,
        start_date = $5,
        due_date = $6,
        status = COALESCE($7, status),
        notes = $8
    WHERE id = $9
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [...toValues(parsed.data), id.data]);
    if (result.rowCount === 0) {
      sendNotFound(res);
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao editar projeto:', error);
    res.status(500).json({ message: 'Erro ao editar projeto.' });
  }
});

// Excluir projeto
router.delete('/projects/:id', async (req, res) => {
  const id = projectIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1;', [id.data]);
    if (result.rowCount === 0) {
      sendNotFound(res);
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    res.status(500).json({ message: 'Erro ao excluir projeto.' });
  }
});

export default router;