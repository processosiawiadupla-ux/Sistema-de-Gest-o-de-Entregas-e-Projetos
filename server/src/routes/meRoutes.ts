import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../config/database.js';

// Rotas da própria pessoa logada (já chegam autenticadas pelo server.ts)
const router = Router();

const nameSchema = z.object({
  name: z.string('Informe o nome.').trim().min(1, 'Informe o nome.').max(255, 'Nome muito longo.'),
});

const passwordSchema = z.object({
  current_password: z.string('Informe a senha atual.').min(1, 'Informe a senha atual.'),
  new_password: z
    .string('Informe a nova senha.')
    .min(10, 'A nova senha precisa ter pelo menos 10 caracteres.')
    .max(200, 'Senha muito longa.'),
});

// Evita alguém testar várias senhas atuais seguidas
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.id,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
});

const SELECT_PROFILE = `
  SELECT u.id, u.name, u.email, u.role, u.created_at,
         s.name AS sector_name, mgr.name AS manager_name
  FROM users u
  LEFT JOIN sectors s ON s.id = u.sector_id
  LEFT JOIN users mgr ON mgr.id = u.manager_id
  WHERE u.id = $1;
`;

// Dados do meu perfil
router.get('/me/profile', async (req, res) => {
  try {
    const result = await pool.query(SELECT_PROFILE, [req.user!.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    res.status(500).json({ message: 'Erro ao carregar o perfil.' });
  }
});

// Mudar o meu nome (o resto só o ADMIN altera)
router.patch('/me', async (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  try {
    await pool.query('UPDATE users SET name = $1 WHERE id = $2;', [parsed.data.name, req.user!.id]);
    const result = await pool.query(SELECT_PROFILE, [req.user!.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar o perfil.' });
  }
});

// Trocar a minha senha (pede a atual). Depois disso, todas as sessões são encerradas.
router.post('/me/password', passwordLimiter, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }
  const { current_password, new_password } = parsed.data;

  try {
    const found = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1;',
      [req.user!.id],
    );
    const hash = found.rows[0]?.password_hash;

    if (!hash || !(await bcrypt.compare(current_password, hash))) {
      res.status(400).json({ message: 'A senha atual está incorreta.' });
      return;
    }
    if (await bcrypt.compare(new_password, hash)) {
      res.status(400).json({ message: 'A nova senha precisa ser diferente da atual.' });
      return;
    }

    const newHash = await bcrypt.hash(new_password, 12);
    // password_changed_at = agora → todas as sessões abertas deixam de valer
    await pool.query('UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2;', [
      newHash,
      req.user!.id,
    ]);
    // Links de redefinição que estavam pendentes também deixam de valer
    await pool.query('UPDATE user_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL;', [
      req.user!.id,
    ]);

    res.json({ message: 'Senha alterada. Entre de novo com a nova senha.' });
  } catch (error) {
    console.error('Erro ao trocar senha:', error);
    res.status(500).json({ message: 'Erro ao trocar a senha.' });
  }
});

export default router;