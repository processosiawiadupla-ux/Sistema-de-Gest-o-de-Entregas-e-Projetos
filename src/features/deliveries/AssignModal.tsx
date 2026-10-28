import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSectors } from '../sectors/useSectors';
import { useAssignees, useCreateDelivery } from './useDeliveries';
import { canAssignDeliveries } from '../../lib/permissions';
import type { StageInput } from '../../services/deliveryService';

type StageMode = 1 | 5 | 10;

const STAGE_OPTIONS: { value: StageMode; label: string; hint: string }[] = [
  { value: 1, label: 'Etapa única', hint: 'concluída = 100%' },
  { value: 5, label: '5 etapas', hint: '20% cada' },
  { value: 10, label: '10 etapas', hint: '10% cada' },
];

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

interface AssignModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: sectors = [] } = useSectors();
  const create = useCreateDelivery();

  // LIDER: o setor é sempre o dele
  const [sectorId, setSectorId] = useState(isAdmin ? '' : user?.sectorId ?? '');
  const { data: assignees = [], isLoading: loadingAssignees } = useAssignees(sectorId, Boolean(sectorId));

  const [assignedToId, setAssignedToId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [stageMode, setStageMode] = useState<StageMode>(1);
  const [stages, setStages] = useState<StageInput[]>([]);

  if (!canAssignDeliveries(user?.role)) return null;

  const handleSectorChange = (id: string) => {
    setSectorId(id);
    setAssignedToId(''); // a pessoa depende do setor
  };

  // Troca a quantidade de etapas, mantendo o que já foi preenchido
  const changeMode = (mode: StageMode) => {
    setStageMode(mode);
    setStages(mode === 1 ? [] : Array.from({ length: mode }, (_, i) => stages[i] ?? { title: '', dueDate: '' }));
  };

  const updateStage = (index: number, field: keyof StageInput, value: string) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        title,
        description,
        sectorId,
        assignedToId,
        dueDate,
        stages: stageMode === 1 ? undefined : stages,
      },
      {
        onSuccess: () => {
          onClose();
          onCreated?.();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Atribuir Entrega</h2>
            <p className="text-xs text-slate-500">Crie uma entrega e defina quem será responsável por ela.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Setor → pessoa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Setor *</label>
              <select
                required
                value={sectorId}
                onChange={(e) => handleSectorChange(e.target.value)}
                disabled={!isAdmin}
                className={inputClass}
              >
                <option value="" disabled>
                  Selecione o setor
                </option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Responsável *</label>
              <select
                required
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                disabled={!sectorId || loadingAssignees}
                className={inputClass}
              >
                <option value="" disabled>
                  {!sectorId ? 'Escolha o setor primeiro' : loadingAssignees ? 'Carregando...' : 'Selecione a pessoa'}
                </option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Título da entrega *</label>
            <input
              type="text"
              required
              placeholder="Ex: Relatório mensal de vendas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Descrição</label>
              <input
                type="text"
                placeholder="Detalhes do que precisa ser entregue"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prazo final *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Quantidade de etapas */}
          <fieldset>
            <legend className={labelClass}>Etapas *</legend>
            <div className="grid grid-cols-3 gap-2">
              {STAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeMode(opt.value)}
                  aria-pressed={stageMode === opt.value}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    stageMode === opt.value
                      ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Título e prazo de cada etapa */}
          {stageMode > 1 && (
            <ol className="space-y-2">
              {stages.map((stage, index) => (
                <li key={index} className="grid grid-cols-[2rem_1fr_10rem] items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500 text-center">{index + 1}</span>
                  <input
                    type="text"
                    required
                    placeholder={`Etapa ${index + 1}`}
                    value={stage.title}
                    onChange={(e) => updateStage(index, 'title', e.target.value)}
                    className={inputClass}
                    aria-label={`Título da etapa ${index + 1}`}
                  />
                  <input
                    type="date"
                    required
                    max={dueDate || undefined}
                    value={stage.dueDate}
                    onChange={(e) => updateStage(index, 'dueDate', e.target.value)}
                    className={inputClass}
                    aria-label={`Prazo da etapa ${index + 1}`}
                  />
                </li>
              ))}
            </ol>
          )}

          {create.isError && <p className="text-sm text-rose-600">{create.error.message}</p>}

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
              disabled={create.isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {create.isPending ? 'Salvando...' : 'Atribuir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};