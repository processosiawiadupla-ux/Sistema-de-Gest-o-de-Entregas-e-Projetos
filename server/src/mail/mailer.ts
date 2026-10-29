import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465: conexão criptografada desde o início
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Envia o e-mail; sem SMTP configurado, mostra no terminal (modo desenvolvimento)
export async function sendMail(mail: Mail): Promise<void> {
  if (!transporter) {
    console.log('\n📧 [modo desenvolvimento] SMTP não configurado: o e-mail abaixo NÃO foi enviado.');
    console.log(`Para: ${mail.to}`);
    console.log(`Assunto: ${mail.subject}\n`);
    console.log(mail.text);
    console.log('──────────────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({ from: env.MAIL_FROM, ...mail });
}

// Confere a conexão com o servidor de e-mail ao iniciar o backend
export async function verifyMailer(): Promise<void> {
  if (!transporter) {
    console.log('📧 E-mail em modo desenvolvimento (os links aparecem neste terminal).');
    return;
  }
  try {
    await transporter.verify();
    console.log('📧 Servidor de e-mail conectado.');
  } catch (error) {
    console.error('❌ Não foi possível conectar ao servidor de e-mail:', error);
  }
}