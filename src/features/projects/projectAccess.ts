import type { Project, ProjectStage, UserRole } from '../../types';

type Viewer = { id: string; role: UserRole; sectorId?: string | null } | null | undefined;

// Criar, editar dados gerais e excluir: ADMIN ou LIDER do setor do projeto
export function canEditProject(user: Viewer, project: Project) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'LIDER' && project.sectorId !== null && project.sectorId === user.sectorId;
}

// Mover qualquer cartão e editar etapas: quem edita o projeto ou o responsável principal
export function canManageBoard(user: Viewer, project: Project) {
  return canEditProject(user, project) || (!!user && project.ownerId === user.id);
}

// Mover um cartão específico: líder do quadro ou o responsável daquela etapa
export function canMoveStage(user: Viewer, project: Project, stage: ProjectStage) {
  return canManageBoard(user, project) || (!!user && stage.responsibleId === user.id);
}