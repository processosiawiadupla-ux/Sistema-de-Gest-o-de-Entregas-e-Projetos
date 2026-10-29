import { env } from './config/env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './config/initDb.js';
import { verifyMailer } from './mail/mailer.js';
import { authenticate } from './auth/authenticate.js';
import { requirePermission } from './auth/authorize.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import sectorRoutes from './routes/sectorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import teamRoutes from './routes/teamRoutes.js';

const app = express();

// Em produção o Nginx fica na frente: confia no IP que ele informa
app.set('trust proxy', 1);

// Middlewares
app.use(express.json());
app.use(cookieParser());

// 1. Rotas públicas: login, sair, conferir link e criar senha
app.use('/api', authRoutes);

// 2. Daqui para baixo, tudo exige login
app.use('/api', authenticate);

// 3. Painel de admin: só ADMIN, barrado já na entrada
app.use('/api/admin', requirePermission('admin:access'), adminRoutes);

// 4. Rotas do sistema (cada uma com as suas regras por papel)
app.use('/api', projectRoutes);
app.use('/api', deliveryRoutes);
app.use('/api', sectorRoutes);
app.use('/api', teamRoutes);

// Iniciar servidor, banco e e-mail
app.listen(env.PORT, async () => {
  console.log(`Servidor a correr na porta ${env.PORT}`);
  await initializeDatabase();
  await verifyMailer();
});