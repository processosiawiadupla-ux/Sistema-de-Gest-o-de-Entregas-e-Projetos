import { api } from '../lib/api'

export type UserRole = 'ADMIN' | 'LIDER' | 'COLABORADOR'

// O usuário logado, como as telas usam
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  sectorId: string | null
  sectorName: string | null
}

// Formato que o backend devolve
interface AuthUserDTO {
  id: string
  name: string
  email: string
  role: UserRole
  sector_id: string | null
  sector_name: string | null
}

function toAuthUser(dto: AuthUserDTO): AuthUser {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    sectorId: dto.sector_id,
    sectorName: dto.sector_name,
  }
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await api.post<AuthUserDTO>('/auth/login', { email, password })
    return toAuthUser(response.data)
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  // Pergunta ao backend quem está logado (null se não houver sessão)
  async me(): Promise<AuthUser | null> {
    try {
      const response = await api.get<AuthUserDTO>('/auth/me')
      return toAuthUser(response.data)
    } catch {
      return null
    }
  },
    // Confere um link de convite ou de redefinição antes de mostrar o formulário
  async checkToken(token: string): Promise<{ name: string; email: string; purpose: 'INVITE' | 'RESET' }> {
    const response = await api.get(`/auth/tokens/${encodeURIComponent(token)}`)
    return response.data
  },

  // Cria a senha a partir do link e já entra no sistema
  async setPassword(token: string, password: string): Promise<AuthUser> {
    const response = await api.post<AuthUserDTO>('/auth/set-password', { token, password })
    return toAuthUser(response.data)
  },
}

