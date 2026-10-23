import { Pool } from 'pg';

// Configuração do Pool de conexões do PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'wiaflow_db',
});

// Teste de conexão
pool.connect()
  .then(client => {
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    client.release();
  })
  .catch(err => console.error('❌ Erro de conexão com o PostgreSQL:', err.stack));