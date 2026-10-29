import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE, clearCookieOptions, verifyToken } from './token.js';
import { findActiveUserById } from './userQueries.js';

// Confere a sessão e coloca o usuário em req.user
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  const session = token ? verifyToken(token) : null;

  if (!session) {
    res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    return;
  }

  try {
    const found = await findActiveUserById(session.userId);

    // Sessão aberta antes da última troca de senha: não vale mais
    const changedAt = found?.passwordChangedAt
      ? Math.floor(found.passwordChangedAt.getTime() / 1000)
      : 0;

    if (!found || session.issuedAt < changedAt) {
      res.clearCookie(AUTH_COOKIE, clearCookieOptions);
      res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    req.user = found.user;
    next();
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    res.status(500).json({ message: 'Erro ao validar a sessão.' });
  }
}