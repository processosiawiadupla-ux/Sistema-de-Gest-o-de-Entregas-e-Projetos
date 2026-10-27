import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../auth/authenticate.js';
import { AUTH_COOKIE, clearCookieOptions, sessionCookieOptions, signToken } from '../auth/token.js';
import { findUserByEmail, toAuthUser } from '../auth/userQueries.js';
import { toUserResponse } from '../auth/types.js';

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

const loginSchema = z.object({
  email: z
    .string('Informe o e-mail.')
    .trim()
    .toLowerCase()
    .pipe(z.email('Informe um e-mail válido.')),
  password: z.string('Informe a senha.').min(1, 'Informe a senha.'),
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

export default router;