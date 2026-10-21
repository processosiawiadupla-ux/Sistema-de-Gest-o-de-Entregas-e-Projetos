import type { User, Project, ProjectStage, Delivery } from '../types';

export const initialUsers: User[] = [
  {
    id: 'usr-1',
    name: 'Ana Silva',
    email: 'ana.silva@empresa.com',
    role: 'ADMIN',
    status: 'ATIVO',
    sector: 'Gestão e Estratégia',
  },
  {
    id: 'usr-2',
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@empresa.com',
    role: 'LIDER',
    status: 'ATIVO',
    sector: 'Tecnologia / Desenvolvimento',
  },
  {
    id: 'usr-3',
    name: 'Mariana Santos',
    email: 'mariana.santos@empresa.com',
    role: 'COLABORADOR',
    status: 'ATIVO',
    sector: 'Marketing',
  },
  {
    id: 'usr-4',
    name: 'João Pereira',
    email: 'joao.pereira@empresa.com',
    role: 'COLABORADOR',
    status: 'PENDENTE',
    sector: 'Comercial',
  },
];

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Migração de Infraestrutura para VPS Hostinger',
    description: 'Migrar os servidores legados para a nova arquitetura em nuvem na Hostinger com Docker e Nginx.',
    ownerId: 'usr-2',
    ownerName: 'Carlos Oliveira',
    sector: 'Tecnologia / Desenvolvimento',
    startDate: '2026-03-01',
    dueDate: '2026-04-15',
    status: 'EM_PROGRESSO',
    scheduleStatus: 'ENTREGUE',
    observations: 'Aguardando validação final das chaves SSH e certificados SSL.',
    createdAt: '2026-03-01',
  },
  {
    id: 'proj-2',
    name: 'Campanha de Lançamento Q2',
    description: 'Planeamento e execução de marketing digital para os novos produtos do trimestre.',
    ownerId: 'usr-3',
    ownerName: 'Mariana Santos',
    sector: 'Marketing',
    startDate: '2026-03-10',
    dueDate: '2026-03-30',
    status: 'EM_PROGRESSO',
    scheduleStatus: 'PROXIMO A VENCER',
    observations: 'Peças gráficas em aprovação final.',
    createdAt: '2026-03-10',
  },
];

export const initialStages: ProjectStage[] = [
  {
    id: 'stg-1',
    projectId: 'proj-1',
    title: 'Configuração inicial da VPS e firewall',
    dueDate: '2026-03-05',
    status: 'ENTREGUE',
    completed: true,
    assignedToId: 'usr-2',
  },
  {
    id: 'stg-2',
    projectId: 'proj-1',
    title: 'Deploy da base de dados PostgreSQL',
    dueDate: '2026-03-20',
    status: 'PROXIMO A VENCER',
    completed: false,
    assignedToId: 'usr-2',
  },
];

export const initialDeliveries: Delivery[] = [
  {
    id: 'del-1',
    projectId: 'proj-1',
    title: 'Revisar logs de segurança do servidor',
    description: 'Verificar acessos não autorizados e configurar fail2ban.',
    assignedToId: 'usr-2',
    assignedToName: 'Carlos Oliveira',
    sector: 'Tecnologia / Desenvolvimento',
    dueDate: '2026-03-25',
    scheduleStatus: 'PROXIMO A VENCER',
    completed: false,
    commentsCount: 2,
  },
];