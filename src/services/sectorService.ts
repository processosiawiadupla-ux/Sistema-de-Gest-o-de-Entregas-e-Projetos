import { api } from '../lib/api'
import type { Sector } from '../types'

export const sectorService = {
  async getAll(): Promise<Sector[]> {
    const response = await api.get<Sector[]>('/sectors')
    return response.data
  },
}