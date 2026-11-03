import { sendMail, verifyMailer } from '../mail/mailer.js';

// Uso: npx tsx src/scripts/testMail.ts destinatario@exemplo.com
const to = process.argv[2];

if (!to) {
  console.error('Uso: npx tsx src/scripts/testMail.ts destinatario@exemplo.com');
  process.exit(1);
}

await verifyMailer();

try {
  await sendMail({
    to,
    subject: 'Teste de envio do Wiaflow',
    text: 'Se você recebeu esta mensagem, o envio de e-mails do Wiaflow está funcionando.',
    html: '<p>Se você recebeu esta mensagem, o envio de e-mails do <strong>Wiaflow</strong> está funcionando. ✅</p>',
  });
  console.log(`✅ E-mail de teste enviado para ${to}. Confira a caixa de entrada (e o spam).`);
} catch (error) {
  console.error('❌ Falha no envio:', error);
  process.exitCode = 1;
}