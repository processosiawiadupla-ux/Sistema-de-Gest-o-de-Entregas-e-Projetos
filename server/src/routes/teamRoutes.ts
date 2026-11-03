import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { requirePermission } from '../auth/authorize.js';
import { createUserToken } from '../auth/userTokens.js';
import { sendMail } from '../mail/mailer.js';
import { inviteEmail } from '../mail/templates.js';

const router = Router();

const inviteSchema = z.object({
  name: z.string('Informe o nome.').trim().min(1, 'Informe o nome.').max(255, 'Nome muito longo.'),
  email: z
    .string('Informe o e-mail.')
    .trim()
    .toLowerCase()
    .pipe(z.email('Informe um e-mail válido.'))
    .refine((email) => email.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`), {
      message: `Use um e-mail @${env.ALLOWED_EMAIL_DOMAIN}.`,
    }),
  role: z.enum(['ADMIN', 'LIDER', 'COLABORADOR'], 'Papel inválido.'),
  sector_id: z.uuid('Selecione um setor.').nullish(),
});

// Membros da equipe (ADMIN: todos; LIDER: só quem ele convidou)
router.get('/team', requirePermission('team:view'), async (req, res) => {
  const user = req.user!;
  const params: string[] = [];
  let where = '';

  if (user.role !== 'ADMIN') {
    where = 'WHERE u.invited_by_id = $1';
    params.push(user.id);
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.sector_id, s.name AS sector_name,
              inv.name AS invited_by_name, u.created_at
       FROM users u
       LEFT JOIN sectors s ON s.id = u.sector_id
       LEFT JOIN users inv ON inv.id = u.invited_by_id
       ${where}
       ORDER BY (u.status = 'INATIVO'), u.name;`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar equipe:', error);
    res.status(500).json({ message: 'Erro ao listar a equipe.' });
  }
});

// Convidar um novo membro (ADMIN: qualquer papel e setor; LIDER: só COLABORADOR do seu setor)
router.post('/team/invites', requirePermission('team:invite'), async (req, res) => {
  const user = req.user!;
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { name, email, role } = parsed.data;
  let sectorId = parsed.data.sector_id ?? null;

  // Ninguém concede um poder que não tem
  if (user.role === 'LIDER') {
    if (role !== 'COLABORADOR') {
      res.status(403).json({ message: 'Líderes só podem convidar colaboradores.' });
      return;
    }
    sectorId = user.sectorId; // sempre o setor do líder
  }

  if (role !== 'ADMIN' && !sectorId) {
    res.status(400).json({ message: 'Selecione o setor do novo membro.' });
    return;
  }

  const client = await pool.connect();
  let token: string;
  let sectorName: string | null = null;

  try {
    await client.query('BEGIN');

    if (sectorId) {
      const sector = await client.query<{ name: string }>('SELECT name FROM sectors WHERE id = $1;', [sectorId]);
      if (!sector.rows[0]) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'O setor informado não existe.' });
        return;
      }
      sectorName = sector.rows[0].name;
    }

    const existing = await client.query<{ id: string; status: string; invited_by_id: string | null }>(
      'SELECT id, status, invited_by_id FROM users WHERE email = $1 FOR UPDATE;',
      [email]
    );

    let userId: string;

    if (existing.rows[0]) {
      const found = existing.rows[0];

      if (found.status !== 'PENDENTE') {
        await client.query('ROLLBACK');
        res.status(409).json({ message: 'Já existe um usuário com esse e-mail.' });
        return;
      }
      // LIDER só reenvia os convites que ele mesmo fez
      if (user.role === 'LIDER' && found.invited_by_id !== user.id) {
        await client.query('ROLLBACK');
        res.status(409).json({ message: 'Já existe um convite pendente para esse e-mail.' });
        return;
      }

      // Reenvio: atualiza os dados (quem convidou continua o mesmo)
      userId = found.id;
      await client.query('UPDATE users SET name = $1, role = $2, sector_id = $3 WHERE id = $4;', [
        name,
        role,
        sectorId,
        userId,
      ]);
    } else {
      // Senha impossível de usar até a pessoa criar a sua
      const unusableHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      const created = await client.query<{ id: string }>(
        `INSERT INTO users (name, email, password_hash, role, status, sector_id, invited_by_id)
         VALUES ($1, $2, $3, $4, 'PENDENTE', $5, $6)
         RETURNING id;`,
        [name, email, unusableHash, role, sectorId, user.id]
      );
      userId = created.rows[0].id;
    }

    token = await createUserToken(client, userId, 'INVITE', user.id);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar convite:', error);
    res.status(500).json({ message: 'Erro ao criar o convite.' });
    return;
  } finally {
    client.release();
  }

  // O e-mail sai depois de o convite estar salvo
  try {
    await sendMail(
      inviteEmail({
        name,
        email,
        inviterName: user.name,
        sectorName,
        link: `${env.APP_URL}/criar-senha?token=${token}`,
      })
    );
    res.status(201).json({ message: `Convite enviado para ${email}.` });
  } catch (error) {
    console.error('Erro ao enviar e-mail de convite:', error);
    res.status(502).json({ message: 'O convite foi criado, mas o e-mail não pôde ser enviado. Tente reenviar.' });
  }
});

export default router;