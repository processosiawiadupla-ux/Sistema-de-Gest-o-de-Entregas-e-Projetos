import { Router, type Response } from 'express';
import type { ZodError } from 'zod';
import { pool } from '../config/database.js';
import {
  createDeliverySchema,
  completeDeliverySchema,
  deliveryIdSchema,
  type CreateDeliveryInput,
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

// Código 23503 do PostgreSQL: a chave estrangeira aponta para algo que não existe
function isForeignKeyError(error: unknown) {
  return (error as { code?: string }).code === '23503';
}

function toValues(data: CreateDeliveryInput) {
  return [
    data.title,
    data.description || null,
    data.project_id ?? null,
    data.assigned_to_name,
    data.assigned_by_name || null,
    data.sector || null,
    data.due_date,
  ];
}

// Listar entregas (com o nome do projeto, quando houver)
router.get('/deliveries', async (_req, res) => {
  const query = `
    SELECT d.*, p.name AS project_name
    FROM deliveries d
    LEFT JOIN projects p ON p.id = d.project_id
    ORDER BY d.due_date ASC, d.created_at DESC;
  `;

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar entregas:', error);
    res.status(500).json({ message: 'Erro ao listar entregas.' });
  }
});

// Criar entrega (lançar ou atribuir)
router.post('/deliveries', async (req, res) => {
  const parsed = createDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const query = `
    INSERT INTO deliveries (title, description, project_id, assigned_to_name, assigned_by_name, sector, due_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, toValues(parsed.data));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isForeignKeyError(error)) {
      res.status(400).json({ message: 'O projeto informado não existe.' });
      return;
    }
    console.error('Erro ao criar entrega:', error);
    res.status(500).json({ message: 'Erro ao criar entrega.' });
  }
});

// Editar entrega
router.put('/deliveries/:id', async (req, res) => {
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = createDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const query = `
    UPDATE deliveries
    SET title = $1,
        description = $2,
        project_id = $3,
        assigned_to_name = $4,
        assigned_by_name = $5,
        sector = $6,
        due_date = $7
    WHERE id = $8
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
    if (isForeignKeyError(error)) {
      res.status(400).json({ message: 'O projeto informado não existe.' });
      return;
    }
    console.error('Erro ao editar entrega:', error);
    res.status(500).json({ message: 'Erro ao editar entrega.' });
  }
});

// Marcar como concluída ou pendente
router.patch('/deliveries/:id/complete', async (req, res) => {
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  const parsed = completeDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const query = `
    UPDATE deliveries
    SET completed = $1,
        completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END
    WHERE id = $2
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [parsed.data.completed, id.data]);
    if (result.rowCount === 0) {
      sendNotFound(res);
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao concluir entrega:', error);
    res.status(500).json({ message: 'Erro ao atualizar a entrega.' });
  }
});

// Excluir entrega
router.delete('/deliveries/:id', async (req, res) => {
  const id = deliveryIdSchema.safeParse(req.params.id);
  if (!id.success) {
    sendNotFound(res);
    return;
  }

  try {
    const result = await pool.query('DELETE FROM deliveries WHERE id = $1;', [id.data]);
    if (result.rowCount === 0) {
      sendNotFound(res);
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir entrega:', error);
    res.status(500).json({ message: 'Erro ao excluir entrega.' });
  }
});

export default router;