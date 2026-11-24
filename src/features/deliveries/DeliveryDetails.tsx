import React from 'react';
import { CheckCircle2, Circle, RotateCcw, FolderKanban, Hourglass, Undo2 } from 'lucide-react';
import type { Delivery } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  useDeliveryUpdates,
  useReopenStage,
  useProjectTaskNotes,
  useReopenProjectTask,
} from './useDeliveries';
import { todayISO } from './deliverySituation';
import { formatDate } from '../../lib/format';
import { SubmissionHistory } from './SubmissionView';

// Escolhe o detalhe certo: entrega comum ou etapa de projeto
export const DeliveryDetails: React.FC<{ delivery: Delivery }> = ({ delivery }) =>
  delivery.kind === 'project_stage' && delivery.projectId ? (
    <ProjectTaskDetails delivery={delivery} projectId={delivery.projectId} />
  ) : (
    <RegularDeliveryDetails delivery={delivery} />
  );

// ---------- Entrega comum ----------

const RegularDeliveryDetails: React.FC<{ delivery: Delivery }> = ({ delivery }) => {
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Etapas */}
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            {delivery.stageCount === 1 ? 'Etapa única' : `Etapas (${delivery.stageCount})`}
          </h4>

          {delivery.description && <p className="text-sm text-slate-600 mb-3">{delivery.description}</p>}

          <ol className="space-y-2.5">
            {delivery.stages.map((stage) => {
              const inReview = !stage.completed && stage.reviewStatus === 'pending';
              const returned = !stage.completed && stage.reviewStatus === 'returned';
              const late = !stage.completed && !inReview && stage.dueDate < today;

              return (
                <li key={stage.id} className="flex items-start gap-3 text-sm">
                  {stage.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : inReview ? (
                    <Hourglass className="w-5 h-5 text-indigo-500 shrink-0" />
                  ) : returned ? (
                    <Undo2 className="w-5 h-5 text-rose-600 shrink-0" />
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
                      {inReview && ' · aguardando validação'}
                      {stage.completedAt && ` · concluída em ${new Date(stage.completedAt).toLocaleDateString('pt-BR')}`}
                    </p>
                    {returned && stage.reviewNote && (
                      <p className="text-xs text-rose-700 font-medium mt-0.5">Devolvida para correção: {stage.reviewNote}</p>
                    )}
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

        {/* Histórico de lançamentos aprovados */}
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Lançamentos aprovados</h4>

          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

          {!isLoading && updates.length === 0 && <p className="text-sm text-slate-500">Nenhum lançamento aprovado ainda.</p>}

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

      {/* Todos os envios: pendentes, devolvidos (com o motivo) e aprovados */}
      <SubmissionHistory target={{ deliveryId: delivery.id }} />
    </div>
  );
};

// ---------- Etapa de projeto ----------

const ProjectTaskDetails: React.FC<{ delivery: Delivery; projectId: string }> = ({ delivery, projectId }) => {
  const { user } = useAuth();
  const { data: notes = [], isLoading } = useProjectTaskNotes(projectId, delivery.id);
  const reopen = useReopenProjectTask();
  const today = todayISO();
  const returned = Boolean(delivery.returnedNote);
  const late = !delivery.completed && !delivery.inReview && delivery.dueDate < today;

  // O backend também libera o líder do projeto; aqui o botão aparece para ADMIN e LIDER do setor
  const canReopen =
    user?.role === 'ADMIN' || (user?.role === 'LIDER' && user.sectorId === delivery.sectorId);

  const handleReopen = () => {
    if (!window.confirm(`Reabrir a etapa "${delivery.title}"?\n\nEla volta para "Em andamento" no quadro.`)) return;
    reopen.mutate(delivery.id, { onError: (err) => window.alert(err.message) });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Etapa de projeto</h4>

          <div className="flex items-start gap-3 text-sm">
            {delivery.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : delivery.inReview ? (
              <Hourglass className="w-5 h-5 text-indigo-500 shrink-0" />
            ) : returned ? (
              <Undo2 className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300 shrink-0" />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <p className={delivery.completed ? 'text-slate-500 line-through' : 'text-slate-900 font-medium'}>
                {delivery.title}
              </p>
              <p className="text-xs text-violet-700 inline-flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5" />
                {delivery.projectName}
                {delivery.assignedByName && ` · líder: ${delivery.assignedByName}`}
              </p>
              <p className={`text-xs ${late ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                Prazo {formatDate(delivery.dueDate)}
                {late && ' · atrasada'}
                {delivery.inReview && ' · aguardando validação'}
                {delivery.completedAt &&
                  ` · concluída em ${new Date(delivery.completedAt).toLocaleDateString('pt-BR')}`}
              </p>
              {returned && (
                <p className="text-xs text-rose-700 font-medium">Devolvida para correção: {delivery.returnedNote}</p>
              )}
            </div>
            {delivery.completed && canReopen && (
              <button
                onClick={handleReopen}
                disabled={reopen.isPending}
                title="Reabrir etapa"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-amber-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reabrir
              </button>
            )}
          </div>
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Observações</h4>

          {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

          {!isLoading && notes.length === 0 && <p className="text-sm text-slate-500">Nenhuma observação ainda.</p>}

          {notes.length > 0 && (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-violet-600 border-2 border-white" />
                  <p className="text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {' · '}
                    {n.authorName}
                  </p>
                  <p className="text-sm text-slate-800 mt-1 whitespace-pre-line">{n.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Todos os envios: pendentes, devolvidos (com o motivo) e aprovados */}
      <SubmissionHistory target={{ projectStageId: delivery.id }} />
    </div>
  );
};