import React, { useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import type { TeamMember, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSectors } from '../sectors/useSectors';
import { useUpdateMember, useSendPasswordReset, useInviteMember } from './useTeam';

const CONFIRM_WORD = 'DESATIVAR';
const EMAIL_DOMAIN = 'wiadupla.com';

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'COLABORADOR', label: 'Colaborador' },
  { value: 'LIDER', label: 'Líder' },
  { value: 'ADMIN', label: 'Administrador' },
];

export const EditMemberModal: React.FC<{ member: TeamMember; onClose: () => void }> = ({ member, onClose }) => {
  const { user } = useAuth();
  const { data: sectors = [] } = useSectors();
  const update = useUpdateMember();
  const sendReset = useSendPasswordReset();
  const resendInvite = useInviteMember();

  const isSelf = member.id === user?.id;
  const isPending = member.status === 'PENDENTE';

  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState<UserRole>(member.role);
  const [sectorId, setSectorId] = useState(member.sectorId ?? '');
  const [active, setActive] = useState(member.status !== 'INATIVO');
  const [confirmText, setConfirmText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const needsSector = role !== 'ADMIN';
  const deactivating = member.status !== 'INATIVO' && !active;
  const confirmOk = !deactivating || confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const normalizedEmail = email.trim().toLowerCase();
  const emailChanged = normalizedEmail !== member.email;
  const emailOutsideDomain = normalizedEmail.length > 0 && !normalizedEmail.endsWith(`@${EMAIL_DOMAIN}`);

  const isSaving = update.isPending || resendInvite.isPending;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmOk || emailOutsideDomain) return;

    update.mutate(
      {
        id: member.id,
        input: {
          name,
          email: normalizedEmail,
          role,
          sectorId: needsSector ? sectorId : null,
          status: isPending && active ? undefined : active ? 'ATIVO' : 'INATIVO',
        },
      },
      {
        onSuccess: (updated) => {
          // Convite pendente com e-mail novo: reenvia para o endereço certo
          if (isPending && emailChanged && updated.status === 'PENDENTE') {
            resendInvite.mutate(
              { name: updated.name, email: updated.email, role: updated.role, sectorId: updated.sectorId },
              { onSuccess: onClose }
            );
            return;
          }
          onClose();
        },
      }
    );
  };

  const handleReset = () => {
    setNotice(null);
    sendReset.mutate(member.id, { onSuccess: setNotice });
  };

  const handleResendInvite = () => {
    setNotice(null);
    resendInvite.mutate(
      { name: member.name, email: member.email, role: member.role, sectorId: member.sectorId },
      { onSuccess: setNotice }
    );
  };

  const saveError = update.error ?? (isSaving ? null : resendInvite.error);
  const actionError = sendReset.error ?? (update.isSuccess ? null : resendInvite.error);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Gerenciar membro</h2>
            <p className="text-xs text-slate-500 truncate">{member.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelClass}>Nome completo *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>E-mail institucional *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            {emailOutsideDomain && <p className="text-xs mt-1 text-rose-600">Use um e-mail @{EMAIL_DOMAIN}.</p>}
            {emailChanged && !emailOutsideDomain && (
              <p className="text-xs mt-1 text-amber-700">
                {isPending
                  ? 'Ao salvar, o convite será reenviado para o e-mail novo, e o link antigo deixará de valer.'
                  : 'A pessoa passará a entrar com o e-mail novo. Links de senha pendentes deixarão de valer.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Papel *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSelf}
                className={inputClass}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Setor {needsSector && '*'}</label>
              <select
                required={needsSector}
                value={needsSector ? sectorId : ''}
                onChange={(e) => setSectorId(e.target.value)}
                disabled={!needsSector}
                className={inputClass}
              >
                <option value="">{needsSector ? 'Selecione o setor' : 'Sem setor (administrador)'}</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Acesso ao sistema */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Acesso ao sistema</p>
              <p className="text-xs text-slate-500">
                {isPending
                  ? 'Convite ainda não aceito.'
                  : active
                    ? 'A pessoa consegue entrar no Wiaflow.'
                    : 'Acesso bloqueado. O histórico é mantido.'}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => {
                  setActive(e.target.checked);
                  setConfirmText('');
                }}
                disabled={isSelf}
                className="w-4 h-4 accent-blue-600"
              />
              {active ? 'Ativo' : 'Inativo'}
            </label>
          </div>

          {isSelf && (
            <p className="text-xs text-slate-500">Você não pode alterar o seu próprio papel ou acesso.</p>
          )}

          {/* Confirmação de ação crítica */}
          {deactivating && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
              <p className="text-sm text-rose-700">
                {member.name} perderá o acesso imediatamente. Para confirmar, digite <strong>{CONFIRM_WORD}</strong>.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                aria-label={`Digite ${CONFIRM_WORD} para confirmar`}
                className={inputClass}
              />
            </div>
          )}

          {saveError && <p className="text-sm text-rose-600">{saveError.message}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !confirmOk || emailOutsideDomain}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                deactivating ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isSaving ? 'Salvando...' : deactivating ? 'Desativar e salvar' : 'Salvar alterações'}
            </button>
          </div>
        </form>

        {/* Ações de acesso: agem na hora, sem precisar salvar */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className={labelClass}>Acesso</p>

          {member.status === 'ATIVO' && (
            <button
              type="button"
              onClick={handleReset}
              disabled={sendReset.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              {sendReset.isPending ? 'Enviando...' : 'Enviar redefinição de senha'}
            </button>
          )}

          {isPending && (
            <button
              type="button"
              onClick={handleResendInvite}
              disabled={resendInvite.isPending || emailChanged}
              title={emailChanged ? 'Salve o e-mail novo primeiro' : undefined}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              {resendInvite.isPending ? 'Enviando...' : `Reenviar convite para ${member.email}`}
            </button>
          )}

          {member.status === 'INATIVO' && (
            <p className="text-xs text-slate-500">Reative o acesso acima para enviar uma redefinição de senha.</p>
          )}

          {notice && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
              ✅ {notice}
            </p>
          )}
          {actionError && <p className="text-sm text-rose-600">{actionError.message}</p>}
        </div>
      </div>
    </div>
  );
};