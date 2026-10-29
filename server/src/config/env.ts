import { z } from 'zod';

// Carrega o arquivo .env da pasta atual (recurso nativo do Node 20.12+)
try {
  process.loadEnvFile();
} catch {
  // Sem arquivo .env: usa as variáveis do próprio sistema (comum em produção)
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string('Defina o JWT_SECRET no .env.').min(32, 'O JWT_SECRET precisa ter pelo menos 32 caracteres.'),
  SESSION_HOURS: z.coerce.number().positive().default(8),

  // Links e e-mail
  APP_URL: z.url('APP_URL inválida.').default('http://localhost:5173'),
  ALLOWED_EMAIL_DOMAIN: z.string().default('wiadupla.com'),
  MAIL_FROM: z.string().default('Wiaflow · WIADUPLA <processos.ia.wiadupla@gmail.com>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuração inválida no .env:');
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;