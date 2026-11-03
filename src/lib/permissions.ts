import type { UserRole } from '../types';

// Espelho das permissões do backend: serve só para mostrar ou esconder botões.
// Quem decide de verdade é o backend (server/src/auth/permissions.ts).
const PERMISSIONS = {
  'deliveries:view_team': ['ADMIN', 'LIDER'],
  'deliveries:assign': ['ADMIN', 'LIDER'],
  'projects:view': ['ADMIN', 'LIDER', 'COLABORADOR'],
  'projects:manage': ['ADMIN', 'LIDER'],
  'team:view': ['ADMIN', 'LIDER'],
  'team:invite': ['ADMIN', 'LIDER'],
  'admin:access': ['ADMIN'],
  'settings:access': ['ADMIN'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

// O papel tem esta permissão?
export function can(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

// Atalho usado pelo botão "Atribuir"
export function canAssignDeliveries(role: UserRole | undefined | null): boolean {
  return can(role, 'deliveries:assign');
}