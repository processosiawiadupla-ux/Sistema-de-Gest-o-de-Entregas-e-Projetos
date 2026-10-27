import { pool } from '../config/database.js';
import type { AuthUser, UserRole } from './types.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  sector_id: string | null;
  sector_name: string | null;
  password_hash: string;
}

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.status, u.sector_id,
         s.name AS sector_name, u.password_hash
  FROM users u
  LEFT JOIN sectors s ON s.id = u.sector_id
`;

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    sectorId: row.sector_id,
    sectorName: row.sector_name,
  };
}

// Busca pelo e-mail (para o login)
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(`${USER_SELECT} WHERE u.email = $1;`, [email]);
  return result.rows[0] ?? null;
}

// Busca um usuário ativo pelo id (para conferir a sessão)
export async function findActiveUserById(id: string): Promise<AuthUser | null> {
  const result = await pool.query<UserRow>(
    `${USER_SELECT} WHERE u.id = $1 AND u.status = 'ATIVO';`,
    [id]
  );
  return result.rows[0] ? toAuthUser(result.rows[0]) : null;
}