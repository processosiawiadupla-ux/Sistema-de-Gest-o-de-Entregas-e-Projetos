import { useQuery } from '@tanstack/react-query'
import { sectorService } from '../../services/sectorService'
import type { Sector } from '../../types'
import type { ApiError } from '../../lib/api'

export const sectorKeys = {
  all: ['sectors'] as const,
}

// Lista de setores ativos
export function useSectors() {
  return useQuery<Sector[], ApiError>({
    queryKey: sectorKeys.all,
    queryFn: sectorService.getAll,
    staleTime: 10 * 60_000, // setores quase nunca mudam: 10 minutos de cache
  })
}