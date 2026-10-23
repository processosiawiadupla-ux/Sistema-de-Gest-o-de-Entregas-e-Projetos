import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// GET: Obter todos os projetos
router.get('/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar projetos' });
  }
});

// POST: Criar um novo projeto
router.post('/projects', async (req, res) => {
  try {
    const { name, description, status } = req.body;
    
    const query = `
      INSERT INTO projects (name, description, status) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;
    
    const values = [name, description, status || 'pending'];
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({ error: 'Erro interno ao criar projeto' });
  }
});
export default router;

