import { Router } from 'express';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { createUserToken } from '../auth/userTokens.js';
import { sendMail } from '../mail/mailer.js';
import { resetEmail } from '../mail/templates.js';

// Todas as rotas daqui já chegam protegidas (só ADMIN), pela entrada no server.ts
const router = Router();

const idSchema = z.uuid();

const updateUserSchema = z.object({
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
  sector_id: z.uuid('Setor inválido.').nullish(),
  status: z.enum(['ATIVO', 'INATIVO'], 'Status inválido.').optional(),
  // Gestor direto: null = ninguém (topo) | não enviado = mantém o atual
  manager_id: z.uuid('Gestor inválido.').nullable().optional(),
});

const SELECT_USER = `
  SELECT u.id, u.name, u.email, u.role, u.status, u.sector_id,
         s.name AS sector_name, inv.name AS invited_by_name,
         u.manager_id, mgr.name AS manager_name, u.created_at
  FROM users u
  LEFT JOIN sectors s ON s.id = u.sector_id
  LEFT JOIN users inv ON inv.id = u.invited_by_id
  LEFT JOIN users mgr ON mgr.id = u.manager_id
`;

// O gestor escolhido está ABAIXO desta pessoa no organograma?
// Se estiver, salvar criaria um ciclo (A chefe de B e B chefe de A).
async function isBelow(client: PoolClient, personId: string, candidateId: string) {
  const result = await client.query(
    `WITH RECURSIVE subordinados AS (
       SELECT id FROM users WHERE manager_id = $1
       UNION
       SELECT u.id FROM users u JOIN subordinados s ON u.manager_id = s.id
     )
     SELECT 1 FROM subordinados WHERE id = $2;`,
    [personId, candidateId],
  );
  return (result.rowCount ?? 0) > 0;
}

// Listar usuários
router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(`${SELECT_USER} ORDER BY u.name;`);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
});

// Editar nome, e-mail, papel, setor, status e gestor de um usuário
router.patch('/users/:id', async (req, res) => {
  const admin = req.user!;
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ message: 'Usuário não encontrado.' });
    return;
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { name, email, role, status } = parsed.data;
  const sectorId = parsed.data.sector_id ?? null;

  if (role !== 'ADMIN' && !sectorId) {
    res.status(400).json({ message: 'Líderes e colaboradores precisam de um setor.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query<{
      id: string;
      role: string;
      status: string;
      email: string;
      manager_id: string | null;
    }>('SELECT id, role, status, email, manager_id FROM users WHERE id = $1 FOR UPDATE;', [id.data]);
    const target = found.rows[0];
    if (!target) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Usuário não encontrado.' });
      return;
    }

    // Convite pendente só pode continuar pendente ou ser desativado
    const newStatus =
      target.status === 'PENDENTE' ? (status === 'INATIVO' ? 'INATIVO' : 'PENDENTE') : status ?? target.status;

    // Trava 1: ninguém altera o próprio papel ou status
    if (target.id === admin.id && (role !== target.role || newStatus !== target.status)) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Você não pode alterar o seu próprio papel ou status.' });
      return;
    }

    // Trava 2: sempre pelo menos um ADMIN ativo
    const losesAdmin =
      target.role === 'ADMIN' && target.status === 'ATIVO' && (role !== 'ADMIN' || newStatus !== 'ATIVO');
    if (losesAdmin) {
      const others = await client.query<{ count: string }>(
        `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND status = 'ATIVO' AND id <> $1;`,
        [target.id],
      );
      if (Number(others.rows[0].count) === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'O sistema precisa ter pelo menos um administrador ativo.' });
        return;
      }
    }

    // Trava 3: gestor direto válido e sem ciclo
    const managerId =
      parsed.data.manager_id === undefined ? target.manager_id : parsed.data.manager_id;

    if (managerId && managerId !== target.manager_id) {
      if (managerId === target.id) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'Uma pessoa não pode responder a ela mesma.' });
        return;
      }

      const manager = await client.query<{ status: string }>('SELECT status FROM users WHERE id = $1;', [
        managerId,
      ]);
      if (!manager.rows[0]) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'O gestor escolhido não existe.' });
        return;
      }
      if (manager.rows[0].status === 'INATIVO') {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'O gestor escolhido está desativado.' });
        return;
      }

      if (await isBelow(client, target.id, managerId)) {
        await client.query('ROLLBACK');
        res.status(400).json({
          message: 'O gestor escolhido já está abaixo desta pessoa no organograma. Isso criaria um ciclo.',
        });
        return;
      }
    }

    await client.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, sector_id = $4, status = $5, manager_id = $6
       WHERE id = $7;`,
      [name, email, role, sectorId, newStatus, managerId, target.id],
    );

    // E-mail trocado ou usuário desativado: links pendentes deixam de valer
    if (email !== target.email || newStatus === 'INATIVO') {
      await client.query('UPDATE user_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL;', [
        target.id,
      ]);
    }

    const updated = await client.query(`${SELECT_USER} WHERE u.id = $1;`, [target.id]);
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      res.status(409).json({ message: 'Já existe um usuário com esse e-mail.' });
      return;
    }
    if (code === '23503') {
      res.status(400).json({ message: 'O setor ou o gestor informado não existe.' });
      return;
    }
    console.error('Erro ao editar usuário:', error);
    res.status(500).json({ message: 'Erro ao editar o usuário.' });
  } finally {
    client.release();
  }
});

// Enviar link de redefinição de senha para um usuário ativo
router.post('/users/:id/reset-password', async (req, res) => {
  const admin = req.user!;
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ message: 'Usuário não encontrado.' });
    return;
  }

  const client = await pool.connect();
  let token: string;
  let target: { name: string; email: string };

  try {
    const found = await client.query<{ name: string; email: string; status: string }>(
      'SELECT name, email, status FROM users WHERE id = $1;',
      [id.data],
    );
    if (!found.rows[0]) {
      res.status(404).json({ message: 'Usuário não encontrado.' });
      return;
    }
    if (found.rows[0].status !== 'ATIVO') {
      res.status(400).json({ message: 'Só é possível redefinir a senha de usuários ativos.' });
      return;
    }
    target = found.rows[0];

    await client.query('BEGIN');
    token = await createUserToken(client, id.data, 'RESET', admin.id);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao criar redefinição:', error);
    res.status(500).json({ message: 'Erro ao gerar a redefinição de senha.' });
    return;
  } finally {
    client.release();
  }

  try {
    await sendMail(
      resetEmail({ name: target.name, email: target.email, link: `${env.APP_URL}/criar-senha?token=${token}` }),
    );
    res.json({ message: `Link de redefinição enviado para ${target.email}.` });
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição:', error);
    res.status(502).json({ message: 'O link foi gerado, mas o e-mail não pôde ser enviado. Tente novamente.' });
  }
});

export default router;