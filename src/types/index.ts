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
// 6. Situação da entrega (calculada a partir do prazo e da conclusão, nunca guardada)
export type DeliverySituation =
  | 'NO PRAZO'
  | 'EM RISCO'
  | 'ATRASADO'
  | 'CONCLUIDO'
  | 'CONCLUIDO COM ATRASO';

// 6.1 Entregas (atividades atribuídas a pessoas, com ou sem projeto)
export interface Delivery {
  id: string;
  projectId?: string;
  projectName?: string;
  title: string;
  description?: string;
  assignedToId?: string;
  assignedToName: string;
  assignedByName?: string;
  sector: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  commentsCount: number;
  createdAt?: string;
}