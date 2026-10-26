import React, { useState } from 'react';
import { FolderKanban, Plus, Calendar, User, Pencil, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../../types';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './useProjects';

// Converte 'AAAA-MM-DD' em 'DD/MM/AAAA' sem passar pelo fuso horário
const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

export const ProjetosPage: React.FC = () => {
  // Dados e ações vindos do backend (via TanStack Query)
  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Projeto sendo editado (null = modo de criação)
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Estados do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Não iniciado');
  const [notes, setNotes] = useState('');

  const isEditing = editingProject !== null;
  const isSaving = createProject.isPending || updateProject.isPending;
  const saveError = isEditing ? updateProject.error : createProject.error;

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

  const resetForm = () => {
    setName('');
    setDescription('');
    setOwner('');
    setDepartment('');
    setStartDate('');
    setDueDate('');
    setStatus('Não iniciado');
    setNotes('');
  };

  // Abre o modal vazio, para criar
  const openCreateModal = () => {
    createProject.reset();
    setEditingProject(null);
    resetForm();
    setIsModalOpen(true);
  };

  // Abre o modal preenchido, para editar
  const openEditModal = (proj: Project) => {
    updateProject.reset();
    setEditingProject(proj);
    setName(proj.name);
    setDescription(proj.description);
    setOwner(proj.owner);
    setDepartment(proj.department);
    setStartDate(proj.startDate);
    setDueDate(proj.dueDate);
    setStatus(proj.status);
    setNotes(proj.notes ?? '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !owner) return;

    const input = { name, description, owner, department, startDate, dueDate, status, notes };
    const onSuccess = () => {
      closeModal();
      resetForm();
    };

    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, input }, { onSuccess });
    } else {
      createProject.mutate(input, { onSuccess });
    }
  };

  const handleDelete = (proj: Project) => {
    const confirmed = window.confirm(
      `Excluir o projeto "${proj.name}"?\n\nTodas as entregas vinculadas a ele também serão excluídas. Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    deleteProject.mutate(proj.id, {
      onError: (err) => window.alert(err.message),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Cabeçalho */}
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

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* Carregando */}
      {isLoading && (
        <p className="text-sm text-slate-500">Carregando projetos...</p>
      )}

      {/* Erro */}
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

      {/* Lista vazia */}
      {!isLoading && !isError && projects.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum projeto cadastrado ainda. Clique em "Novo Projeto" para começar.
        </p>
      )}

      {/* Grid de Cartões dos Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const isDeleting = deleteProject.isPending && deleteProject.variables === proj.id;

          return (
            <div
              key={proj.id}
              className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:border-slate-300 transition-all ${isDeleting ? 'opacity-50' : ''}`}
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

              {/* Ações */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(proj)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(proj)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Criar / Editar Projeto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Projeto' : 'Cadastrar Novo Projeto'}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Expansão Logística Sul"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição Resumida
                </label>
                <textarea
                  rows={2}
                  placeholder="Qual o objetivo principal do projeto?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Responsável Principal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do responsável"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Área ou Setor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Operações, TI"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Prazo Previsto (Conclusão)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {isEditing ? 'Status' : 'Status Inicial'}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Não iniciado">Não iniciado</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observações Gerais
                </label>
                <input
                  type="text"
                  placeholder="Notas adicionais"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Erro ao salvar */}
              {saveError && (
                <p className="text-sm text-rose-600">{saveError.message}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};