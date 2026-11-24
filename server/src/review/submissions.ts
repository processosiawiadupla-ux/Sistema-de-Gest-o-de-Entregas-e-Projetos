import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { AuthUser } from '../auth/types.js';
import { canActOnSector } from '../auth/permissions.js';

// ---------- Onde os prints ficam ----------
// No servidor: UPLOAD_DIR=/home/wiadupla/wiaflow-uploads no .env (fora da pasta do site)
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB por print (a tela já comprime antes de enviar)

// ---------- Evidência: links e prints ----------

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const evidenceSchema = z
  .object({
    links: z
      .array(
        z
          .string()
          .trim()
          .max(2000, 'Link muito longo.')
          .refine(isWebUrl, 'Link inválido: copie o endereço completo (https://...).'),
      )
      .max(3, 'Use no máximo 3 links.')
      .default([]),
    files: z
      .array(z.object({ data: z.string().min(1).max(3_000_000, 'Print muito grande.') }))
      .max(3, 'Use no máximo 3 prints.')
      .default([]),
  })
  .refine((e) => e.links.length + e.files.length > 0, {
    message: 'Inclua pelo menos um link ou um print como evidência.',
  });

export type EvidenceInput = z.infer<typeof evidenceSchema>;

export type PreparedFile = { buffer: Buffer; mime: string; storedName: string };

// Confere o tipo pelo CONTEÚDO do arquivo (não confia na extensão)
function detectImage(buf: Buffer): { mime: string; ext: string } | null {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length > 8 && buf.subarray(0, 8).equals(png)) return { mime: 'image/png', ext: 'png' };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

// Decodifica e valida os prints antes de qualquer gravação. Retorna texto = erro.
export function prepareFiles(files: EvidenceInput['files']): PreparedFile[] | string {
  const prepared: PreparedFile[] = [];
  for (const file of files) {
    const base64 = file.data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) return 'Cada print pode ter no máximo 2 MB.';
    const type = detectImage(buffer);
    if (!type) return 'O print precisa ser uma imagem PNG, JPG ou WEBP.';
    prepared.push({ buffer, mime: type.mime, storedName: `${randomUUID()}.${type.ext}` });
  }
  return prepared;
}

export async function writeFiles(files: PreparedFile[]) {
  if (files.length === 0) return;
  await mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 });
  for (const file of files) {
    await writeFile(path.join(UPLOAD_DIR, file.storedName), file.buffer, { flag: 'wx', mode: 0o600 });
  }
}

// Usado quando a transação falha depois de gravar os arquivos
export async function removeFiles(files: PreparedFile[]) {
  await Promise.all(files.map((f) => unlink(path.join(UPLOAD_DIR, f.storedName)).catch(() => {})));
}

// ---------- Quem precisa de validação ----------

// ADMIN é o topo: o que ele lança já vale como aprovado
export function needsReview(user: AuthUser) {
  return user.role !== 'ADMIN';
}

type Note = { done_text: string; missing_text?: string | null };
type Target =
  | { kind: 'delivery'; deliveryId: string; stageId: string }
  | { kind: 'project'; stageId: string };

export async function createSubmission(
  client: PoolClient,
  target: Target,
  user: AuthUser,
  note: Note,
  links: string[],
  files: PreparedFile[],
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO stage_submissions
       (delivery_id, delivery_stage_id, project_stage_id, author_id, author_name, done_text, missing_text, links)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id;`,
    [
      target.kind === 'delivery' ? target.deliveryId : null,
      target.kind === 'delivery' ? target.stageId : null,
      target.kind === 'project' ? target.stageId : null,
      user.id,
      user.name,
      note.done_text,
      note.missing_text || null,
      links,
    ],
  );
  const submissionId = result.rows[0].id;

  for (const file of files) {
    await client.query(
      `INSERT INTO submission_files (submission_id, stored_name, mime, size_bytes) VALUES ($1, $2, $3, $4);`,
      [submissionId, file.storedName, file.mime, file.buffer.length],
    );
  }
  return submissionId;
}

// ---------- Concluir de fato (aprovação ou lançamento do ADMIN) ----------

// Percentual da entrega; a data de conclusão é a da última etapa concluída
export async function recalcProgress(client: PoolClient, deliveryId: string) {
  const result = await client.query(
    `UPDATE deliveries d
     SET progress = sub.pct,
         completed = (sub.pct = 100),
         completed_at = CASE WHEN sub.pct = 100 THEN sub.last_done ELSE NULL END
     FROM (
       SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE completed) / COUNT(*))::int AS pct,
              MAX(completed_at) AS last_done
       FROM delivery_stages
       WHERE delivery_id = $1
     ) sub
     WHERE d.id = $1
     RETURNING d.*;`,
    [deliveryId],
  );
  return result.rows[0];
}

// completedAt = data do envio (o prazo conta pelo envio, não pela aprovação); null = agora
export async function completeDeliveryStage(
  client: PoolClient,
  deliveryId: string,
  stageId: string,
  author: { id: string | null; name: string },
  note: Note,
  completedAt: Date | null,
) {
  await client.query(
    `UPDATE delivery_stages
     SET completed = TRUE, completed_at = COALESCE($3::timestamptz, NOW()), completed_by_id = $1
     WHERE id = $2;`,
    [author.id, stageId, completedAt],
  );

  const delivery = await recalcProgress(client, deliveryId);

  await client.query(
    `INSERT INTO delivery_updates (delivery_id, stage_id, author_id, author_name, done_text, missing_text, progress)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [deliveryId, stageId, author.id, author.name, note.done_text, note.missing_text || null, delivery.progress],
  );
  return delivery;
}

export async function completeProjectStage(
  client: PoolClient,
  stageId: string,
  completedAt: Date | null,
  noteAuthor: { id: string | null; name: string },
  noteText: string,
) {
  await client.query(
    `UPDATE project_stages SET status = 'done', completed_at = COALESCE($2::timestamptz, NOW()) WHERE id = $1;`,
    [stageId, completedAt],
  );
  await client.query(
    `INSERT INTO project_stage_notes (stage_id, author_id, author_name, text) VALUES ($1, $2, $3, $4);`,
    [stageId, noteAuthor.id, noteAuthor.name, noteText.slice(0, 2000)],
  );
}

export function noteText(prefix: string, note: Note) {
  return note.missing_text
    ? `${prefix} Feito: ${note.done_text}\nFaltou: ${note.missing_text}`
    : `${prefix} Feito: ${note.done_text}`;
}

// ---------- Envio com o contexto (para permissões e para as telas) ----------

export const SUBMISSION_CONTEXT = `
  SELECT sub.*,
         au.manager_id AS author_manager_id,
         COALESCE(d.sector_id, p.sector_id, pu.sector_id) AS sector_id,
         s.name AS sector_name,
         d.assigned_by_id,
         d.stage_count,
         p.owner_id AS project_owner_id,
         p.id AS project_id,
         p.name AS project_name,
         COALESCE(d.title, ps.title) AS item_title,
         dst.title AS stage_title,
         dst.position AS stage_position,
         COALESCE(dst.due_date, ps.due_date)::text AS due_date,
         COALESCE((
           SELECT json_agg(json_build_object('id', f.id, 'mime', f.mime, 'size', f.size_bytes) ORDER BY f.created_at)
           FROM submission_files f
           WHERE f.submission_id = sub.id
         ), '[]'::json) AS files
  FROM stage_submissions sub
  LEFT JOIN users au ON au.id = sub.author_id
  LEFT JOIN deliveries d ON d.id = sub.delivery_id
  LEFT JOIN delivery_stages dst ON dst.id = sub.delivery_stage_id
  LEFT JOIN project_stages ps ON ps.id = sub.project_stage_id
  LEFT JOIN projects p ON p.id = ps.project_id
  LEFT JOIN users pu ON pu.id = ps.responsible_id
  LEFT JOIN sectors s ON s.id = COALESCE(d.sector_id, p.sector_id, pu.sector_id)
`;

export interface SubmissionRow {
  id: string;
  delivery_id: string | null;
  delivery_stage_id: string | null;
  project_stage_id: string | null;
  author_id: string | null;
  author_name: string;
  done_text: string;
  missing_text: string | null;
  links: string[];
  status: 'pending' | 'approved' | 'returned';
  reviewer_name: string | null;
  review_note: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  author_manager_id: string | null;
  sector_id: string | null;
  sector_name: string | null;
  assigned_by_id: string | null;
  stage_count: number | null;
  project_owner_id: string | null;
  project_id: string | null;
  project_name: string | null;
  item_title: string;
  stage_title: string | null;
  stage_position: number | null;
  due_date: string;
  files: { id: string; mime: string; size: number }[];
}

// Quem aprova: gestor direto do autor, quem atribuiu, líder do projeto, LIDER do setor ou ADMIN.
// Ninguém aprova o próprio envio.
export function canReview(user: AuthUser, row: SubmissionRow) {
  if (row.author_id === user.id) return false;
  if (user.role === 'ADMIN') return true;
  if (row.author_manager_id === user.id) return true;
  if (row.assigned_by_id === user.id) return true;
  if (row.project_owner_id === user.id) return true;
  return user.role === 'LIDER' && canActOnSector(user, row.sector_id);
}

export function canViewSubmission(user: AuthUser, row: SubmissionRow) {
  return row.author_id === user.id || canReview(user, row) || canActOnSector(user, row.sector_id);
}

// O que vai para as telas (sem os campos internos de permissão)
export function toPublic(row: SubmissionRow) {
  return {
    id: row.id,
    kind: row.project_stage_id ? 'project_stage' : 'delivery',
    delivery_id: row.delivery_id,
    status: row.status,
    author_name: row.author_name,
    done_text: row.done_text,
    missing_text: row.missing_text,
    links: row.links,
    files: row.files,
    reviewer_name: row.reviewer_name,
    review_note: row.review_note,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    item_title: row.item_title,
    stage_title: row.stage_title,
    stage_position: row.stage_position,
    stage_count: row.stage_count,
    project_name: row.project_name,
    due_date: row.due_date,
    sector_name: row.sector_name,
  };
}