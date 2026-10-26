import { api } from '../lib/api'
import type { Project, ProjectStatus } from '../types'

// Formato que o backend devolve (igual às colunas do banco)
interface ProjectDTO {
  id: string
  name: string
  description: string | null
  owner_id: string | null
  owner: string | null
  department: string | null
  start_date: string | null
  due_date: string | null
  status: string
  notes: string | null
  created_at: string
}

// Código do banco → texto da tela
const STATUS_FROM_API: Record<string, ProjectStatus> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  waiting: 'Aguardando',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

// Texto da tela → código do banco
const STATUS_TO_API: Record<ProjectStatus, string> = {
  'Não iniciado': 'not_started',
  'Em andamento': 'in_progress',
  'Aguardando': 'waiting',
  'Concluído': 'completed',
  'Cancelado': 'cancelled',
}

// Traduz um projeto do backend para o formato das telas
function toProject(dto: ProjectDTO): Project {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? '',
    ownerId: dto.owner_id ?? undefined,
    owner: dto.owner ?? '',
    department: dto.department ?? '',
    startDate: dto.start_date?.slice(0, 10) ?? '',
    dueDate: dto.due_date?.slice(0, 10) ?? '',
    status: STATUS_FROM_API[dto.status] ?? 'Não iniciado',
    notes: dto.notes ?? undefined,
    createdAt: dto.created_at,
  }
}

// O que as telas enviam para criar ou editar um projeto
export interface ProjectInput {
  name: string
  description?: string
  owner?: string
  department?: string
  startDate?: string
  dueDate?: string
  status?: ProjectStatus
  notes?: string
}

// Traduz os dados da tela para o formato do backend
function toPayload(input: ProjectInput) {
  return {
    name: input.name,
    description: input.description || null,
    owner: input.owner || null,
    department: input.department || null,
    start_date: input.startDate || null,
    due_date: input.dueDate || null,
    status: input.status ? STATUS_TO_API[input.status] : undefined,
    notes: input.notes || null,
  }
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const response = await api.get<ProjectDTO[]>('/projects')
    return response.data.map(toProject)
  },

  async create(input: ProjectInput): Promise<Project> {
    const response = await api.post<ProjectDTO>('/projects', toPayload(input))
    return toProject(response.data)
  },

  async update(id: string, input: ProjectInput): Promise<Project> {
    const response = await api.put<ProjectDTO>(`/projects/${id}`, toPayload(input))
    return toProject(response.data)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },
}