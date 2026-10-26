import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService, type ProjectInput } from '../../services/projectService'
import type { Project } from '../../types'
import type { ApiError } from '../../lib/api'

// Chave do cache de projetos, definida num lugar só
export const projectKeys = {
  all: ['projects'] as const,
}

// Buscar a lista de projetos
export function useProjects() {
  return useQuery<Project[], ApiError>({
    queryKey: projectKeys.all,
    queryFn: projectService.getAll,
  })
}

// Criar um projeto
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation<Project, ApiError, ProjectInput>({
    mutationFn: projectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

// Editar um projeto
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation<Project, ApiError, { id: string; input: ProjectInput }>({
    mutationFn: ({ id, input }) => projectService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

// Excluir um projeto
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationFn: projectService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}