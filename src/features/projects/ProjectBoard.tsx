import React, { useState } from 'react';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Pencil, User } from 'lucide-react';
import type { Project, ProjectStage, ProjectStageStatus } from '../../types';
import { useMoveStage, useUpdateStage, useProjectAssignees } from './useProjects';
import { canManageBoard, canMoveStage } from './projectAccess';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const COLUMNS: { status: ProjectStageStatus; title: string; dot: string }[] = [
  { status: 'todo', title: 'A fazer', dot: 'bg-slate-400' },
  { status: 'doing', title: 'Em andamento', dot: 'bg-blue-500' },
  { status: 'done', title: 'Concluído', dot: 'bg-emerald-500' },
];

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

// 'AAAA-MM-DD' no fuso do computador (não em UTC)
function localISODate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

// Mesmas regras das entregas: em risco = vence em até 3 dias
function stageBadge(stage: ProjectStage) {
  const green = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const amber = 'bg-amber-50 text-amber-700 border-amber-200';
  const red = 'bg-rose-50 text-rose-700 border-rose-200';

  if (stage.status === 'done') {
    const doneDay = stage.completedAt ? localISODate(new Date(stage.completedAt)) : null;
    return doneDay && doneDay > stage.dueDate
      ? { label: 'Concluída com atraso', className: amber }
      : { label: 'Concluída', className: green };
  }

  const today = localISODate(new Date());
  const days = Math.round((Date.parse(stage.dueDate) - Date.parse(today)) / 86_400_000);
  if (days < 0) return { label: 'Atrasada', className: red };
  if (days <= 3) return { label: 'Em risco', className: amber };
  return { label: 'No prazo', className: green };
}

interface Props {
  project: Project;
  onBack: () => void;
  onEdit?: () => void; // sem onEdit = a pessoa não pode editar o projeto
}

export const ProjectBoard: React.FC<Props> = ({ project, onBack, onEdit }) => {
  const moveStage = useMoveStage();
  const { user } = useAuth();
  // Líder do quadro: ADMIN, LIDER do setor ou responsável principal
  const isBoardLeader = canManageBoard(user, project);

  const [overColumn, setOverColumn] = useState<ProjectStageStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);

  const doneCount = project.stages.filter((s) => s.status === 'done').length;

  const move = (stage: ProjectStage, status: ProjectStageStatus) => {
    if (stage.status === status || !canMoveStage(user, project, stage)) return;
    moveStage.mutate({ projectId: project.id, stageId: stage.id, status });
  };

  const handleDrop = (e: React.DragEvent, status: ProjectStageStatus) => {
    e.preventDefault();
    setOverColumn(null);
    setDraggingId(null);
    const stage = project.stages.find((s) => s.id === e.dataTransfer.getData('text/plain'));
    if (stage) move(stage, status);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Cabeçalho do projeto */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para projetos
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                {project.department || 'Geral'}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">{project.name}</h1>
              {project.description && <p className="text-sm text-slate-500 mt-1">{project.description}</p>}
              {project.owner && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Responsável principal: <span className="font-medium text-slate-700">{project.owner}</span>
                </p>
              )}
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar projeto
              </button>
            )}
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>
                {doneCount} de {project.stages.length} etapas concluídas
              </span>
              <span className="font-semibold text-slate-700">{project.progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {!isBoardLeader && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          Você pode mover as etapas pelas quais é responsável. As demais ficam com o líder do projeto.
        </p>
      )}

      {moveStage.isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          Não foi possível mover a etapa: {moveStage.error.message}
        </p>
      )}

      {project.stages.length === 0 ? (
        <p className="text-sm text-slate-500">
          Este projeto foi criado antes das etapas existirem, por isso o quadro está vazio.
        </p>
      ) : (
        /* Quadro Kanban */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map((column, columnIndex) => {
            const cards = project.stages.filter((s) => s.status === column.status);
            const isOver = overColumn === column.status;

            return (
              <section
                key={column.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverColumn(column.status);
                }}
                onDragLeave={() => setOverColumn(null)}
                onDrop={(e) => handleDrop(e, column.status)}
                className={`rounded-2xl border p-3 min-h-48 transition-colors ${
                  isOver ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h2 className="flex items-center gap-2 px-1 pb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${column.dot}`} />
                  {column.title}
                  <span className="ml-auto text-slate-400 font-semibold">{cards.length}</span>
                </h2>

                <div className="space-y-2">
                  {cards.map((stage) => {
                    const badge = stageBadge(stage);
                    const prev = COLUMNS[columnIndex - 1];
                    const next = COLUMNS[columnIndex + 1];
                    const movable = canMoveStage(user, project, stage);
                    const isMine = stage.responsibleId === user?.id;

                    return (
                      <article
                        key={stage.id}
                        draggable={movable}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', stage.id);
                          setDraggingId(stage.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => isBoardLeader && setEditingStage(stage)}
                        className={`bg-white border rounded-xl p-3 shadow-sm space-y-2 ${
                          isMine ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                        } ${movable ? 'cursor-grab active:cursor-grabbing hover:border-slate-300' : 'cursor-default'} ${
                          draggingId === stage.id ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            <span className="text-slate-400 mr-1">{stage.position}.</span>
                            {stage.title}
                          </p>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {isMine ? 'Você' : stage.responsibleName}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(stage.dueDate)}
                          </span>
                        </div>

                        {/* Botões para mover (funcionam também no celular) */}
                        {movable && (
                          <div className="flex justify-between pt-1">
                            {prev ? (
                              <button
                                type="button"
                                title={`Mover para ${prev.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  move(stage, prev.status);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            ) : (
                              <span />
                            )}
                            {next && (
                              <button
                                type="button"
                                title={`Mover para ${next.title}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  move(stage, next.status);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {cards.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">Arraste uma etapa para cá</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editingStage && (
        <StageEditModal project={project} stage={editingStage} onClose={() => setEditingStage(null)} />
      )}
    </div>
  );
};

// ---------- Modal para editar uma etapa (só o líder do quadro abre) ----------

interface StageEditProps {
  project: Project;
  stage: ProjectStage;
  onClose: () => void;
}

const StageEditModal: React.FC<StageEditProps> = ({ project, stage, onClose }) => {
  const updateStage = useUpdateStage();
  const { data: assignees = [] } = useProjectAssignees();

  const [title, setTitle] = useState(stage.title);
  const [dueDate, setDueDate] = useState(stage.dueDate);
  const [responsibleId, setResponsibleId] = useState(stage.responsibleId);

  // Só pessoas do setor do projeto ("Geral" = todas)
  const sectorPeople = project.sectorId
    ? assignees.filter((a) => a.sectorId === project.sectorId)
    : assignees;

  // Garante que o responsável atual aparece na lista, mesmo que não esteja nela
  const options = sectorPeople.some((a) => a.id === stage.responsibleId)
    ? sectorPeople
    : [
        { id: stage.responsibleId, name: stage.responsibleName, sectorId: null, sectorName: null },
        ...sectorPeople,
      ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStage.mutate(
      { projectId: project.id, stageId: stage.id, input: { title, dueDate, responsibleId } },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Editar etapa {stage.position}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prazo *</label>
            <input
              type="date"
              required
              value={dueDate}
              min={project.startDate || undefined}
              max={project.dueDate || undefined}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Responsável *</label>
            <select
              required
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className={inputClass}
            >
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.sectorName ? `${a.name} (${a.sectorName})` : a.name}
                </option>
              ))}
            </select>
          </div>

          {updateStage.isError && <p className="text-sm text-rose-600">{updateStage.error.message}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateStage.isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updateStage.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};