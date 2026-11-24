import React, { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2, Undo2, Hourglass, type LucideIcon } from 'lucide-react';
import type { ReviewStatus, Submission } from '../../types';
import type { SubmissionTarget } from '../../services/deliveryService';
import { useEvidenceFile, useSubmissions } from './useDeliveries';

// Só abre links http(s) (proteção contra endereços maliciosos)
const isSafeLink = (link: string) => /^https?:\/\//i.test(link);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Print: baixado com a sessão do usuário e mostrado como miniatura
const EvidenceImage: React.FC<{ fileId: string }> = ({ fileId }) => {
  const { data: blob, isLoading, isError } = useEvidenceFile(fileId);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (isLoading) return <div className="w-24 h-24 rounded-lg bg-slate-100 animate-pulse" />;
  if (isError || !url) {
    return (
      <div className="w-24 h-24 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400">
        Indisponível
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir print">
      <img src={url} alt="Print da evidência" className="w-24 h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90" />
    </a>
  );
};

export const SubmissionEvidence: React.FC<{ submission: Submission }> = ({ submission }) => {
  const links = submission.links.filter(isSafeLink);
  if (links.length === 0 && submission.files.length === 0) return null;

  return (
    <div className="space-y-2">
      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1.5 text-sm text-blue-700 hover:underline break-all"
              >
                <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
                {link}
              </a>
            </li>
          ))}
        </ul>
      )}
      {submission.files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {submission.files.map((f) => (
            <EvidenceImage key={f.id} fileId={f.id} />
          ))}
        </div>
      )}
    </div>
  );
};

const STATUS_STYLES: Record<ReviewStatus, { label: string; className: string; Icon: LucideIcon }> = {
  pending: { label: 'Aguardando validação', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', Icon: Hourglass },
  approved: { label: 'Aprovado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  returned: { label: 'Devolvido para correção', className: 'bg-rose-50 text-rose-700 border-rose-200', Icon: Undo2 },
};

export const SubmissionStatusBadge: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.className}`}>
      <style.Icon className="w-3.5 h-3.5" />
      {style.label}
    </span>
  );
};

// Histórico de envios (nos Detalhes da entrega): o mais recente primeiro
export const SubmissionHistory: React.FC<{ target: SubmissionTarget }> = ({ target }) => {
  const { data: submissions = [], isLoading, isError, error } = useSubmissions(target);

  return (
    <section>
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Envios para validação</h4>

      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {isError && <p className="text-sm text-rose-600">{error.message}</p>}
      {!isLoading && !isError && submissions.length === 0 && <p className="text-sm text-slate-500">Nenhum envio ainda.</p>}

      <ol className="space-y-4">
        {submissions.map((s) => (
          <li
            key={s.id}
            className={`border rounded-xl p-3 space-y-2 ${s.status === 'returned' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'}`}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <SubmissionStatusBadge status={s.status} />
              <span>
                Enviado em {formatDateTime(s.createdAt)} · {s.authorName}
              </span>
              {s.stageCount && s.stageCount > 1 && s.stageTitle && (
                <span className="font-semibold text-slate-700">
                  Etapa {s.stagePosition}: {s.stageTitle}
                </span>
              )}
            </div>

            {s.status === 'returned' && (
              <p className="text-sm text-rose-800 bg-white border border-rose-200 rounded-lg px-3 py-2">
                <strong>Motivo da devolução:</strong> {s.reviewNote}
                <span className="block text-xs text-rose-600 mt-0.5">
                  {s.reviewerName}
                  {s.reviewedAt && ` · ${formatDateTime(s.reviewedAt)}`}
                </span>
              </p>
            )}

            <p className="text-sm text-slate-800">
              <span className="font-semibold">Feito:</span> {s.doneText}
            </p>
            {s.missingText && (
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Faltou:</span> {s.missingText}
              </p>
            )}
            <SubmissionEvidence submission={s} />

            {s.status === 'approved' && s.reviewerName && (
              <p className="text-xs text-emerald-700">
                Aprovado por {s.reviewerName}
                {s.reviewedAt && ` em ${formatDateTime(s.reviewedAt)}`}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};