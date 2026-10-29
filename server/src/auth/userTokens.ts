import crypto from 'node:crypto';
import type { PoolClient } from 'pg';

export type TokenPurpose = 'INVITE' | 'RESET';

// Validade de cada tipo de link
export const TOKEN_TTL_HOURS: Record<TokenPurpose, number> = { INVITE: 48, RESET: 1 };

// O banco guarda só o hash; o token de verdade vai apenas no e-mail
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Cria um link novo e invalida os anteriores do mesmo tipo para o mesmo usuário
export async function createUserToken(
  client: PoolClient,
  userId: string,
  purpose: TokenPurpose,
  createdById: string | null
): Promise<string> {
  await client.query(
    `UPDATE user_tokens SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL;`,
    [userId, purpose]
  );

  const token = crypto.randomBytes(32).toString('base64url'); // 256 bits aleatórios

  await client.query(
    `INSERT INTO user_tokens (user_id, purpose, token_hash, expires_at, created_by_id)
     VALUES ($1, $2, $3, NOW() + make_interval(hours => $4), $5);`,
    [userId, purpose, hashToken(token), TOKEN_TTL_HOURS[purpose], createdById]
  );

  return token;
}