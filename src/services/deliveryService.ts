import { api } from '../lib/api'
import type {
  Assignee,
  Delivery,
  DeliveryStage,
  DeliveryUpdate,
  ProjectStageNote,
  ReviewStatus,
  Submission,
  UserRole,
} from '../types'

export type DeliveryScope = 'mine' | 'team'

// Formatos que o backend devolve
interface StageDTO {
  id: string
  position: number
  title: string
  due_date: string
  completed: boolean
  completed_at: string | null
  review_status?: ReviewStatus | null
  review_note?: string | null
  submitted_at?: string | null
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
  // Só nas etapas de projeto
  kind?: 'project_stage'
  project_id?: string
  project_name?: string
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

interface NoteDTO {
  id: string
  text: string
  author_name: string
  created_at: string
}

interface SubmissionDTO {
  id: string
  kind: 'delivery' | 'project_stage'
  delivery_id: string | null
  status: ReviewStatus
  author_name: string
  done_text: string
  missing_text: string | null
  links: string[]
  files: { id: string; mime: string; size: number }[]
  reviewer_name: string | null
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  item_title: string
  stage_title: string | null
  stage_position: number | null
  stage_count: number | null
  project_name: string | null
  due_date: string
  sector_name: string | null
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
    reviewStatus: dto.review_status ?? undefined,
    reviewNote: dto.review_note ?? undefined,
    submittedAt: dto.submitted_at ?? undefined,
  }
}

function toDelivery(dto: DeliveryDTO): Delivery {
  const stages = (dto.stages ?? []).map(toStage)
  const open = stages.filter((s) => !s.completed)
  const pending = open.filter((s) => s.reviewStatus === 'pending')
  const returned = open.find((s) => s.reviewStatus === 'returned')
  const lastSent = pending.reduce((max, s) => (s.submittedAt && s.submittedAt > max ? s.submittedAt : max), '')

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
    stages,
    completed: dto.completed,
    completedAt: dto.completed_at ?? undefined,
    commentsCount: dto.comments_count ?? 0,
    createdAt: dto.created_at,
    kind: dto.kind === 'project_stage' ? 'project_stage' : 'delivery',
    projectId: dto.project_id,
    projectName: dto.project_name,
    inReview: pending.length > 0,
    awaitingReview: open.length > 0 && pending.length === open.length,
    canLaunch: open.some((s) => s.reviewStatus !== 'pending'),
    submittedAt: lastSent || undefined,
    returnedNote: returned?.reviewNote,
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

function toSubmission(dto: SubmissionDTO): Submission {
  return {
    id: dto.id,
    kind: dto.kind,
    deliveryId: dto.delivery_id,
    status: dto.status,
    authorName: dto.author_name,
    doneText: dto.done_text,
    missingText: dto.missing_text ?? undefined,
    links: dto.links ?? [],
    files: dto.files ?? [],
    reviewerName: dto.reviewer_name ?? undefined,
    reviewNote: dto.review_note ?? undefined,
    reviewedAt: dto.reviewed_at ?? undefined,
    createdAt: dto.created_at,
    itemTitle: dto.item_title,
    stageTitle: dto.stage_title ?? undefined,
    stagePosition: dto.stage_position ?? undefined,
    stageCount: dto.stage_count ?? undefined,
    projectName: dto.project_name ?? undefined,
    dueDate: dto.due_date.slice(0, 10),
    sectorName: dto.sector_name ?? undefined,
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

// Evidência: links e prints (imagens já comprimidas, em data URL)
export interface Evidence {
  links: string[]
  files: string[]
}

export interface LaunchNote {
  doneText: string
  missingText?: string
  evidence?: Evidence
}

export interface LaunchInput extends LaunchNote {
  stageId: string
}

export type SubmissionTarget = { deliveryId: string } | { projectStageId: string }
export type ReviewFilter = 'pending' | 'approved' | 'returned' | 'all'
function toNotePayload(note: LaunchNote) {
  return { done_text: note.doneText, missing_text: note.missingText || null }
}

function toEvidencePayload(evidence?: Evidence) {
  return evidence ? { links: evidence.links, files: evidence.files.map((data) => ({ data })) } : undefined
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
  // Entregas + etapas de projeto, juntas e ordenadas pelo prazo
  async getAll(scope: DeliveryScope, sectorId?: string): Promise<Delivery[]> {
    const params = { scope, sector_id: sectorId || undefined }
    const [deliveries, projectTasks] = await Promise.all([
      api.get<DeliveryDTO[]>('/deliveries', { params }),
      api.get<DeliveryDTO[]>('/project-tasks', { params }),
    ])
    return [...deliveries.data, ...projectTasks.data]
      .map(toDelivery)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  },

  // Atribuir (ou criar para si) uma entrega
  async create(input: DeliveryInput): Promise<Delivery> {
    const response = await api.post<DeliveryDTO>('/deliveries', toPayload(input))
    return toDelivery(response.data)
  },

  // Lançar uma atividade que não foi atribuída (vai para validação, ou já conclui se for ADMIN)
  async createLaunched(input: DeliveryInput, note: LaunchNote): Promise<void> {
    await api.post('/deliveries', {
      ...toPayload(input),
      stages: undefined,
      first_update: toNotePayload(note),
      evidence: toEvidencePayload(note.evidence),
    })
  },

  // Lançar uma etapa (vai para validação, ou já conclui se for ADMIN)
  async launch(id: string, input: LaunchInput): Promise<void> {
    await api.post(`/deliveries/${id}/updates`, {
      stage_id: input.stageId,
      ...toNotePayload(input),
      evidence: toEvidencePayload(input.evidence),
    })
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

  // ---------- Etapas de projeto ----------

  async completeProjectTask(stageId: string, note: LaunchNote): Promise<void> {
    await api.post(`/project-tasks/${stageId}/complete`, {
      ...toNotePayload(note),
      evidence: toEvidencePayload(note.evidence),
    })
  },

  async reopenProjectTask(stageId: string): Promise<void> {
    await api.patch(`/project-tasks/${stageId}/reopen`)
  },

  async getProjectTaskNotes(projectId: string, stageId: string): Promise<ProjectStageNote[]> {
    const response = await api.get<NoteDTO[]>(`/projects/${projectId}/stages/${stageId}/notes`)
    return response.data.map((n) => ({
      id: n.id,
      text: n.text,
      authorName: n.author_name,
      createdAt: n.created_at,
    }))
  },

  // ---------- Validação do gestor ----------

   async getReviews(status: ReviewFilter = 'pending'): Promise<Submission[]> {
    const response = await api.get<SubmissionDTO[]>('/reviews', { params: { status } })
    return response.data.map(toSubmission)
  },

  async getSubmissions(target: SubmissionTarget): Promise<Submission[]> {
    const params =
      'deliveryId' in target ? { delivery_id: target.deliveryId } : { project_stage_id: target.projectStageId }
    const response = await api.get<SubmissionDTO[]>('/submissions', { params })
    return response.data.map(toSubmission)
  },

  async approveSubmission(id: string): Promise<void> {
    await api.post(`/reviews/${id}/approve`)
  },

  async returnSubmission(id: string, note: string): Promise<void> {
    await api.post(`/reviews/${id}/return`, { note })
  },

  // Print da evidência (baixado com a sessão do usuário)
  async getEvidenceFile(fileId: string): Promise<Blob> {
    const response = await api.get<Blob>(`/evidence/${fileId}`, { responseType: 'blob' })
    return response.data
  },
}