import React, { useState } from 'react';
import { FolderKanban, Plus, Calendar, User, Pencil, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../../types';
import { useProjects, useDeleteProject } from './useProjects';
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectBoard } from './ProjectBoard';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const getStatusBadge = (st: ProjectStatus) => {
  switch (st) {
    case 'Concluído':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Em andamento':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Aguardando':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Cancelado':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const ProjetosPage: React.FC = () => {
  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();
  const deleteProject = useDeleteProject();
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'LIDER';
  // Projeto aberto no quadro Kanban (null = mostra a lista)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Formulário: null = fechado | { project: null } = criar | { project } = editar
  const [form, setForm] = useState<{ project: Project | null } | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  const handleDelete = (proj: Project) => {
    const confirmed = window.confirm(
      `Excluir o projeto "${proj.name}"?\n\nAs etapas também serão excluídas. Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    deleteProject.mutate(proj.id, {
      onError: (err) => window.alert(err.message),
    });
  };

  const formModal = form && <ProjectFormModal project={form.project} onClose={() => setForm(null)} />;

  // ----- Quadro de um projeto -----
  if (selectedProject) {
    return (
      <>
        <ProjectBoard
          project={selectedProject}
          onBack={() => setSelectedId(null)}
          onEdit={() => setForm({ project: selectedProject })}
        />
        {formModal}
      </>
    );
  }

  // ----- Lista de projetos -----
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-blue-600" />
            Gestão de Projetos
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe o andamento, prazos e responsáveis pelas iniciativas estratégicas da empresa.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setForm({ project: null })}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Carregando projetos...</p>}

      {isError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm flex items-center justify-between gap-4">
          <span>{error.message}</span>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg border border-rose-300 font-medium hover:bg-rose-100 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum projeto cadastrado ainda. Clique em "Novo Projeto" para começar.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const isDeleting = deleteProject.isPending && deleteProject.variables === proj.id;
          const doneCount = proj.stages.filter((s) => s.status === 'done').length;

          return (
            <div
              key={proj.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(proj.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedId(proj.id)}
              className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer ${
                isDeleting ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    {proj.department || 'Geral'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{proj.name}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(proj.status)}`}>
                  {proj.status}
                </span>
              </div>

              <p className="text-sm text-slate-600">{proj.description || 'Sem descrição informada.'}</p>

              {/* Progresso pelas etapas */}
              {proj.stages.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>
                      {doneCount}/{proj.stages.length} etapas
                    </span>
                    <span className="font-semibold text-slate-700">{proj.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${proj.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700 truncate">{proj.owner || 'Sem responsável'}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Prazo: {proj.dueDate ? formatDate(proj.dueDate) : 'Indefinido'}</span>
                </div>
              </div>

              {/* Ações (stopPropagation: clicar aqui não abre o quadro) */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm({ project: proj });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(proj);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {formModal}
    </div>
  );
};