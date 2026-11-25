import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deliveryService,
  type DeliveryInput,
  type DeliveryScope,
  type LaunchInput,
  type LaunchNote,
  type ReviewFilter,
  type SubmissionTarget,
} from '../../services/deliveryService'
import type { Assignee, Delivery, DeliveryUpdate, ProjectStageNote, Submission } from '../../types'
import type { ApiError } from '../../lib/api'

export const deliveryKeys = {
  all: ['deliveries'] as const,
  list: (scope: DeliveryScope, sectorId?: string) => ['deliveries', 'list', scope, sectorId ?? 'all'] as const,
  updates: (id: string) => ['deliveries', 'updates', id] as const,
  taskNotes: (stageId: string) => ['deliveries', 'task-notes', stageId] as const,
  submissions: (id: string) => ['deliveries', 'submissions', id] as const,
  assignees: (sectorId?: string) => ['assignees', sectorId ?? 'all'] as const,
}

const REVIEWS_KEY = ['reviews'] as const

// Entregas (+ etapas de projeto): 'mine' (minhas) ou 'team' (da equipe)
export function useDeliveries(scope: DeliveryScope = 'mine', sectorId?: string) {
  return useQuery<Delivery[], ApiError>({
    queryKey: deliveryKeys.list(scope, sectorId),
    queryFn: () => deliveryService.getAll(scope, sectorId),
  })
}

// Histórico de lançamentos aprovados de uma entrega
export function useDeliveryUpdates(id: string) {
  return useQuery<DeliveryUpdate[], ApiError>({
    queryKey: deliveryKeys.updates(id),
    queryFn: () => deliveryService.getUpdates(id),
  })
}

// Observações de uma etapa de projeto
export function useProjectTaskNotes(projectId: string, stageId: string) {
  return useQuery<ProjectStageNote[], ApiError>({
    queryKey: deliveryKeys.taskNotes(stageId),
    queryFn: () => deliveryService.getProjectTaskNotes(projectId, stageId),
  })
}

// Pessoas que podem receber uma entrega
export function useAssignees(sectorId: string, enabled = true) {
  return useQuery<Assignee[], ApiError>({
    queryKey: deliveryKeys.assignees(sectorId),
    queryFn: () => deliveryService.getAssignees(sectorId),
    enabled,
  })
}

// ---------- Validação ----------

// Tela Validar: pendentes, aceitas, em correção ou todas
export function useReviews(status: ReviewFilter) {
  return useQuery<Submission[], ApiError>({
    queryKey: [...REVIEWS_KEY, status],
    queryFn: () => deliveryService.getReviews(status),
    refetchInterval: status === 'pending' ? 60_000 : false,
  })
}

// Pendentes (contador do menu e da aba)
export function usePendingReviews() {
  return useReviews('pending')
}

// Histórico de envios de uma entrega ou etapa de projeto
export function useSubmissions(target: SubmissionTarget) {
  const id = 'deliveryId' in target ? target.deliveryId : target.projectStageId
  return useQuery<Submission[], ApiError>({
    queryKey: deliveryKeys.submissions(id),
    queryFn: () => deliveryService.getSubmissions(target),
  })
}

// Print da evidência (fica guardado enquanto a tela estiver aberta)
export function useEvidenceFile(fileId: string) {
  return useQuery<Blob, ApiError>({
    queryKey: ['evidence', fileId],
    queryFn: () => deliveryService.getEvidenceFile(fileId),
    staleTime: Infinity,
  })
}

// Depois de qualquer alteração: entregas, quadros de projeto e fila de validação
function useRefreshAll() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: deliveryKeys.all })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: REVIEWS_KEY })
  }
}

export function useCreateDelivery() {
  const refresh = useRefreshAll()
  return useMutation<Delivery, ApiError, DeliveryInput>({
    mutationFn: deliveryService.create,
    onSuccess: refresh,
  })
}

export function useCreateLaunchedDelivery() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, { input: DeliveryInput; note: LaunchNote }>({
    mutationFn: ({ input, note }) => deliveryService.createLaunched(input, note),
    onSuccess: refresh,
  })
}

export function useLaunchStage() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, { id: string; input: LaunchInput }>({
    mutationFn: ({ id, input }) => deliveryService.launch(id, input),
    onSuccess: refresh,
  })
}

export function useReopenStage() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, { id: string; stageId: string }>({
    mutationFn: ({ id, stageId }) => deliveryService.reopenStage(id, stageId),
    onSuccess: refresh,
  })
}

export function useDeleteDelivery() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, string>({
    mutationFn: deliveryService.remove,
    onSuccess: refresh,
  })
}

export function useCompleteProjectTask() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, { stageId: string; note: LaunchNote }>({
    mutationFn: ({ stageId, note }) => deliveryService.completeProjectTask(stageId, note),
    onSuccess: refresh,
  })
}

export function useReopenProjectTask() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, string>({
    mutationFn: (stageId) => deliveryService.reopenProjectTask(stageId),
    onSuccess: refresh,
  })
}

export function useApproveSubmission() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deliveryService.approveSubmission(id),
    onSuccess: refresh,
  })
}

export function useReturnSubmission() {
  const refresh = useRefreshAll()
  return useMutation<void, ApiError, { id: string; note: string }>({
    mutationFn: ({ id, note }) => deliveryService.returnSubmission(id, note),
    onSuccess: refresh,
  })
}