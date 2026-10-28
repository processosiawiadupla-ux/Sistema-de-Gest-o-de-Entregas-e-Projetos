import { Router } from 'express';
import { pool } from '../config/database.js';

// Todas as rotas daqui já chegam protegidas (só ADMIN), pela entrada no server.ts
const router = Router();

// Listar usuários
router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.sector_id,
             s.name AS sector_name, u.created_at
      FROM users u
      LEFT JOIN sectors s ON s.id = u.sector_id
      ORDER BY u.name;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
});

export default router;