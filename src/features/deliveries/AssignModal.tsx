import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSectors } from '../sectors/useSectors';
import { useAssignees, useCreateDelivery } from './useDeliveries';
import { useCreateRecurrence } from './useRecurrences';
import { canAssignDeliveries } from '../../lib/permissions';
import { todayISO } from './deliverySituation';
import { RecurrenceFields, leadDaysFor, type RuleState } from './RecurrenceFields';
import type { Frequency } from '../../services/recurrenceService';

type RepeatMode = 'NONE' | Frequency;

const REPEAT_OPTIONS: { value: RepeatMode; label: string; hint: string }[] = [
  { value: 'NONE', label: 'Não repete', hint: 'entrega única' },
  { value: 'DAILY', label: 'Diária', hint: 'dias úteis' },
  { value: 'WEEKLY', label: 'Semanal', hint: 'um dia da semana' },
  { value: 'MONTHLY', label: 'Mensal', hint: 'um dia do mês' },
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
  const createDelivery = useCreateDelivery();
  const createRecurrence = useCreateRecurrence();

  // LIDER: o setor é sempre o dele
  const [sectorId, setSectorId] = useState(isAdmin ? '' : user?.sectorId ?? '');
  const { data: assignees = [], isLoading: loadingAssignees } = useAssignees(sectorId, Boolean(sectorId));

  const [assignedToId, setAssignedToId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Repetição
  const [repeat, setRepeat] = useState<RepeatMode>('NONE');
  const [rule, setRule] = useState<RuleState>({
    frequency: 'WEEKLY',
    weekday: 5, // sexta
    monthDay: 5,
    startDate: todayISO(),
  });

  if (!canAssignDeliveries(user?.role)) return null;

  const isRecurring = repeat !== 'NONE';
  const isSaving = createDelivery.isPending || createRecurrence.isPending;
  const saveError = isRecurring ? createRecurrence.error : createDelivery.error;

  const handleSectorChange = (id: string) => {
    setSectorId(id);
    setAssignedToId(''); // a pessoa depende do setor
  };

  const changeRepeat = (mode: RepeatMode) => {
    setRepeat(mode);
    if (mode !== 'NONE') setRule((prev) => ({ ...prev, frequency: mode }));
  };

  const done = () => {
    onClose();
    onCreated?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isRecurring) {
      // Entrega única: sempre "feita / não feita" (etapa única)
      createDelivery.mutate({ title, description, sectorId, assignedToId, dueDate }, { onSuccess: done });
      return;
    }

    // Rotina: sem data de término, repete até ser pausada
    createRecurrence.mutate(
      {
        title,
        description,
        sectorId,
        assignedToId,
        frequency: rule.frequency,
        weekday: rule.weekday,
        monthDay: rule.monthDay,
        leadDays: leadDaysFor(rule), // calculado: início da semana / do mês
        startDate: rule.startDate,
      },
      { onSuccess: done },
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Atribuir Entrega</h2>
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
              placeholder={isRecurring ? 'Ex: Relatório semanal de vendas' : 'Ex: Relatório de vendas de novembro'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

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

          {/* Repetir */}
          <fieldset>
            <legend className={labelClass}>Repetir *</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeRepeat(opt.value)}
                  aria-pressed={repeat === opt.value}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    repeat === opt.value
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

          {/* Entrega única: um prazo. Rotina: as regras de repetição */}
          {isRecurring ? (
            <RecurrenceFields value={rule} onChange={(changes) => setRule((prev) => ({ ...prev, ...changes }))} />
          ) : (
            <div className="sm:w-1/2">
              <label className={labelClass}>Prazo *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
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
              {isSaving ? 'Salvando...' : isRecurring ? 'Criar rotina' : 'Atribuir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};