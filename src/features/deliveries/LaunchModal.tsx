import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSectors } from '../sectors/useSectors';
import { useDeliveries, useLaunchStage, useCreateLaunchedDelivery } from './useDeliveries';
import { todayISO } from './deliverySituation';
import { formatDate } from '../../lib/format';
import { ProgressBar } from './ProgressBar';

const OTHER = '__other__';

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

interface LaunchModalProps {
  onClose: () => void;
  onLaunched?: () => void;
  initialDeliveryId?: string;
}

export const LaunchModal: React.FC<LaunchModalProps> = ({ onClose, onLaunched, initialDeliveryId }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: myDeliveries = [], isLoading } = useDeliveries('mine');
  const { data: sectors = [] } = useSectors();
  const launch = useLaunchStage();
  const createLaunched = useCreateLaunchedDelivery();

  const [deliveryId, setDeliveryId] = useState(initialDeliveryId ?? '');
  const [stageId, setStageId] = useState('');
  const [doneText, setDoneText] = useState('');
  const [missingText, setMissingText] = useState('');
  const [otherTitle, setOtherTitle] = useState('');
  const [otherSectorId, setOtherSectorId] = useState(user?.sectorId ?? '');

  // Só as atividades minhas que ainda não foram concluídas
  const pending = myDeliveries.filter((d) => !d.completed);
  const isOther = deliveryId === OTHER;
  const selected = pending.find((d) => d.id === deliveryId);
  const pendingStages = selected?.stages.filter((s) => !s.completed) ?? [];
  const isSingle = selected?.stageCount === 1;

  // Na etapa única, a etapa é escolhida automaticamente
  const effectiveStageId = isSingle ? pendingStages[0]?.id ?? '' : stageId;
  const nextProgress = selected ? Math.min(100, selected.progress + Math.round(100 / selected.stageCount)) : 0;

  const isSaving = launch.isPending || createLaunched.isPending;
  const saveError = launch.error ?? createLaunched.error;

  const handleSelectDelivery = (id: string) => {
    setDeliveryId(id);
    setStageId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const note = { doneText, missingText };
    const onSuccess = () => {
      onClose();
      onLaunched?.();
    };

    if (isOther) {
      createLaunched.mutate(
        { input: { title: otherTitle, sectorId: otherSectorId, dueDate: todayISO() }, note },
        { onSuccess }
      );
      return;
    }

    launch.mutate({ id: deliveryId, input: { stageId: effectiveStageId, ...note } }, { onSuccess });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lançar Entrega</h2>
            <p className="text-xs text-slate-500">Registre a conclusão de uma etapa das suas atividades.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Atividade */}
          <div>
            <label className={labelClass}>Atividade *</label>
            <select
              required
              value={deliveryId}
              onChange={(e) => handleSelectDelivery(e.target.value)}
              disabled={isLoading}
              className={inputClass}
            >
              <option value="" disabled>
                {isLoading ? 'Carregando suas atividades...' : 'Selecione a atividade'}
              </option>
              {pending.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} · {d.progress}% · prazo {formatDate(d.dueDate)}
                </option>
              ))}
              <option value={OTHER}>+ Outra atividade (não atribuída)</option>
            </select>
            {!isLoading && pending.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">Você não tem atividades pendentes atribuídas.</p>
            )}
          </div>

          {/* Atividade não atribuída */}
          {isOther && (
            <>
              <div>
                <label className={labelClass}>Título da atividade *</label>
                <input
                  type="text"
                  required
                  placeholder="O que você entregou?"
                  value={otherTitle}
                  onChange={(e) => setOtherTitle(e.target.value)}
                  className={inputClass}
                />
              </div>
              {isAdmin && (
                <div>
                  <label className={labelClass}>Setor *</label>
                  <select
                    required
                    value={otherSectorId}
                    onChange={(e) => setOtherSectorId(e.target.value)}
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
              )}
            </>
          )}

          {/* Etapa */}
          {selected && (
            <div className="space-y-2">
              {isSingle ? (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  Etapa única: ao registrar, a atividade fica <strong>concluída (100%)</strong>.
                </p>
              ) : (
                <div>
                  <label className={labelClass}>Etapa concluída *</label>
                  <select
                    required
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Selecione a etapa
                    </option>
                    {pendingStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.position}. {s.title} · prazo {formatDate(s.dueDate)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Progresso: {selected.progress}% → <strong className="text-slate-700">{nextProgress}%</strong>
                </p>
                <ProgressBar value={nextProgress} />
              </div>
            </div>
          )}

          {/* O que foi feito / o que faltou */}
          {(selected || isOther) && (
            <>
              <div>
                <label className={labelClass}>O que foi feito *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva o que foi entregue nesta etapa"
                  value={doneText}
                  onChange={(e) => setDoneText(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>O que faltou (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Pendências ou observações"
                  value={missingText}
                  onChange={(e) => setMissingText(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
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
              disabled={isSaving || (!selected && !isOther)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Registrando...' : 'Registrar entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};