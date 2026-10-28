import type { Request, Response, NextFunction } from 'express';
import { can, type Permission } from './permissions.js';

// Só deixa passar quem tem a permissão indicada
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !can(req.user, permission)) {
      res.status(403).json({ message: 'Você não tem permissão para esta ação.' });
      return;
    }
    next();
  };
}