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

// 2. Status do Projeto (Conforme o escopo do MVP)
export type ProjectStatus = 
  | 'NÃO_COMEÇADO' 
  | 'EM_PROGRESSO' 
  | 'ESPERANDO' 
  | 'COMPLETO' 
  | 'CANCELADO';

// 3. Situação do Prazo / Entrega
export type ScheduleStatus = 'ENTREGUE' | 'PROXIMO A VENCER' | 'EM ATRASO' | 'COMPLETO';

// 4. Estrutura do Projeto
export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;         // Responsável pelo projeto
  ownerName?: string;
  sector: string;          // Setor
  startDate: string;       // Data de início (AAAA-MM-DD)
  dueDate: string;         // Prazo final
  status: ProjectStatus;
  scheduleStatus: ScheduleStatus;
  observations?: string;
  createdAt: string;
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

// 6. Entregas (Atividades vinculadas a setores e pessoas)
export interface Delivery {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  assignedToId: string;
  assignedToName?: string;
  sector: string;
  dueDate: string;
  scheduleStatus: ScheduleStatus;
  completed: boolean;
  commentsCount: number;
}

// 7. Histórico de Alterações de Prazos/Datas (Auditoria)
export interface DateChangeHistory {
  id: string;
  projectId: string;
  previousDueDate: string;
  newDueDate: string;
  changedBy: string;
  changedAt: string;
  justification: string;
}

// 8. Indicadores Consolidados do Dashboard
export interface DashboardMetrics {
  totalProjects: number;
  inProgressProjects: number;
  waitingProjects: number;
  delayedProjects: number;
  completedProjects: number;
  onTimeProjects: number;
  onTimeCompletionRate: number; // Percentual ex: 85%
}

