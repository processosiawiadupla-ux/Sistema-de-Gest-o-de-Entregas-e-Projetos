export type UserRole = 'ADMIN' | 'LIDER' | 'COLABORADOR';

// O usuário logado, como o backend usa internamente
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sectorId: string | null;
  sectorName: string | null;
}

// O usuário como é devolvido ao frontend (nunca com o hash da senha)
export function toUserResponse(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sector_id: user.sectorId,
    sector_name: user.sectorName,
  };
}