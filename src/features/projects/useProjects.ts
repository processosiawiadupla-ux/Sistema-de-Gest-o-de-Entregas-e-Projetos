import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '../../services/projectService'
import type { Project } from '../../types'

// Chave do cache de projetos, definida num lugar só
export const projectKeys = {
  all: ['projects'] as const,
}

// Buscar a lista de projetos
export function useProjects() {
  return useQuery<Project[], unknown>({
    queryKey: projectKeys.all,
    queryFn: projectService.getAll,
  })
}

// Criar um projeto e atualizar a lista
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation<Project, unknown, Parameters<typeof projectService.create>[0]>({
    mutationFn: projectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
