import { api } from '../lib/api'
import type { TeamMember, UserRole, UserStatus } from '../types'

// Formato que o backend devolve
interface MemberDTO {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  sector_id: string | null
  sector_name: string | null
  invited_by_name?: string | null
  manager_id?: string | null
  manager_name?: string | null
  created_at: string
}

// Traduz um membro do backend para o formato das telas
function toMember(dto: MemberDTO): TeamMember {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    status: dto.status,
    sectorId: dto.sector_id,
    sectorName: dto.sector_name,
    invitedByName: dto.invited_by_name ?? null,
    managerId: dto.manager_id ?? null,
    managerName: dto.manager_name ?? null,
    createdAt: dto.created_at,
  }
}

// O que as telas enviam para convidar (ou reenviar um convite)
export interface InviteInput {
  name: string
  email: string
  role: UserRole
  sectorId?: string | null
  // Gestor direto: null = ninguém | não enviado (undefined) = mantém o atual
  managerId?: string | null
}

// O que o ADMIN envia ao editar um membro
export interface MemberUpdateInput {
  name: string
  email: string
  role: UserRole
  sectorId: string | null
  managerId: string | null // null = ninguém (topo do organograma)
  status?: 'ATIVO' | 'INATIVO'
}

export const teamService = {
  // Membros da equipe (ADMIN: todos; LIDER: quem ele convidou)
  async list(): Promise<TeamMember[]> {
    const response = await api.get<MemberDTO[]>('/team')
    return response.data.map(toMember)
  },

  // Convidar (ou reenviar o convite de quem ainda está pendente)
  async invite(input: InviteInput): Promise<string> {
    const response = await api.post<{ message: string }>('/team/invites', {
      name: input.name,
      email: input.email,
      role: input.role,
      sector_id: input.sectorId || null,
      // Só manda o gestor quando a tela informou; assim o reenvio não apaga o atual
      ...(input.managerId !== undefined && { manager_id: input.managerId }),
    })
    return response.data.message
  },

  // Editar nome, papel, setor, gestor e acesso (só ADMIN)
  async update(id: string, input: MemberUpdateInput): Promise<TeamMember> {
    const response = await api.patch<MemberDTO>(`/admin/users/${id}`, {
      name: input.name,
      email: input.email,
      role: input.role,
      sector_id: input.sectorId || null,
      manager_id: input.managerId,
      status: input.status,
    })
    return toMember(response.data)
  },

  // Enviar link de redefinição de senha (só ADMIN)
  async sendPasswordReset(id: string): Promise<string> {
    const response = await api.post<{ message: string }>(`/admin/users/${id}/reset-password`)
    return response.data.message
  },
}