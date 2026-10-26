import { Router } from 'express';
import { pool } from '../config/database.js';

const router = Router();

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
  const { name, description, owner, department, start_date, due_date, status, notes } = req.body;

  if (!name) {
    res.status(400).json({ message: 'O nome do projeto é obrigatório.' });
    return;
  }

  const query = `
    INSERT INTO projects (name, description, owner, department, start_date, due_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'not_started'), $8)
    RETURNING *;
  `;

  const values = [
    name,
    description ?? null,
    owner ?? null,
    department ?? null,
    start_date ?? null,
    due_date ?? null,
    status ?? null,
    notes ?? null,
  ];

  try {
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ message: 'Erro ao criar projeto.' });
  }
});

export default router;