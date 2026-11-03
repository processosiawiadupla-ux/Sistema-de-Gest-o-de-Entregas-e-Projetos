import React, { useState } from 'react';
import type { Project, ProjectStatus } from '../../types';
import type { StageInput } from '../../services/projectService';
import { useCreateProject, useUpdateProject, useProjectAssignees } from './useProjects';
import { useSectors } from '../sectors/useSectors';
import { useAuth } from '../../context/AuthContext';

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:text-slate-400 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

type StageCount = 1 | 5 | 10;

const STAGE_OPTIONS: { count: StageCount; label: string; hint: string }[] = [
  { count: 1, label: 'Etapa única', hint: 'concluída = 100%' },
  { count: 5, label: '5 etapas', hint: '20% cada' },
  { count: 10, label: '10 etapas', hint: '10% cada' },
];

const emptyStage = (): StageInput => ({ title: '', dueDate: '', responsibleId: '' });

interface Props {
  project: Project | null; // null = criar
  onClose: () => void;
}

export const ProjectFormModal: React.FC<Props> = ({ project, onClose }) => {
  const isEditing = project !== null;
  const { user } = useAuth();
  const isLeader = user?.role === 'LIDER';

  const { data: sectors = [] } = useSectors();
  // Para o LIDER, o backend já devolve só as pessoas do setor dele
  const { data: assignees = [], isLoading: loadingAssignees } = useProjectAssignees();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [sectorId, setSectorId] = useState(project?.sectorId ?? '');
  const [ownerId, setOwnerId] = useState(project?.ownerId ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ?? '');
  const [dueDate, setDueDate] = useState(project?.dueDate ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'Não iniciado');
  const [notes, setNotes] = useState(project?.notes ?? '');

  const [stageCount, setStageCount] = useState<StageCount>(1);
  const [stages, setStages] = useState<StageInput[]>([emptyStage()]);

  // LIDER: o setor é sempre o dele (o mesmo das pessoas que ele pode escolher)
  const leaderSectorId = assignees[0]?.sectorId ?? '';
  const effectiveSectorId = isLeader ? leaderSectorId : sectorId;

  // Pessoas do setor escolhido ("Geral" = todas)
  const sectorPeople = effectiveSectorId
    ? assignees.filter((a) => a.sectorId === effectiveSectorId)
    : assignees;

  const isSaving = createProject.isPending || updateProject.isPending;
  const saveError = isEditing ? updateProject.error : createProject.error;

  // Ao trocar o setor, limpa quem não é do novo setor
  const changeSector = (newSectorId: string) => {
    setSectorId(newSectorId);
    const allowed = new Set(
      (newSectorId ? assignees.filter((a) => a.sectorId === newSectorId) : assignees).map((a) => a.id),
    );
    if (!allowed.has(ownerId)) setOwnerId('');
    setStages((prev) =>
      prev.map((s) => (allowed.has(s.responsibleId) ? s : { ...s, responsibleId: '' })),
    );
  };

  // Muda a quantidade de etapas sem perder o que já foi digitado
  const changeStageCount = (count: StageCount) => {
    setStageCount(count);
    setStages((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? emptyStage()));
  };

  const updateStageField = (index: number, field: keyof StageInput, value: string) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const personLabel = (a: { name: string; sectorName: string | null }) =>
    !effectiveSectorId && a.sectorName ? `${a.name} (${a.sectorName})` : a.name;

  const peoplePlaceholder = loadingAssignees
    ? 'Carregando...'
    : sectorPeople.length === 0
      ? 'Ninguém ativo neste setor'
      : 'Selecione a pessoa';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name,
      description,
      ownerId,
      sectorId: effectiveSectorId,
      startDate,
      dueDate,
      status,
      notes,
    };

    if (isEditing) {
      updateProject.mutate({ id: project.id, input }, { onSuccess: onClose });
    } else {
      createProject.mutate({ ...input, stages }, { onSuccess: onClose });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? 'Editar Projeto' : 'Cadastrar Novo Projeto'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nome do Projeto *</label>
            <input
              type="text"
              required
              placeholder="Ex: Expansão Logística Sul"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Descrição Resumida</label>
            <textarea
              rows={2}
              placeholder="Qual o objetivo principal do projeto?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Setor primeiro; o responsável depende dele */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Setor</label>
              <select
                value={effectiveSectorId}
                disabled={isLeader}
                onChange={(e) => changeSector(e.target.value)}
                className={inputClass}
              >
                {!isLeader && <option value="">Geral (sem setor)</option>}
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Responsável Principal *</label>
              <select
                required
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className={inputClass}
              >
                <option value="">{peoplePlaceholder}</option>
                {sectorPeople.map((a) => (
                  <option key={a.id} value={a.id}>
                    {personLabel(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data de Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prazo Previsto (Conclusão)</label>
              <input
                type="date"
                value={dueDate}
                min={startDate || undefined}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{isEditing ? 'Status' : 'Status Inicial'}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className={inputClass}
              >
                <option value="Não iniciado">Não iniciado</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Aguardando">Aguardando</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Observações Gerais</label>
              <input
                type="text"
                placeholder="Notas adicionais"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Etapas: só ao criar. Depois, elas são editadas no quadro do projeto. */}
          {isEditing ? (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              As etapas são editadas no quadro do projeto: clique no projeto e depois na etapa.
            </p>
          ) : (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className={labelClass}>Etapas *</label>

              <div className="grid grid-cols-3 gap-2">
                {STAGE_OPTIONS.map((opt) => {
                  const active = stageCount === opt.count;
                  return (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => changeStageCount(opt.count)}
                      className={`text-left rounded-xl border px-3.5 py-2.5 cursor-pointer transition-all ${
                        active
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                      <span className="block text-xs text-slate-500">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-[auto_1fr_9.5rem_11rem] gap-2 items-center"
                  >
                    <span className="hidden sm:flex w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={stageCount === 1 ? 'Título da etapa' : `Etapa ${index + 1}`}
                      value={stage.title}
                      onChange={(e) => updateStageField(index, 'title', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="date"
                      required
                      title="Prazo da etapa"
                      value={stage.dueDate}
                      min={startDate || undefined}
                      max={dueDate || undefined}
                      onChange={(e) => updateStageField(index, 'dueDate', e.target.value)}
                      className={inputClass}
                    />
                    <select
                      required
                      value={stage.responsibleId}
                      onChange={(e) => updateStageField(index, 'responsibleId', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{loadingAssignees ? 'Carregando...' : 'Responsável'}</option>
                      {sectorPeople.map((a) => (
                        <option key={a.id} value={a.id}>
                          {personLabel(a)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {saveError && <p className="text-sm text-rose-600">{saveError.message}</p>}

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
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};