import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './config/initDb.js';
import projectRoutes from './routes/projectRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import sectorRoutes from './routes/sectorRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Registrar Rotas da API
app.use('/api', projectRoutes);
app.use('/api', deliveryRoutes);
app.use('/api', sectorRoutes);

// Iniciar servidor e inicializar base de dados
app.listen(PORT, async () => {
  console.log(`Servidor a correr na porta ${PORT}`);
  await initializeDatabase();
});