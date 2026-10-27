import { Router } from 'express';
import { pool } from '../config/database.js';

const router = Router();

// Listar setores ativos, em ordem alfabética
router.get('/sectors', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM sectors WHERE active = TRUE ORDER BY name;'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar setores:', error);
    res.status(500).json({ message: 'Erro ao listar setores.' });
  }
});

export default router;