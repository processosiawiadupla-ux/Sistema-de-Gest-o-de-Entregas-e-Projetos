import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Shield, Building, Users, CalendarDays, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService, type Profile } from '../../services/profileService';
import type { ApiError } from '../../lib/api';
import type { UserRole } from '../../types';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  LIDER: 'Líder',
  COLABORADOR: 'Colaborador',
};

const MIN_PASSWORD = 10;

const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';
const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500';
const readOnlyClass =
  'w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-600 cursor-not-allowed';

// Campo só de leitura, com ícone
const ReadOnlyField: React.FC<{ label: string; value: string; icon: React.ElementType }> = ({
  label,
  value,
  icon: Icon,
}) => (
  <div>
    <label className={labelClass}>{label}</label>
    <div className="relative">
      <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input type="text" value={value} disabled className={readOnlyClass} />
    </div>
  </div>
);

export const PerfilPage: React.FC = () => {
  const { data: profile, isLoading, isError, error, refetch } = useQuery<Profile, ApiError>({
    queryKey: ['profile'],
    queryFn: profileService.get,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
        <p className="text-sm text-slate-500">Seus dados no Wiaflow e a troca de senha.</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Carregando perfil...</p>}

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

      {/* key: se o perfil mudar, o formulário recomeça com os dados novos */}
      {profile && (
        <>
          <ProfileCard key={profile.name} profile={profile} />
          <PasswordCard />
        </>
      )}
    </div>
  );
};

// ---------- Dados pessoais ----------

const ProfileCard: React.FC<{ profile: Profile }> = ({ profile }) => {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [name, setName] = useState(profile.name);
  const [success, setSuccess] = useState(false);

  const save = useMutation<Profile, ApiError, string>({
    mutationFn: profileService.updateName,
    onSuccess: async (updated) => {
      queryClient.setQueryData(['profile'], updated);
      await refreshUser(); // atualiza o nome no menu lateral
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const changed = name.trim() !== profile.name;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    save.mutate(name.trim());
  };

  const memberSince = new Date(profile.createdAt).toLocaleDateString('pt-BR');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Nome atualizado com sucesso!</span>
        </div>
      )}

      {/* Cabeçalho com a inicial */}
      <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-2xl shadow-md">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
          <p className="text-xs text-slate-500">{profile.email}</p>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {ROLE_LABEL[profile.role]}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome completo</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <ReadOnlyField label="E-mail corporativo" value={profile.email} icon={Mail} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Setor" value={profile.sectorName ?? 'Sem setor'} icon={Building} />
          <ReadOnlyField label="Nível de acesso" value={ROLE_LABEL[profile.role]} icon={Shield} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Responde a" value={profile.managerName ?? 'Ninguém'} icon={Users} />
          <ReadOnlyField label="Membro desde" value={memberSince} icon={CalendarDays} />
        </div>

        <p className="text-xs text-slate-500">
          E-mail, setor, nível de acesso e "Responde a" são definidos pelo administrador.
        </p>

        {save.isError && <p className="text-sm text-rose-600">{save.error.message}</p>}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!changed || save.isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save.isPending ? 'Salvando...' : 'Salvar nome'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------- Troca de senha ----------

const PasswordCard: React.FC = () => {
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const change = useMutation<string, ApiError, void>({
    mutationFn: () => profileService.changePassword(current, next),
    onSuccess: (message) => {
      setDone(message);
      // A troca encerra as sessões; volta para o login em instantes
      setTimeout(() => logout(), 2500);
    },
  });

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current && next.length >= MIN_PASSWORD && next === confirm && !change.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) change.mutate();
  };

  const type = show ? 'text' : 'password';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" />
          Trocar senha
        </h2>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {done ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
          ✅ {done}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Senha atual</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={type}
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nova senha</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={type}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className={inputClass}
                />
              </div>
              {tooShort && (
                <p className="text-xs mt-1 text-rose-600">Use pelo menos {MIN_PASSWORD} caracteres.</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Confirmar nova senha</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={type}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>
              {mismatch && <p className="text-xs mt-1 text-rose-600">As senhas não são iguais.</p>}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Depois de trocar, você sai do sistema e entra de novo com a nova senha.
          </p>

          {change.isError && <p className="text-sm text-rose-600">{change.error.message}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {change.isPending ? 'Trocando...' : 'Trocar senha'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};