import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

// Uso: npx tsx src/scripts/createUser.ts "Nome" email senha PAPEL "Nome do Setor"
const [name, email, password, role, sectorName] = process.argv.slice(2);
const ROLES = ['ADMIN', 'LIDER', 'COLABORADOR'];

if (!name || !email || !password || !role || !ROLES.includes(role)) {
  console.error('Uso: npx tsx src/scripts/createUser.ts "Nome" email senha ADMIN|LIDER|COLABORADOR "Nome do Setor"');
  process.exit(1);
}

if (password.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.');
  process.exit(1);
}

try {
  let sectorId: string | null = null;

  if (sectorName) {
    const sector = await pool.query<{ id: string }>('SELECT id FROM sectors WHERE name = $1;', [sectorName]);
    if (!sector.rows[0]) {
      console.error(`❌ Setor "${sectorName}" não encontrado.`);
      process.exit(1);
    }
    sectorId = sector.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, sector_id)
     VALUES ($1, lower($2), $3, $4, 'ATIVO', $5)
     RETURNING id, name, email, role;`,
    [name, email, passwordHash, role, sectorId]
  );

  console.log('✅ Usuário criado:', result.rows[0]);
} catch (error) {
  const code = (error as { code?: string }).code;
  if (code === '23505') console.error('❌ Já existe um usuário com esse e-mail.');
  else if (code === '23514') console.error('❌ LIDER e COLABORADOR precisam de um setor.');
  else console.error('❌ Erro ao criar usuário:', error);
} finally {
  await pool.end();
}