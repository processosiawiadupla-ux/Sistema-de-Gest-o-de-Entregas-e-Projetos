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
  department: string;     // Setor / Área
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

// 6. Entregas (Atividades vinculadas a setores e pessoas)
export interface Delivery {
  deadline: ReactNode;
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
  onTimeCompletionRate: number; // Percentual ex: 85
}