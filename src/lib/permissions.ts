import type { UserRole } from '../types'

// Quem pode atribuir entregas a outras pessoas
export function canAssignDeliveries(role?: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'LIDER'
}