import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deliveryService,
  type DeliveryInput,
  type DeliveryScope,
  type LaunchInput,
  type LaunchNote,
} from '../../services/deliveryService'
import type { Assignee, Delivery, DeliveryUpdate } from '../../types'
import type { ApiError } from '../../lib/api'

export const deliveryKeys = {
  all: ['deliveries'] as const,
  list: (scope: DeliveryScope, sectorId?: string) => ['deliveries', 'list', scope, sectorId ?? 'all'] as const,
  updates: (id: string) => ['deliveries', 'updates', id] as const,
  assignees: (sectorId?: string) => ['assignees', sectorId ?? 'all'] as const,
}

// Entregas: 'mine' (minhas) ou 'team' (da equipe)
export function useDeliveries(scope: DeliveryScope = 'mine', sectorId?: string) {
  return useQuery<Delivery[], ApiError>({
    queryKey: deliveryKeys.list(scope, sectorId),
    queryFn: () => deliveryService.getAll(scope, sectorId),
  })
}

// Histórico de lançamentos de uma entrega
export function useDeliveryUpdates(id: string) {
  return useQuery<DeliveryUpdate[], ApiError>({
    queryKey: deliveryKeys.updates(id),
    queryFn: () => deliveryService.getUpdates(id),
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

// Depois de qualquer alteração, todas as listas e históricos de entregas são atualizados
function useInvalidateDeliveries() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: deliveryKeys.all })
}

export function useCreateDelivery() {
  const invalidate = useInvalidateDeliveries()
  return useMutation<Delivery, ApiError, DeliveryInput>({
    mutationFn: deliveryService.create,
    onSuccess: invalidate,
  })
}

export function useCreateLaunchedDelivery() {
  const invalidate = useInvalidateDeliveries()
  return useMutation<Delivery, ApiError, { input: DeliveryInput; note: LaunchNote }>({
    mutationFn: ({ input, note }) => deliveryService.createLaunched(input, note),
    onSuccess: invalidate,
  })
}

export function useLaunchStage() {
  const invalidate = useInvalidateDeliveries()
  return useMutation<void, ApiError, { id: string; input: LaunchInput }>({
    mutationFn: ({ id, input }) => deliveryService.launch(id, input),
    onSuccess: invalidate,
  })
}

export function useReopenStage() {
  const invalidate = useInvalidateDeliveries()
  return useMutation<void, ApiError, { id: string; stageId: string }>({
    mutationFn: ({ id, stageId }) => deliveryService.reopenStage(id, stageId),
    onSuccess: invalidate,
  })
}

export function useDeleteDelivery() {
  const invalidate = useInvalidateDeliveries()
  return useMutation<void, ApiError, string>({
    mutationFn: deliveryService.remove,
    onSuccess: invalidate,
  })
}