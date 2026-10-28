import { api } from '../lib/api'
import type { Assignee, Delivery, DeliveryStage, DeliveryUpdate, UserRole } from '../types'

export type DeliveryScope = 'mine' | 'team'

// Formatos que o backend devolve
interface StageDTO {
  id: string
  position: number
  title: string
  due_date: string
  completed: boolean
  completed_at: string | null
}

interface DeliveryDTO {
  id: string
  title: string
  description: string | null
  assigned_to_id: string | null
  assigned_to_name: string | null
  assigned_by_name: string | null
  sector_id: string
  sector_name: string | null
  due_date: string
  stage_count: number
  progress: number
  stages: StageDTO[] | null
  completed: boolean
  completed_at: string | null
  comments_count: number
  created_at: string
}

interface UpdateDTO {
  id: string
  author_name: string
  done_text: string
  missing_text: string | null
  progress: number
  stage_title: string | null
  stage_position: number | null
  created_at: string
}

interface AssigneeDTO {
  id: string
  name: string
  role: UserRole
  sector_id: string | null
}

// Tradutores: backend → telas
function toStage(dto: StageDTO): DeliveryStage {
  return {
    id: dto.id,
    position: dto.position,
    title: dto.title,
    dueDate: dto.due_date.slice(0, 10),
    completed: dto.completed,
    completedAt: dto.completed_at ?? undefined,
  }
}

function toDelivery(dto: DeliveryDTO): Delivery {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? undefined,
    assignedToId: dto.assigned_to_id ?? undefined,
    assignedToName: dto.assigned_to_name ?? '',
    assignedByName: dto.assigned_by_name ?? undefined,
    sectorId: dto.sector_id,
    sector: dto.sector_name ?? '',
    dueDate: dto.due_date.slice(0, 10),
    stageCount: dto.stage_count ?? 1,
    progress: dto.progress ?? 0,
    stages: (dto.stages ?? []).map(toStage),
    completed: dto.completed,
    completedAt: dto.completed_at ?? undefined,
    commentsCount: dto.comments_count ?? 0,
    createdAt: dto.created_at,
  }
}

function toUpdate(dto: UpdateDTO): DeliveryUpdate {
  return {
    id: dto.id,
    authorName: dto.author_name,
    doneText: dto.done_text,
    missingText: dto.missing_text ?? undefined,
    progress: dto.progress,
    stageTitle: dto.stage_title ?? undefined,
    stagePosition: dto.stage_position ?? undefined,
    createdAt: dto.created_at,
  }
}

// O que as telas enviam
export interface StageInput {
  title: string
  dueDate: string
}

export interface DeliveryInput {
  title: string
  description?: string
  sectorId: string
  assignedToId?: string
  dueDate: string
  stages?: StageInput[] // ausente = etapa única
}

export interface LaunchNote {
  doneText: string
  missingText?: string
}

export interface LaunchInput extends LaunchNote {
  stageId: string
}

function toNotePayload(note: LaunchNote) {
  return { done_text: note.doneText, missing_text: note.missingText || null }
}

function toPayload(input: DeliveryInput) {
  return {
    title: input.title,
    description: input.description || null,
    sector_id: input.sectorId,
    assigned_to_id: input.assignedToId || null,
    due_date: input.dueDate,
    stages: input.stages?.map((s) => ({ title: s.title, due_date: s.dueDate })),
  }
}

export const deliveryService = {
  async getAll(scope: DeliveryScope, sectorId?: string): Promise<Delivery[]> {
    const response = await api.get<DeliveryDTO[]>('/deliveries', {
      params: { scope, sector_id: sectorId || undefined },
    })
    return response.data.map(toDelivery)
  },

  // Atribuir (ou criar para si) uma entrega
  async create(input: DeliveryInput): Promise<Delivery> {
    const response = await api.post<DeliveryDTO>('/deliveries', toPayload(input))
    return toDelivery(response.data)
  },

  // Lançar uma atividade que não foi atribuída (já nasce concluída)
  async createLaunched(input: DeliveryInput, note: LaunchNote): Promise<Delivery> {
    const response = await api.post<DeliveryDTO>('/deliveries', {
      ...toPayload(input),
      stages: undefined,
      first_update: toNotePayload(note),
    })
    return toDelivery(response.data)
  },

  // Lançar: concluir uma etapa
  async launch(id: string, input: LaunchInput): Promise<void> {
    await api.post(`/deliveries/${id}/updates`, { stage_id: input.stageId, ...toNotePayload(input) })
  },

  async getUpdates(id: string): Promise<DeliveryUpdate[]> {
    const response = await api.get<UpdateDTO[]>(`/deliveries/${id}/updates`)
    return response.data.map(toUpdate)
  },

  async reopenStage(id: string, stageId: string): Promise<void> {
    await api.patch(`/deliveries/${id}/stages/${stageId}/reopen`)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/deliveries/${id}`)
  },

  async getAssignees(sectorId?: string): Promise<Assignee[]> {
    const response = await api.get<AssigneeDTO[]>('/assignees', {
      params: { sector_id: sectorId || undefined },
    })
    return response.data.map((a) => ({ id: a.id, name: a.name, role: a.role, sectorId: a.sector_id }))
  },
}