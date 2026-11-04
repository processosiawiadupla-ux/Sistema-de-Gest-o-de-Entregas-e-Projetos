import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { createUserToken } from '../auth/userTokens.js';
import { sendMail } from '../mail/mailer.js';
import { resetEmail } from '../mail/templates.js';

// Rota PÚBLICA: qualquer pessoa na internet consegue chamar.
// Por isso a resposta é sempre igual e há limites de uso.
const router = Router();

const NEUTRAL_MESSAGE =
  'Se esse e-mail estiver cadastrado e ativo, você vai receber um link para criar uma nova senha. Confira também o spam.';

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.')),
});

// No máximo 5 pedidos a cada 15 minutos por endereço de rede
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
});

// Gera o link e envia o e-mail (roda depois que a resposta já saiu)
async function sendResetIfAllowed(email: string) {
  const client = await pool.connect();
  let token: string;
  let user: { id: string; name: string };

  try {
    const found = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM users WHERE email = $1 AND status = 'ATIVO';`,
      [email],
    );
    if (!found.rows[0]) return; // não existe ou não está ativo: não faz nada
    user = found.rows[0];

    // No máximo 1 e-mail a cada 2 minutos para a mesma pessoa
    const recent = await client.query(
      `SELECT 1 FROM user_tokens
       WHERE user_id = $1 AND purpose = 'RESET' AND created_at > NOW() - INTERVAL '2 minutes'
       LIMIT 1;`,
      [user.id],
    );
    if (recent.rowCount) return;

    await client.query('BEGIN');
    token = await createUserToken(client, user.id, 'RESET', user.id);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao gerar redefinição (esqueci minha senha):', error);
    return;
  } finally {
    client.release();
  }

  try {
    await sendMail(
      resetEmail({ name: user.name, email, link: `${env.APP_URL}/criar-senha?token=${token}` }),
    );
  } catch (error) {
    console.error('Erro ao enviar e-mail (esqueci minha senha):', error);
  }
}

router.post('/auth/forgot-password', forgotLimiter, (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  // Responde na hora, sempre igual; o trabalho continua em segundo plano
  res.json({ message: NEUTRAL_MESSAGE });
  void sendResetIfAllowed(parsed.data.email);
});

export default router;