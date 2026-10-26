import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deliveryService, type DeliveryInput } from '../../services/deliveryService'
import type { Delivery } from '../../types'
import type { ApiError } from '../../lib/api'

export const deliveryKeys = {
  all: ['deliveries'] as const,
}

// Buscar a lista de entregas
export function useDeliveries() {
  return useQuery<Delivery[], ApiError>({
    queryKey: deliveryKeys.all,
    queryFn: deliveryService.getAll,
  })
}

// Criar uma entrega (lançar ou atribuir)
export function useCreateDelivery() {
  const queryClient = useQueryClient()

  return useMutation<Delivery, ApiError, DeliveryInput>({
    mutationFn: deliveryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all })
    },
  })
}

// Editar uma entrega
export function useUpdateDelivery() {
  const queryClient = useQueryClient()

  return useMutation<Delivery, ApiError, { id: string; input: DeliveryInput }>({
    mutationFn: ({ id, input }) => deliveryService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all })
    },
  })
}

// Marcar como concluída ou pendente
export function useSetDeliveryCompleted() {
  const queryClient = useQueryClient()

  return useMutation<Delivery, ApiError, { id: string; completed: boolean }>({
    mutationFn: ({ id, completed }) => deliveryService.setCompleted(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all })
    },
  })
}

// Excluir uma entrega
export function useDeleteDelivery() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationFn: deliveryService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all })
    },
  })
}