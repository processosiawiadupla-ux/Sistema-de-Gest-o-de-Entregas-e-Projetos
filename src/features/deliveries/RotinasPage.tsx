import React, { useState } from 'react';
import { Repeat, Pause, Play, Pencil, Trash2, User, CalendarClock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSectors } from '../sectors/useSectors';
import { useAssignees } from './useDeliveries';
import {
  useRecurrences,
  useUpdateRecurrence,
  useSetRecurrenceActive,
  useDeleteRecurrence,
} from './useRecurrences';
import { RecurrenceFields, describeRule, leadDaysFor, type RuleState } from './RecurrenceFields';
import { todayISO } from './deliverySituation';
import type { Recurrence } from '../../services/recurrenceService';
import { formatDate } from '../../lib/format';

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

export const RotinasPage: React.FC = () => {
  const { data: recurrences = [], isLoading, isError, error, refetch } = useRecurrences();
  const setActive = useSetRecurrenceActive();
  const remove = useDeleteRecurrence();
  const [editing, setEditing] = useState<Recurrence | null>(null);

  const handleDelete = (r: Recurrence) => {
    const ok = window.confirm(
      `Excluir a rotina "${r.title}"?\n\nNenhuma entrega nova será criada. As ${r.deliveriesCount} entrega(s) já criadas continuam existindo.`,
    );
    if (ok) remove.mutate(r.id, { onError: (err) => window.alert(err.message) });
  };

  const active = recurrences.filter((r) => r.active);
  const paused = recurrences.filter((r) => !r.active);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Repeat className="w-7 h-7 text-blue-600" />
        Rotinas
      </h1>

      {isLoading && <p className="text-sm text-slate-500">Carregando rotinas...</p>}

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

      {!isLoading && !isError && recurrences.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-6">
          Nenhuma rotina cadastrada.
        </p>
      )}

      {[
        { title: 'Ativas', items: active },
        { title: 'Pausadas', items: paused },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.title} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {group.title} ({group.items.length})
            </h2>

            {group.items.map((r) => {
              const busy =
                (setActive.isPending && setActive.variables?.id === r.id) ||
                (remove.isPending && remove.variables === r.id);

              return (
                <article
                  key={r.id}
                  className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${
                    r.active ? '' : 'opacity-70'
                  } ${busy ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <h3 className="font-bold text-slate-900">{r.title}</h3>
                      <p className="text-sm text-slate-700">{describeRule(r)}</p>
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {r.assignedToName} · {r.sectorName}
                        </span>
                        {r.active && r.nextDueDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="w-3.5 h-3.5" />
                            Próximo prazo: {formatDate(r.nextDueDate)}
                          </span>
                        )}
                        <span>{r.deliveriesCount} entrega(s) criada(s)</span>
                      </p>
                      {!r.assigneeActive && (
                        <p className="text-xs text-amber-700 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Responsável desativado: troque a pessoa para voltar a criar entregas.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setActive.mutate(
                            { id: r.id, active: !r.active },
                            { onError: (err) => window.alert(err.message) },
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        {r.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {r.active ? 'Pausar' : 'Reativar'}
                      </button>
                      <button
                        onClick={() => setEditing(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ))}

      {editing && <RecurrenceEditModal recurrence={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

// ---------- Editar rotina ----------

const RecurrenceEditModal: React.FC<{ recurrence: Recurrence; onClose: () => void }> = ({ recurrence, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: sectors = [] } = useSectors();
  const update = useUpdateRecurrence();

  // Rotina que já começou: a data de início fica travada
  const startLocked = recurrence.startDate <= todayISO();

  const [sectorId, setSectorId] = useState(recurrence.sectorId);
  const { data: assignees = [], isLoading: loadingAssignees } = useAssignees(sectorId, Boolean(sectorId));
  const [assignedToId, setAssignedToId] = useState(recurrence.assignedToId);
  const [title, setTitle] = useState(recurrence.title);
  const [description, setDescription] = useState(recurrence.description);
  const [rule, setRule] = useState<RuleState>({
    frequency: recurrence.frequency,
    weekday: recurrence.weekday ?? 5,
    monthDay: recurrence.monthDay ?? 5,
    startDate: recurrence.startDate,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        id: recurrence.id,
        input: {
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
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Editar rotina</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Setor *</label>
              <select
                required
                value={sectorId}
                onChange={(e) => {
                  setSectorId(e.target.value);
                  setAssignedToId('');
                }}
                disabled={!isAdmin}
                className={inputClass}
              >
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
                disabled={loadingAssignees}
                className={inputClass}
              >
                <option value="" disabled>
                  {loadingAssignees ? 'Carregando...' : 'Selecione a pessoa'}
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
            <label className={labelClass}>Título *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <RecurrenceFields
            showFrequency
            startLocked={startLocked}
            value={rule}
            onChange={(changes) => setRule((prev) => ({ ...prev, ...changes }))}
          />

          {update.isError && <p className="text-sm text-rose-600">{update.error.message}</p>}

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
              disabled={update.isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60"
            >
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};