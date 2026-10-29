import type { UserRole } from '../types'

// Espelho da matriz do backend (server/src/auth/permissions.ts).
// Aqui ela só esconde menus e botões; quem protege os dados é o backend.
const PERMISSIONS = {
  'deliveries:assign': ['ADMIN', 'LIDER'],
  'projects:manage': ['ADMIN', 'LIDER'],
  'team:view': ['ADMIN', 'LIDER'],
  'team:invite': ['ADMIN', 'LIDER'], 
  'admin:access': ['ADMIN'],
  'deliveries:view_team': ['ADMIN', 'LIDER'],
  'settings:access': ['ADMIN'],
} as const satisfies Record<string, readonly UserRole[]>

export type Permission = keyof typeof PERMISSIONS

// O papel tem esta permissão? (sem usuário, nega)
export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role)
}

// Mantida para os arquivos que já usam
export function canAssignDeliveries(role?: UserRole | null): boolean {
  return can(role, 'deliveries:assign')
}