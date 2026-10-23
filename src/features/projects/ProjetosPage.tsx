import React, { useState } from 'react';
import { FolderKanban, Plus, Calendar, User } from 'lucide-react';
import type { Project, ProjectStatus } from '../../types';

const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Migração de Servidores VPS',
    description: 'Transferência da infraestrutura principal para a nova instância Hostinger.',
    owner: 'Naiara Nunes',
    department: 'Tecnologia',
    startDate: '2026-10-01',
    dueDate: '2026-11-15',
    status: 'Em andamento',
    notes: 'Acompanhar os logs de DNS durante a transição.',
  },
  {
    id: 'proj-2',
    name: 'Redesign do Portal de Entregas',
    description: 'Atualização completa da interface visual e experiência do utilizador.',
    owner: 'Carlos Silva',
    department: 'Design & Produto',
    startDate: '2026-10-10',
    dueDate: '2026-12-01',
    status: 'Não iniciado',
    notes: 'Aguardando aprovação do manual de marca.',
  },
];

export const ProjetosPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do formulário de novo projeto
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Não iniciado');
  const [notes, setNotes] = useState('');

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

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !owner) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      owner,
      department,
      startDate,
      dueDate,
      status,
      notes,
    };

    setProjects([newProj, ...projects]);
    setIsModalOpen(false);

    // Limpar campos
    setName('');
    setDescription('');
    setOwner('');
    setDepartment('');
    setStartDate('');
    setDueDate('');
    setStatus('Não iniciado');
    setNotes('');
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
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* Grid de Cartões dos Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => (
          <div key={proj.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:border-slate-300 transition-all">
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
                <span className="font-medium text-slate-700 truncate">{proj.owner}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Prazo: {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString('pt-BR') : 'Indefinido'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criar Projeto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Cadastrar Novo Projeto</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
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
                  Status Inicial
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};