import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Pencil,
  User,
} from 'lucide-react';
import type { Project, ProjectStage, ProjectStageStatus } from '../../types';
import {
  useMoveStage,
  useUpdateStage,
  useProjectAssignees,
  useStageNotes,
  useAddStageNote,
} from './useProjects';
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

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
  const [openStageId, setOpenStageId] = useState<string | null>(null);

  // Busca a etapa aberta na lista atual, para o modal mostrar sempre os dados mais recentes
  const openStage = project.stages.find((s) => s.id === openStageId) ?? null;
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
          Você pode mover e registrar observações nas etapas pelas quais é responsável. Clique num cartão para ver os
          detalhes.
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
                        onClick={() => setOpenStageId(stage.id)}
                        className={`bg-white border rounded-xl p-3 shadow-sm space-y-2 cursor-pointer hover:border-slate-300 ${
                          isMine ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                        } ${movable ? 'active:cursor-grabbing' : ''} ${draggingId === stage.id ? 'opacity-40' : ''}`}
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

                        {/* Contador de observações + botões para mover */}
                        <div className="flex items-center justify-between pt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              stage.notesCount > 0 ? 'text-slate-600' : 'text-slate-300'
                            }`}
                            title={`${stage.notesCount} observação(ões)`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {stage.notesCount}
                          </span>

                          {movable && (
                            <div className="flex gap-1">
                              {prev && (
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
                        </div>
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

      {openStage && (
        <StageModal
          project={project}
          stage={openStage}
          canEdit={isBoardLeader}
          canNote={canMoveStage(user, project, openStage)}
          onClose={() => setOpenStageId(null)}
        />
      )}
    </div>
  );
};

// ---------- Modal da etapa: dados (editáveis pelo líder) + observações ----------

interface StageModalProps {
  project: Project;
  stage: ProjectStage;
  canEdit: boolean; // líder do quadro
  canNote: boolean; // líder do quadro ou responsável pela etapa
  onClose: () => void;
}

const StageModal: React.FC<StageModalProps> = ({ project, stage, canEdit, canNote, onClose }) => {
  const badge = stageBadge(stage);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Etapa {stage.position}</p>
            <h2 className="text-lg font-bold text-slate-900">{stage.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {canEdit ? (
          <StageEditForm project={project} stage={stage} />
        ) : (
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Prazo</dt>
              <dd className="font-medium text-slate-800">{formatDate(stage.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Responsável</dt>
              <dd className="font-medium text-slate-800 truncate">{stage.responsibleName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Situação</dt>
              <dd>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}>
                  {badge.label}
                </span>
              </dd>
            </div>
          </dl>
        )}

        <StageNotes project={project} stage={stage} canNote={canNote} />
      </div>
    </div>
  );
};

// Formulário de edição (título, prazo e responsável) - só o líder do quadro
const StageEditForm: React.FC<{ project: Project; stage: ProjectStage }> = ({ project, stage }) => {
  const updateStage = useUpdateStage();
  const { data: assignees = [] } = useProjectAssignees();

  const [title, setTitle] = useState(stage.title);
  const [dueDate, setDueDate] = useState(stage.dueDate);
  const [responsibleId, setResponsibleId] = useState(stage.responsibleId);
  const [saved, setSaved] = useState(false);

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

  const changed =
    title.trim() !== stage.title || dueDate !== stage.dueDate || responsibleId !== stage.responsibleId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    updateStage.mutate(
      { projectId: project.id, stageId: stage.id, input: { title, dueDate, responsibleId } },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={labelClass}>Título *</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>

      {updateStage.isError && <p className="text-sm text-rose-600">{updateStage.error.message}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && !changed && <span className="text-xs text-emerald-700">✓ Salvo</span>}
        <button
          type="submit"
          disabled={!changed || updateStage.isPending}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateStage.isPending ? 'Salvando...' : 'Salvar etapa'}
        </button>
      </div>
    </form>
  );
};

// Histórico de observações da etapa
const StageNotes: React.FC<{ project: Project; stage: ProjectStage; canNote: boolean }> = ({
  project,
  stage,
  canNote,
}) => {
  const { data: notes = [], isLoading, isError, error } = useStageNotes(project.id, stage.id);
  const addNote = useAddStageNote();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addNote.mutate(
      { projectId: project.id, stageId: stage.id, text: text.trim() },
      { onSuccess: () => setText('') },
    );
  };

  return (
    <div className="space-y-3 pt-4 border-t border-slate-100">
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        Observações
      </h3>

      {canNote && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            rows={3}
            maxLength={2000}
            placeholder="Escreva o que foi feito, o que falta ou algum ponto de atenção..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
          {addNote.isError && <p className="text-sm text-rose-600">{addNote.error.message}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!text.trim() || addNote.isPending}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addNote.isPending ? 'Registrando...' : 'Registrar observação'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-500">Carregando observações...</p>}
      {isError && <p className="text-sm text-rose-600">{error.message}</p>}
      {!isLoading && !isError && notes.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma observação registrada ainda.</p>
      )}

      <ul className="space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">
              <b className="text-slate-700">{note.authorName}</b> · {formatDateTime(note.createdAt)}
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};