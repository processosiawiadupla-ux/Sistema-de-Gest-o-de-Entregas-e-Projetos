import type { Mail } from './mailer.js';

// Protege nomes e textos contra HTML malicioso dentro do e-mail
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, paragraphs: string[], buttonText: string, link: string, footer: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.5">${p}</p>`).join('');
  return `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;color:#0f172a">
      <p style="margin:0 0 20px;font-weight:bold;letter-spacing:2px;color:#2563eb">WIAFLOW</p>
      <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
      ${body}
      <p style="margin:24px 0">
        <a href="${link}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">${buttonText}</a>
      </p>
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5">${footer}</p>
    </div>
  </div>`;
}

interface InviteData {
  name: string;
  email: string;
  inviterName: string;
  sectorName: string | null;
  link: string;
}

export function inviteEmail(data: InviteData): Mail {
  const name = escapeHtml(data.name);
  const inviter = escapeHtml(data.inviterName);
  const sector = data.sectorName ? ` (${escapeHtml(data.sectorName)})` : '';
  const email = escapeHtml(data.email);

  return {
    to: data.email,
    subject: 'Seu convite para o Wiaflow',
    text: [
      `Olá, ${data.name}!`,
      '',
      `Você foi convidado(a) para o Wiaflow por ${data.inviterName}${data.sectorName ? ` (${data.sectorName})` : ''}.`,
      `Seu acesso será com o e-mail institucional: ${data.email}`,
      '',
      'Para criar a sua senha, acesse o link abaixo:',
      data.link,
      '',
      'O link vale por 48 horas e só pode ser usado uma vez.',
      'Se você não esperava este convite, ignore esta mensagem.',
    ].join('\n'),
    html: layout(
      `Olá, ${name}!`,
      [
        `Você foi convidado(a) para o Wiaflow por <strong>${inviter}</strong>${sector}.`,
        `Seu acesso será com o e-mail institucional: <strong>${email}</strong>`,
        'Clique no botão abaixo para criar a sua senha e entrar no sistema.',
      ],
      'Criar minha senha',
      data.link,
      'O link vale por 48 horas e só pode ser usado uma vez. Se você não esperava este convite, ignore esta mensagem.'
    ),
  };
}

interface ResetData {
  name: string;
  link: string;
  email: string;
}

export function resetEmail(data: ResetData): Mail {
  const name = escapeHtml(data.name);
  return {
    to: data.email,
    subject: 'Redefinição de senha do Wiaflow',
    text: [
      `Olá, ${data.name}!`,
      '',
      'Recebemos um pedido para redefinir a sua senha do Wiaflow.',
      'Para criar uma senha nova, acesse o link abaixo:',
      data.link,
      '',
      'O link vale por 1 hora e só pode ser usado uma vez.',
      'Se você não pediu a redefinição, ignore esta mensagem: a sua senha atual continua valendo.',
    ].join('\n'),
    html: layout(
      `Olá, ${name}!`,
      ['Recebemos um pedido para redefinir a sua senha do Wiaflow.', 'Clique no botão abaixo para criar uma senha nova.'],
      'Criar nova senha',
      data.link,
      'O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu a redefinição, ignore esta mensagem: a sua senha atual continua valendo.'
    ),
  };
}