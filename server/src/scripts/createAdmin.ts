import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

// Uso: npx tsx src/scripts/createAdmin.ts "Nome Completo" email@empresa.com SenhaForte123
const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Uso: npx tsx src/scripts/createAdmin.ts "Nome Completo" email@empresa.com SenhaForte123');
  process.exit(1);
}

if (password.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.');
  process.exit(1);
}

try {
  // Custo 12: cada hash leva uma fração de segundo de propósito
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, lower($2), $3, 'ADMIN', 'ATIVO')
     RETURNING id, name, email, role;`,
    [name, email, passwordHash]
  );

  console.log('✅ Administrador criado:', result.rows[0]);
} catch (error) {
  if ((error as { code?: string }).code === '23505') {
    console.error('❌ Já existe um usuário com esse e-mail.');
  } else {
    console.error('❌ Erro ao criar administrador:', error);
  }
} finally {
  await pool.end();
}


