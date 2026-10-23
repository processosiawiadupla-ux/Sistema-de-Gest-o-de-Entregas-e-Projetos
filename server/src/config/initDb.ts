import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, '../../schema.sql');  
    const sqlQuery = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(sqlQuery);
    console.log('✅ Tabelas criadas/verificadas com sucesso no PostgreSQL através do schema.sql!');
  } catch (error) {
    console.error('❌ Erro ao inicializar o esquema da base de dados:', error);
  }
};