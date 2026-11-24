import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle2, Undo2, User, Building, Calendar, Send, FolderKanban } from 'lucide-react';
import type { Submission } from '../../types';
import { usePendingReviews, useApproveSubmission, useReturnSubmission } from './useDeliveries';
import { SubmissionEvidence } from './SubmissionView';
import { formatDate } from '../../lib/format';

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const localDay = (iso: string) => new Date(iso).toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local

export const ValidarPage: React.FC = () => {
  const { data: items = [], isLoading, isError, error, refetch } = usePendingReviews();

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <ClipboardCheck className="w-7 h-7 text-blue-600" />
        Validar
        {items.length > 0 && (
          <span className="ml-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-sm">{items.length}</span>
        )}
      </h1>

      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

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

      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-8 text-center">
          Nada para validar. 🎉
        </p>
      )}

      <ul className="space-y-4">
        {items.map((s) => (
          <ReviewCard key={s.id} submission={s} />
        ))}
      </ul>
    </div>
  );
};

const ReviewCard: React.FC<{ submission: Submission }> = ({ submission: s }) => {
  const approve = useApproveSubmission();
  const giveBack = useReturnSubmission();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');

  const waiting = daysSince(s.createdAt);
  const sentLate = localDay(s.createdAt) > s.dueDate;
  const busy = approve.isPending || giveBack.isPending;
  const actionError = approve.error ?? giveBack.error;

  return (
    <li className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3 ${busy ? 'opacity-60' : ''}`}>
      <div className="space-y-1">
        <h3 className="font-bold text-slate-900">{s.itemTitle}</h3>
        {s.projectName && (
          <p className="text-xs text-violet-700 font-medium inline-flex items-center gap-1">
            <FolderKanban className="w-3.5 h-3.5" />
            Projeto: {s.projectName}
          </p>
        )}
        {!s.projectName && s.stageCount && s.stageCount > 1 && s.stageTitle && (
          <p className="text-xs font-semibold text-slate-700">
            Etapa {s.stagePosition} de {s.stageCount}: {s.stageTitle}
          </p>
        )}
        <p className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {s.authorName}
          </span>
          {s.sectorName && (
            <span className="inline-flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              {s.sectorName}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Prazo {formatDate(s.dueDate)}
          </span>
          <span className={`inline-flex items-center gap-1 ${waiting >= 2 ? 'text-amber-700 font-semibold' : ''}`}>
            <Send className="w-3.5 h-3.5" />
            Enviado em {new Date(s.createdAt).toLocaleDateString('pt-BR')}
            {waiting > 0 && ` · esperando há ${waiting} dia(s)`}
          </span>
          {sentLate && <span className="text-rose-600 font-semibold">enviado após o prazo</span>}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-slate-800">
          <span className="font-semibold">Feito:</span> {s.doneText}
        </p>
        {s.missingText && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Faltou:</span> {s.missingText}
          </p>
        )}
      </div>

      <SubmissionEvidence submission={s} />

      {returning ? (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Motivo da devolução *</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="O que precisa ser corrigido ou complementado?"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setReturning(false);
                setNote('');
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || note.trim().length < 3}
              onClick={() => giveBack.mutate({ id: s.id, note: note.trim() })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Confirmar devolução
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={busy}
            onClick={() => setReturning(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Devolver
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => approve.mutate(s.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprovar
          </button>
        </div>
      )}

      {actionError && <p className="text-sm text-rose-600">{actionError.message}</p>}
    </li>
  );
};