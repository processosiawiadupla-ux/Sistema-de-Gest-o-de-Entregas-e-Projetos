import type { AuthUser, UserRole } from './types.js';

// Cada ação do sistema e os papéis que podem executá-la
const PERMISSIONS = {
  'deliveries:view_team': ['ADMIN', 'LIDER'],
  'deliveries:assign': ['ADMIN', 'LIDER'],
  'deliveries:edit': ['ADMIN', 'LIDER'],
  'deliveries:delete': ['ADMIN', 'LIDER'],
  'projects:manage': ['ADMIN', 'LIDER'],
  'team:view': ['ADMIN', 'LIDER'],
  'team:invite': ['ADMIN', 'LIDER'],
  'admin:access': ['ADMIN'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

// O usuário tem esta permissão?
export function can(user: AuthUser, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(user.role);
}

// O usuário pode agir sobre este setor? (ADMIN: todos; LIDER: só o seu)
export function canActOnSector(user: AuthUser, sectorId: string): boolean {
  if (user.role === 'ADMIN') return true;
  return user.role === 'LIDER' && user.sectorId === sectorId;
}