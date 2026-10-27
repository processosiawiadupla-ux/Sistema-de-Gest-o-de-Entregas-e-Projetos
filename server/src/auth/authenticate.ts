import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE, clearCookieOptions, verifyToken } from './token.js';
import { findActiveUserById } from './userQueries.js';

// Confere a sessão e coloca o usuário em req.user
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  const userId = token ? verifyToken(token) : null;

  if (!userId) {
    res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    return;
  }

  try {
    const user = await findActiveUserById(userId);

    if (!user) {
      res.clearCookie(AUTH_COOKIE, clearCookieOptions);
      res.status(401).json({ message: 'Usuário inativo ou inexistente.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    res.status(500).json({ message: 'Erro ao validar a sessão.' });
  }
}