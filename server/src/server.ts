import { env } from './config/env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './config/initDb.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import sectorRoutes from './routes/sectorRoutes.js';

const app = express();

// Em produção o Nginx fica na frente: confia no IP que ele informa
app.set('trust proxy', 1);

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Registrar Rotas da API
app.use('/api', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', deliveryRoutes);
app.use('/api', sectorRoutes);

// Iniciar servidor e inicializar base de dados
app.listen(env.PORT, async () => {
  console.log(`Servidor a correr na porta ${env.PORT}`);
  await initializeDatabase();
});