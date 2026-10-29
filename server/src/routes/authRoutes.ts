import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { authenticate } from '../auth/authenticate.js';
import { AUTH_COOKIE, clearCookieOptions, sessionCookieOptions, signToken } from '../auth/token.js';
import { findActiveUserById, findUserByEmail, toAuthUser } from '../auth/userQueries.js';
import { toUserResponse } from '../auth/types.js';
import { hashToken } from '../auth/userTokens.js';

const router = Router();

// No máximo 5 tentativas erradas a cada 15 minutos, por endereço IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' },
});

// Limite para conferir links e criar senha
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

const loginSchema = z.object({
  email: z
    .string('Informe o e-mail.')
    .trim()
    .toLowerCase()
    .pipe(z.email('Informe um e-mail válido.')),
  password: z.string('Informe a senha.').min(1, 'Informe a senha.'),
});

// Política de senha: pelo menos 10 caracteres (frases longas são as senhas mais fortes)
const passwordSchema = z
  .string('Informe a senha.')
  .min(10, 'A senha precisa ter pelo menos 10 caracteres.')
  .max(128, 'A senha pode ter no máximo 128 caracteres.');

const setPasswordSchema = z.object({
  token: z.string('Link inválido.').min(20, 'Link inválido.').max(200, 'Link inválido.'),
  password: passwordSchema,
});

// Hash "falso", usado quando o e-mail não existe (deixa o tempo de resposta igual)
const DUMMY_HASH = bcrypt.hashSync('senha-que-nao-existe', 12);

// Entrar
router.post('/auth/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const row = await findUserByEmail(email);
    const passwordOk = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);

    if (!row || !passwordOk) {
      res.status(401).json({ message: 'E-mail ou senha inválidos.' });
      return;
    }

    if (row.status === 'PENDENTE') {
      res.status(403).json({ message: 'Seu acesso ainda não foi ativado. Use o link enviado para o seu e-mail.' });
      return;
    }
    if (row.status !== 'ATIVO') {
      res.status(403).json({ message: 'Usuário inativo. Procure o administrador.' });
      return;
    }

    const user = toAuthUser(row);
    res.cookie(AUTH_COOKIE, signToken(user.id), sessionCookieOptions);
    res.json(toUserResponse(user));
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro ao fazer login.' });
  }
});

// Sair
router.post('/auth/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.status(204).end();
});

// Quem sou eu (o frontend usa ao abrir a página)
router.get('/auth/me', authenticate, (req, res) => {
  res.json(toUserResponse(req.user!));
});

// Confere um link (convite ou redefinição) antes de mostrar a tela de criar senha
router.get('/auth/tokens/:token', tokenLimiter, async (req, res) => {
  try {
    const result = await pool.query<{ name: string; email: string; purpose: string }>(
      `SELECT u.name, u.email, t.purpose
       FROM user_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW() AND u.status <> 'INATIVO';`,
       [hashToken(String(req.params.token))]
    );

    if (!result.rows[0]) {
      res.status(400).json({ message: 'Este link é inválido ou expirou. Peça um novo.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao conferir link:', error);
    res.status(500).json({ message: 'Erro ao conferir o link.' });
  }
});

// Criar (ou redefinir) a senha a partir do link, e já entrar no sistema
router.post('/auth/set-password', tokenLimiter, async (req, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const client = await pool.connect();
  let userId: string;

  try {
    await client.query('BEGIN');

    // FOR UPDATE: impede que o mesmo link seja usado duas vezes ao mesmo tempo
    const found = await client.query<{ id: string; user_id: string }>(
      `SELECT t.id, t.user_id
       FROM user_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW() AND u.status <> 'INATIVO'
       FOR UPDATE OF t;`,
      [hashToken(parsed.data.token)]
    );

    if (!found.rows[0]) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Este link é inválido ou expirou. Peça um novo.' });
      return;
    }

    const tokenId = found.rows[0].id;
    userId = found.rows[0].user_id;
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await client.query(
      `UPDATE users
       SET password_hash = $1, status = 'ATIVO', password_changed_at = NOW()
       WHERE id = $2;`,
      [passwordHash, userId]
    );
    await client.query('UPDATE user_tokens SET used_at = NOW() WHERE id = $1;', [tokenId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao definir senha:', error);
    res.status(500).json({ message: 'Erro ao definir a senha.' });
    return;
  } finally {
    client.release();
  }

  // Já entra no sistema com a senha nova
  try {
    const found = await findActiveUserById(userId);
    if (!found) {
      res.status(500).json({ message: 'Erro ao entrar no sistema.' });
      return;
    }
    res.cookie(AUTH_COOKIE, signToken(userId), sessionCookieOptions);
    res.json(toUserResponse(found.user));
  } catch (error) {
    console.error('Erro ao entrar após criar a senha:', error);
    res.status(500).json({ message: 'Senha criada. Faça login com a senha nova.' });
  }
});

export default router;