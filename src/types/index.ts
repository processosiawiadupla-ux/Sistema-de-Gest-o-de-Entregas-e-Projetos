// 1. Papéis e Status de Usuário
export type UserRole = 'ADMIN' | 'LIDER' | 'COLABORADOR';
export type UserStatus = 'PENDENTE' | 'ATIVO' | 'INATIVO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  sector: string;
  avatarUrl?: string;
}

// 2. Status do Projeto (Amigável e legível para a UI)
export type ProjectStatus = 
  | 'Não iniciado' 
  | 'Em andamento' 
  | 'Aguardando' 
  | 'Concluído' 
  | 'Cancelado';

// 3. Situação do Prazo / Entrega
export type ScheduleStatus = 'ENTREGUE' | 'PROXIMO A VENCER' | 'EM ATRASO' | 'COMPLETO';

// 4. Estrutura Completa do Projeto
export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId?: string;        // ID do responsável
  owner: string;          // Nome legível do responsável
  department: string;
  sectorId?: string;     // Setor / Área
  startDate: string;      // Data de início (AAAA-MM-DD)
  dueDate: string;        // Prazo final
  status: ProjectStatus;
  scheduleStatus?: ScheduleStatus;
  notes?: string;         // Observações gerais
  createdAt?: string;
}

// 5. Etapas e Marcos Importantes do Projeto
export interface ProjectStage {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  status: ScheduleStatus;
  completed: boolean;
  assignedToId?: string;
}

// 6. Situação da entrega (calculada a partir do prazo e da conclusão, nunca guardada)
export type DeliverySituation =
  | 'NO PRAZO'
  | 'EM RISCO'
  | 'ATRASADO'
  | 'CONCLUIDO'
  | 'CONCLUIDO COM ATRASO';

// 6.1 Etapa de uma entrega (1, 5 ou 10 por entrega)
export interface DeliveryStage {
  id: string;
  position: number;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

// 6.2 Entrega
export interface Delivery {
  id: string;
  title: string;
  description?: string;
  assignedToId?: string;
  assignedToName: string;
  assignedByName?: string;
  sectorId: string;
  sector: string;
  dueDate: string;
  stageCount: number;
  progress: number;
  stages: DeliveryStage[];
  completed: boolean;
  completedAt?: string;
  commentsCount: number;
  createdAt?: string;
}

// 6.3 Lançamento no histórico de uma entrega
export interface DeliveryUpdate {
  id: string;
  authorName: string;
  doneText: string;
  missingText?: string;
  progress: number;
  stageTitle?: string;
  stagePosition?: number;
  createdAt: string;
}

// 6.4 Pessoa que pode receber uma entrega
export interface Assignee {
  id: string;
  name: string;
  role: UserRole;
  sectorId: string | null;
}
// 9. Setores da empresa
export interface Sector {
  id: string;
  name: string;
}