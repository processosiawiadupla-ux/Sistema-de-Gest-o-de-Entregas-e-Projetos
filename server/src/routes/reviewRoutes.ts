import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/database.js';
import {
  SUBMISSION_CONTEXT,
  UPLOAD_DIR,
  canReview,
  canViewSubmission,
  completeDeliveryStage,
  completeProjectStage,
  noteText,
  toPublic,
  type SubmissionRow,
} from '../review/submissions.js';

const router = Router();
const idSchema = z.uuid();
const statusSchema = z.enum(['pending', 'approved', 'returned', 'all']).default('pending');
const returnSchema = z.object({
  note: z
    .string('Explique o motivo da devolução.')
    .trim()
    .min(3, 'Explique o motivo da devolução.')
    .max(1000, 'O motivo pode ter no máximo 1000 caracteres.'),
});

// Tela Validar: ?status=pending (padrão) | approved | returned | all
// Pendentes: o que este usuário pode aprovar.
// Histórico: o que ele poderia validar ou que ele mesmo validou (ADMIN vê tudo).
router.get('/reviews', async (req, res) => {
  const user = req.user!;
  const status = statusSchema.safeParse(req.query.status);
  if (!status.success) {
    res.status(400).json({ message: 'Filtro inválido.' });
    return;
  }

  const isPending = status.data === 'pending';
  const where = status.data === 'all' ? '' : 'WHERE sub.status = $1';
  const params = status.data === 'all' ? [] : [status.data];
  const order = isPending ? 'sub.created_at ASC' : 'COALESCE(sub.reviewed_at, sub.created_at) DESC LIMIT 300';

  try {
    const result = await pool.query<SubmissionRow>(`${SUBMISSION_CONTEXT} ${where} ORDER BY ${order};`, params);
    const visible = result.rows.filter((row) =>
      row.status === 'pending' ? canReview(user, row) : canReview(user, row) || row.reviewer_id === user.id,
    );
    res.json(visible.map(toPublic));
  } catch (error) {
    console.error('Erro ao listar validações:', error);
    res.status(500).json({ message: 'Erro ao listar as validações.' });
  }
});

// Histórico de envios de uma entrega (?delivery_id=) ou de uma etapa de projeto (?project_stage_id=)
router.get('/submissions', async (req, res) => {
  const user = req.user!;
  const deliveryId = idSchema.safeParse(req.query.delivery_id);
  const projectStageId = idSchema.safeParse(req.query.project_stage_id);
  if (!deliveryId.success && !projectStageId.success) {
    res.status(400).json({ message: 'Informe a entrega ou a etapa.' });
    return;
  }

  try {
    const result = deliveryId.success
      ? await pool.query<SubmissionRow>(`${SUBMISSION_CONTEXT} WHERE sub.delivery_id = $1 ORDER BY sub.created_at DESC;`, [
          deliveryId.data,
        ])
      : await pool.query<SubmissionRow>(
          `${SUBMISSION_CONTEXT} WHERE sub.project_stage_id = $1 ORDER BY sub.created_at DESC;`,
          [projectStageId.data!],
        );
    res.json(result.rows.filter((row) => canViewSubmission(user, row)).map(toPublic));
  } catch (error) {
    console.error('Erro ao listar envios:', error);
    res.status(500).json({ message: 'Erro ao listar os envios.' });
  }
});

// Aprovar: conclui a etapa com a data do ENVIO
router.post('/reviews/:id/approve', async (req, res) => {
  const user = req.user!;
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ message: 'Envio não encontrado.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM stage_submissions WHERE id = $1 FOR UPDATE;', [id.data]);
    const row = (await client.query<SubmissionRow>(`${SUBMISSION_CONTEXT} WHERE sub.id = $1;`, [id.data])).rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Envio não encontrado.' });
      return;
    }
    if (row.status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Este envio já foi analisado.' });
      return;
    }
    if (!canReview(user, row)) {
      await client.query('ROLLBACK');
      res.status(403).json({ message: 'Você não pode validar este envio.' });
      return;
    }

    const author = { id: row.author_id, name: row.author_name };
    const note = { done_text: row.done_text, missing_text: row.missing_text };

    if (row.delivery_stage_id && row.delivery_id) {
      await completeDeliveryStage(client, row.delivery_id, row.delivery_stage_id, author, note, row.created_at);
    } else if (row.project_stage_id) {
      await completeProjectStage(
        client,
        row.project_stage_id,
        row.created_at,
        author,
        noteText(`Concluída (aprovada por ${user.name}).`, note),
      );
    }

    await client.query(
      `UPDATE stage_submissions
       SET status = 'approved', reviewer_id = $2, reviewer_name = $3, reviewed_at = NOW()
       WHERE id = $1;`,
      [id.data, user.id, user.name],
    );

    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao aprovar envio:', error);
    res.status(500).json({ message: 'Erro ao aprovar o envio.' });
  } finally {
    client.release();
  }
});

// Devolver: motivo obrigatório; a etapa continua aberta para relançar
router.post('/reviews/:id/return', async (req, res) => {
  const user = req.user!;
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ message: 'Envio não encontrado.' });
    return;
  }
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM stage_submissions WHERE id = $1 FOR UPDATE;', [id.data]);
    const row = (await client.query<SubmissionRow>(`${SUBMISSION_CONTEXT} WHERE sub.id = $1;`, [id.data])).rows[0];

    if (!row) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Envio não encontrado.' });
      return;
    }
    if (row.status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Este envio já foi analisado.' });
      return;
    }
    if (!canReview(user, row)) {
      await client.query('ROLLBACK');
      res.status(403).json({ message: 'Você não pode validar este envio.' });
      return;
    }

    await client.query(
      `UPDATE stage_submissions
       SET status = 'returned', reviewer_id = $2, reviewer_name = $3, review_note = $4, reviewed_at = NOW()
       WHERE id = $1;`,
      [id.data, user.id, user.name, parsed.data.note],
    );

    // Etapa de projeto: o motivo também aparece nas observações do quadro
    if (row.project_stage_id) {
      await client.query(
        `INSERT INTO project_stage_notes (stage_id, author_id, author_name, text) VALUES ($1, $2, $3, $4);`,
        [row.project_stage_id, user.id, user.name, `Devolvida: ${parsed.data.note}`.slice(0, 2000)],
      );
    }

    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro ao devolver envio:', error);
    res.status(500).json({ message: 'Erro ao devolver o envio.' });
  } finally {
    client.release();
  }
});

// Abrir um print (só quem pode ver aquele envio)
router.get('/evidence/:fileId', async (req, res) => {
  const user = req.user!;
  const fileId = idSchema.safeParse(req.params.fileId);
  if (!fileId.success) {
    res.status(404).json({ message: 'Arquivo não encontrado.' });
    return;
  }

  try {
    const file = (
      await pool.query<{ stored_name: string; mime: string; submission_id: string }>(
        'SELECT stored_name, mime, submission_id FROM submission_files WHERE id = $1;',
        [fileId.data],
      )
    ).rows[0];
    if (!file) {
      res.status(404).json({ message: 'Arquivo não encontrado.' });
      return;
    }

    const row = (await pool.query<SubmissionRow>(`${SUBMISSION_CONTEXT} WHERE sub.id = $1;`, [file.submission_id])).rows[0];
    if (!row || !canViewSubmission(user, row)) {
      res.status(403).json({ message: 'Você não pode ver este arquivo.' });
      return;
    }

    res.setHeader('Content-Type', file.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.sendFile(path.join(UPLOAD_DIR, path.basename(file.stored_name)), (err) => {
      if (err && !res.headersSent) res.status(404).json({ message: 'Arquivo não encontrado.' });
    });
  } catch (error) {
    console.error('Erro ao abrir evidência:', error);
    res.status(500).json({ message: 'Erro ao abrir o arquivo.' });
  }
});

export default router;