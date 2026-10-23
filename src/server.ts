import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './config/initDb';
import projectRoutes from './routes/projectRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Registar Rotas da API
app.use('/api', projectRoutes);

// Iniciar servidor e inicializar base de dados
app.listen(PORT, async () => {
  console.log(`Servidor a correr na porta ${PORT}`);
  await initializeDatabase();
});
