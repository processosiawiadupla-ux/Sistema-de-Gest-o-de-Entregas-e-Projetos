import { api } from '../lib/api'
import type { Delivery } from '../types'

// Formato que o backend devolve
interface DeliveryDTO {
  id: string
  title: string
  description: string | null
  assigned_to_id: string | null
  assigned_to_name: string | null
  assigned_by_id: string | null
  assigned_by_name: string | null
  sector: string | null
  due_date: string
  completed: boolean
  completed_at: string | null
  comments_count: number
  created_at: string
}

// Traduz uma entrega do backend para o formato das telas
function toDelivery(dto: DeliveryDTO): Delivery {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? undefined,
    assignedToId: dto.assigned_to_id ?? undefined,
    assignedToName: dto.assigned_to_name ?? '',
    assignedByName: dto.assigned_by_name ?? undefined,
    sector: dto.sector ?? '',
    dueDate: dto.due_date.slice(0, 10),
    completed: dto.completed,
    completedAt: dto.completed_at ?? undefined,
    commentsCount: dto.comments_count ?? 0,
    createdAt: dto.created_at,
  }
}

// O que as telas enviam para criar ou editar uma entrega
export interface DeliveryInput {
  title: string
  description?: string
  assignedToName: string
  assignedByName?: string
  sector?: string
  dueDate: string
}

// Traduz os dados da tela para o formato do backend
function toPayload(input: DeliveryInput) {
  return {
    title: input.title,
    description: input.description || null,
    assigned_to_name: input.assignedToName,
    assigned_by_name: input.assignedByName || null,
    sector: input.sector || null,
    due_date: input.dueDate,
  }
}

export const deliveryService = {
  async getAll(): Promise<Delivery[]> {
    const response = await api.get<DeliveryDTO[]>('/deliveries')
    return response.data.map(toDelivery)
  },

  async create(input: DeliveryInput): Promise<Delivery> {
    const response = await api.post<DeliveryDTO>('/deliveries', toPayload(input))
    return toDelivery(response.data)
  },

  async update(id: string, input: DeliveryInput): Promise<Delivery> {
    const response = await api.put<DeliveryDTO>(`/deliveries/${id}`, toPayload(input))
    return toDelivery(response.data)
  },

  async setCompleted(id: string, completed: boolean): Promise<Delivery> {
    const response = await api.patch<DeliveryDTO>(`/deliveries/${id}/complete`, { completed })
    return toDelivery(response.data)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/deliveries/${id}`)
  },
}