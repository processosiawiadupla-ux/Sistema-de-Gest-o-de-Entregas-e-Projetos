import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useSectors } from '../sectors/useSectors';
import { teamService, type InviteInput } from '../../services/teamService';
import type { ApiError } from '../../lib/api';
import type { UserRole } from '../../types';

const EMAIL_DOMAIN = 'wiadupla.com';

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'COLABORADOR', label: 'Colaborador' },
  { value: 'LIDER', label: 'Líder' },
  { value: 'ADMIN', label: 'Administrador' },
];

export const InviteModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: sectors = [] } = useSectors();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // LIDER: sempre COLABORADOR do próprio setor
  const [role, setRole] = useState<UserRole>('COLABORADOR');
  const [sectorId, setSectorId] = useState(isAdmin ? '' : user?.sectorId ?? '');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const invite = useMutation<string, ApiError, InviteInput>({
    mutationFn: teamService.invite,
    onSuccess: setSuccessMessage,
  });

  const emailOutsideDomain = email.length > 0 && !email.trim().toLowerCase().endsWith(`@${EMAIL_DOMAIN}`);
  const needsSector = role !== 'ADMIN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    invite.mutate({ name, email, role, sectorId: needsSector ? sectorId : undefined });
  };

  const inviteAnother = () => {
    setName('');
    setEmail('');
    setSuccessMessage(null);
    invite.reset();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Convidar Membro</h2>
            <p className="text-xs text-slate-500">A pessoa recebe um link por e-mail para criar a própria senha.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer">
            ✕
          </button>
        </div>

        {successMessage ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
              ✅ {successMessage} O link vale por 48 horas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={inviteAnother}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Convidar outra pessoa
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nome completo *</label>
              <input
                type="text"
                required
                placeholder="Ex: Maria Souza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>E-mail institucional *</label>
              <input
                type="email"
                required
                placeholder={`nome@${EMAIL_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              {emailOutsideDomain && (
                <p className="text-xs mt-1 text-rose-600">Use um e-mail @{EMAIL_DOMAIN}.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Papel *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={!isAdmin}
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
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  disabled={!isAdmin || !needsSector}
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

            {!isAdmin && (
              <p className="text-xs text-slate-500">
                Como líder, você convida colaboradores para o seu setor ({user?.sectorName}).
              </p>
            )}

            {invite.isError && <p className="text-sm text-rose-600">{invite.error.message}</p>}

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
                disabled={invite.isPending || emailOutsideDomain}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {invite.isPending ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};