import React from 'react';
import { CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import type { Delivery } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDeliveryUpdates, useReopenStage } from './useDeliveries';
import { todayISO } from './deliverySituation';
import { formatDate } from '../../lib/format';

// Etapas e histórico de lançamentos de uma entrega
export const DeliveryDetails: React.FC<{ delivery: Delivery }> = ({ delivery }) => {
  const { user } = useAuth();
  const { data: updates = [], isLoading } = useDeliveryUpdates(delivery.id);
  const reopen = useReopenStage();
  const today = todayISO();

  // Só o LIDER do setor e o ADMIN reabrem etapas
  const canReopen =
    user?.role === 'ADMIN' || (user?.role === 'LIDER' && user.sectorId === delivery.sectorId);

  const handleReopen = (stageId: string, title: string) => {
    if (!window.confirm(`Reabrir a etapa "${title}"?\n\nO percentual da entrega vai diminuir.`)) return;
    reopen.mutate({ id: delivery.id, stageId }, { onError: (err) => window.alert(err.message) });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Etapas */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {delivery.stageCount === 1 ? 'Etapa única' : `Etapas (${delivery.stageCount})`}
        </h4>

        {delivery.description && <p className="text-sm text-slate-600 mb-3">{delivery.description}</p>}

        <ol className="space-y-2.5">
          {delivery.stages.map((stage) => {
            const late = !stage.completed && stage.dueDate < today;

            return (
              <li key={stage.id} className="flex items-start gap-3 text-sm">
                {stage.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={stage.completed ? 'text-slate-500 line-through' : 'text-slate-900 font-medium'}>
                    {stage.position}. {stage.title}
                  </p>
                  <p className={`text-xs ${late ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                    Prazo {formatDate(stage.dueDate)}
                    {late && ' · atrasada'}
                    {stage.completedAt && ` · concluída em ${new Date(stage.completedAt).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                {stage.completed && canReopen && (
                  <button
                    onClick={() => handleReopen(stage.id, stage.title)}
                    disabled={reopen.isPending}
                    title="Reabrir etapa"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-amber-600 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reabrir
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Histórico */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Histórico de lançamentos</h4>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

        {!isLoading && updates.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum lançamento ainda.</p>
        )}

        {updates.length > 0 && (
          <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {updates.map((u) => (
              <li key={u.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                <p className="text-xs text-slate-500">
                  {new Date(u.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  {' · '}
                  {u.authorName}
                  {' · '}
                  <strong className="text-slate-700">{u.progress}%</strong>
                </p>
                {u.stageTitle && (
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Etapa {u.stagePosition}: {u.stageTitle}
                  </p>
                )}
                <p className="text-sm text-slate-800 mt-1">
                  <span className="font-semibold">Feito:</span> {u.doneText}
                </p>
                {u.missingText && (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Faltou:</span> {u.missingText}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};