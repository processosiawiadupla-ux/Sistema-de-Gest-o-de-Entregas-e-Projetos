import { api } from '../lib/api';
import type {
  Project,
  ProjectAssignee,
  ProjectStage,
  ProjectStageNote,
  ProjectStageStatus,
  ProjectStatus,
} from '../types';

// ---------- Tradução backend ↔ tela ----------

const STATUS_TO_LABEL: Record<string, ProjectStatus> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  waiting: 'Aguardando',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const LABEL_TO_STATUS = Object.fromEntries(
  Object.entries(STATUS_TO_LABEL).map(([code, label]) => [label, code]),
) as Record<ProjectStatus, string>;

interface ProjectStageDTO {
  id: string;
  position: number;
  title: string;
  due_date: string;
  responsible_id: string;
  responsible_name: string;
  status: ProjectStageStatus;
  completed_at: string | null;
  notes_count?: number;
}

interface ProjectDTO {
  id: string;
  name: string;
  description: string | null;
  owner: string | null;
  owner_id: string | null;
  sector_id: string | null;
  sector_name: string | null;
  start_date: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  stages: ProjectStageDTO[] | null;
}

interface AssigneeDTO {
  id: string;
  name: string;
  sector_id: string | null;
  sector_name: string | null;
}

interface StageNoteDTO {
  id: string;
  text: string;
  author_name: string;
  created_at: string;
}

const toStage = (dto: ProjectStageDTO): ProjectStage => ({
  id: dto.id,
  position: dto.position,
  title: dto.title,
  dueDate: dto.due_date,
  responsibleId: dto.responsible_id,
  responsibleName: dto.responsible_name,
  status: dto.status,
  completedAt: dto.completed_at,
  notesCount: dto.notes_count ?? 0,
});

const toNote = (dto: StageNoteDTO): ProjectStageNote => ({
  id: dto.id,
  text: dto.text,
  authorName: dto.author_name,
  createdAt: dto.created_at,
});

// Progresso = etapas concluídas / total de etapas
export function calcProgress(stages: ProjectStage[]) {
  if (stages.length === 0) return 0;
  const done = stages.filter((s) => s.status === 'done').length;
  return Math.round((done / stages.length) * 100);
}

const toProject = (dto: ProjectDTO): Project => {
  const stages = (dto.stages ?? []).map(toStage);
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? '',
    owner: dto.owner ?? '',
    ownerId: dto.owner_id ?? undefined,
    sectorId: dto.sector_id,
    department: dto.sector_name ?? '',
    startDate: dto.start_date ?? '',
    dueDate: dto.due_date ?? '',
    status: STATUS_TO_LABEL[dto.status] ?? 'Não iniciado',
    notes: dto.notes ?? '',
    stages,
    progress: calcProgress(stages),
  };
};

// ---------- O que a tela envia ----------

export interface ProjectInput {
  name: string;
  description: string;
  ownerId: string;
  sectorId: string;
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  notes: string;
}

export interface StageInput {
  title: string;
  dueDate: string;
  responsibleId: string;
}

export interface CreateProjectInput extends ProjectInput {
  stages: StageInput[];
}

const toPayload = (input: ProjectInput) => ({
  name: input.name,
  description: input.description || null,
  owner_id: input.ownerId,
  sector_id: input.sectorId || null,
  start_date: input.startDate || null,
  due_date: input.dueDate || null,
  status: LABEL_TO_STATUS[input.status],
  notes: input.notes || null,
});

const toStagePayload = (stage: StageInput) => ({
  title: stage.title,
  due_date: stage.dueDate,
  responsible_id: stage.responsibleId,
});

// ---------- Chamadas à API ----------

export const projectService = {
  async list() {
    const { data } = await api.get<ProjectDTO[]>('/projects');
    return data.map(toProject);
  },

  async create(input: CreateProjectInput) {
    const { data } = await api.post<ProjectDTO>('/projects', {
      ...toPayload(input),
      stages: input.stages.map(toStagePayload),
    });
    return toProject(data);
  },

  async update(id: string, input: ProjectInput) {
    const { data } = await api.put<ProjectDTO>(`/projects/${id}`, toPayload(input));
    return toProject(data);
  },

  async remove(id: string) {
    await api.delete(`/projects/${id}`);
  },

  async assignees(): Promise<ProjectAssignee[]> {
    const { data } = await api.get<AssigneeDTO[]>('/projects/assignees');
    return data.map((a) => ({
      id: a.id,
      name: a.name,
      sectorId: a.sector_id,
      sectorName: a.sector_name,
    }));
  },

  async moveStage(projectId: string, stageId: string, status: ProjectStageStatus) {
    const { data } = await api.patch<ProjectDTO>(`/projects/${projectId}/stages/${stageId}`, {
      status,
    });
    return toProject(data);
  },

  async updateStage(projectId: string, stageId: string, input: StageInput) {
    const { data } = await api.put<ProjectDTO>(
      `/projects/${projectId}/stages/${stageId}`,
      toStagePayload(input),
    );
    return toProject(data);
  },

  // Observações de uma etapa (da mais recente para a mais antiga)
  async listStageNotes(projectId: string, stageId: string): Promise<ProjectStageNote[]> {
    const { data } = await api.get<StageNoteDTO[]>(`/projects/${projectId}/stages/${stageId}/notes`);
    return data.map(toNote);
  },

  // Registra uma observação e devolve a lista atualizada
  async addStageNote(projectId: string, stageId: string, text: string): Promise<ProjectStageNote[]> {
    const { data } = await api.post<StageNoteDTO[]>(`/projects/${projectId}/stages/${stageId}/notes`, {
      text,
    });
    return data.map(toNote);
  },
};

