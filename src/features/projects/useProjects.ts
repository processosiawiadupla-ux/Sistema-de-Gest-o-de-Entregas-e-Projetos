import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Project, ProjectStageStatus } from '../../types';
import {
  projectService,
  calcProgress,
  type CreateProjectInput,
  type ProjectInput,
  type StageInput,
} from '../../services/projectService';

export const projectKeys = {
  all: ['projects'] as const,
  assignees: ['projects', 'assignees'] as const,
};

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: projectService.list });
}

export function useProjectAssignees(enabled = true) {
  return useQuery({
    queryKey: projectKeys.assignees,
    queryFn: projectService.assignees,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectInput }) =>
      projectService.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { projectId: string; stageId: string; input: StageInput }) =>
      projectService.updateStage(vars.projectId, vars.stageId, vars.input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

type MoveVars = { projectId: string; stageId: string; status: ProjectStageStatus };

// Move o cartão na tela NA HORA e depois confirma com o servidor.
// Se o servidor recusar, o cartão volta para onde estava.
export function useMoveStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: MoveVars) =>
      projectService.moveStage(vars.projectId, vars.stageId, vars.status),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all, exact: true });
      const previous = queryClient.getQueryData<Project[]>(projectKeys.all);

      queryClient.setQueryData<Project[]>(projectKeys.all, (old) =>
        old?.map((project) => {
          if (project.id !== vars.projectId) return project;
          const stages = project.stages.map((stage) =>
            stage.id === vars.stageId
              ? {
                  ...stage,
                  status: vars.status,
                  completedAt: vars.status === 'done' ? new Date().toISOString() : null,
                }
              : stage,
          );
          return { ...project, stages, progress: calcProgress(stages) };
        }),
      );

      return { previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(projectKeys.all, context.previous);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true }),
  });
}

// Observações de uma etapa
export function useStageNotes(projectId: string, stageId: string) {
  return useQuery({
    queryKey: ['projects', 'notes', stageId],
    queryFn: () => projectService.listStageNotes(projectId, stageId),
  });
}

export function useAddStageNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { projectId: string; stageId: string; text: string }) =>
      projectService.addStageNote(vars.projectId, vars.stageId, vars.text),
    onSuccess: (notes, vars) => {
      // Mostra a lista nova na hora e atualiza o contador do cartão
      queryClient.setQueryData(['projects', 'notes', vars.stageId], notes);
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
    },
  });
}