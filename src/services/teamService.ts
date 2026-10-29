import { api } from '../lib/api'
import type { UserRole } from '../types'

export interface InviteInput {
  name: string
  email: string
  role: UserRole
  sectorId?: string
}

export const teamService = {
  // Convida um novo membro (o backend aplica as regras de cada papel)
  async invite(input: InviteInput): Promise<string> {
    const response = await api.post<{ message: string }>('/team/invites', {
      name: input.name,
      email: input.email,
      role: input.role,
      sector_id: input.sectorId || null,
    })
    return response.data.message
  },
}