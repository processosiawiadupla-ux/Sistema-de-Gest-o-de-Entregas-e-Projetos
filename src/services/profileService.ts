import { api } from '../lib/api';
import type { UserRole } from '../types';

interface ProfileDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  sector_name: string | null;
  manager_name: string | null;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  sectorName: string | null;
  managerName: string | null;
}

const toProfile = (dto: ProfileDTO): Profile => ({
  id: dto.id,
  name: dto.name,
  email: dto.email,
  role: dto.role,
  createdAt: dto.created_at,
  sectorName: dto.sector_name,
  managerName: dto.manager_name,
});

export const profileService = {
  async get(): Promise<Profile> {
    const { data } = await api.get<ProfileDTO>('/me/profile');
    return toProfile(data);
  },

  async updateName(name: string): Promise<Profile> {
    const { data } = await api.patch<ProfileDTO>('/me', { name });
    return toProfile(data);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    const { data } = await api.post<{ message: string }>('/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return data.message;
  },
};