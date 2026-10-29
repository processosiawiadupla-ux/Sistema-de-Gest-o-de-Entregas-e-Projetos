import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'wiaflow_token';

const sessionMs = env.SESSION_HOURS * 60 * 60 * 1000;

// Opções do cookie de sessão
const baseCookieOptions: CookieOptions = {
  httpOnly: true,                            // JavaScript da página não consegue ler
  sameSite: 'strict',                        // só é enviado pelo próprio site
  secure: env.NODE_ENV === 'production',     // em produção, só por HTTPS
  path: '/',
};

export const sessionCookieOptions: CookieOptions = { ...baseCookieOptions, maxAge: sessionMs };
export const clearCookieOptions: CookieOptions = baseCookieOptions;

// Gera o token de um usuário
export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${env.SESSION_HOURS}h` as jwt.SignOptions['expiresIn'],
  });
}

// Confere o token e devolve o id do usuário (ou null se for inválido ou vencido)
// Confere o token e devolve o id do usuário e quando foi emitido (ou null se inválido)
export function verifyToken(token: string): { userId: string; issuedAt: number } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== 'object' || !payload.sub || !payload.iat) return null;
    return { userId: payload.sub, issuedAt: payload.iat };
  } catch {
    return null;
  }
}
