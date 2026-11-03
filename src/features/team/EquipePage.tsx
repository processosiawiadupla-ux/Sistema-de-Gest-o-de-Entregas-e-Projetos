import React, { useState } from 'react';
import { UserPlus, Shield, Mail, Briefcase, Search, Settings2, UserCheck } from 'lucide-react';
import type { TeamMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { useTeam, useInviteMember } from './useTeam.ts';
import { InviteModal } from './InviteModal';
import { EditMemberModal } from './EditMemberModal';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ATIVO: { label: 'Ativo', className: 'text-emerald-600' },
  PENDENTE: { label: 'Convite pendente', className: 'text-amber-600' },
  INATIVO: { label: 'Inativo', className: 'text-slate-400' },
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  LIDER: 'bg-blue-50 text-blue-700 border-blue-200',
  COLABORADOR: 'bg-slate-100 text-slate-700 border-slate-200',
};

// Conteúdo de um cartão de membro
const MemberCardBody: React.FC<{ member: TeamMember; isSelf: boolean; showInviter: boolean }> = ({
  member,
  isSelf,
  showInviter,
}) => (
  <div>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shrink-0">
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 text-base truncate">
          {member.name}
          {isSelf && <span className="text-xs font-medium text-slate-400"> (você)</span>}
        </h3>
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {member.email}
        </p>
      </div>
    </div>

    <div className="space-y-2 py-3 border-t border-slate-100 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Papel
        </span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_STYLES[member.role]}`}>
          {member.role}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" /> Setor
        </span>
        <span className="text-xs text-slate-700 font-medium text-right truncate max-w-[160px]">
          {member.sectorName ?? 'Sem setor'}
        </span>
      </div>
      {showInviter && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Convidado por
          </span>
          <span className="text-xs text-slate-700 font-medium text-right truncate max-w-[160px]">
            {member.invitedByName ?? '—'}
          </span>
        </div>
      )}
    </div>
  </div>
);

export const EquipePage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const canInvite = can(currentUser?.role, 'team:invite');
  const isAdmin = can(currentUser?.role, 'admin:access');

  const { data: members = [], isLoading, isError, error, refetch } = useTeam();
  const resendInvite = useInviteMember();

  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const term = searchTerm.trim().toLowerCase();
  const filteredMembers = members.filter(
    (m) =>
      !term ||
      [m.name, m.email, m.role, m.sectorName ?? ''].some((value) => value.toLowerCase().includes(term))
  );

  const pendingCount = members.filter((m) => m.status === 'PENDENTE').length;

  // LIDER: reenviar o convite de quem ainda não aceitou
  const handleResend = (m: TeamMember) => {
    resendInvite.mutate(
      { name: m.name, email: m.email, role: m.role, sectorId: m.sectorId },
      {
        onSuccess: (message) => window.alert(message),
        onError: (err) => window.alert(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Equipe</h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Clique em um membro para editar o perfil, o papel, o setor e o acesso.'
              : 'Membros que você convidou para o seu setor.'}
          </p>
        </div>

        {canInvite && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Convidar Membro</span>
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail, papel ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium hidden sm:block">
          <span className="text-slate-900 font-bold">{filteredMembers.length}</span> membro(s)
          {pendingCount > 0 && <span className="text-amber-600"> · {pendingCount} convite(s) pendente(s)</span>}
        </div>
      </div>

      {/* Erro */}
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

      {isLoading && <p className="text-sm text-slate-500">Carregando equipe...</p>}

      {!isLoading && !isError && filteredMembers.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-8 text-center">
          {members.length === 0 && !isAdmin
            ? 'Você ainda não convidou ninguém. Use "Convidar Membro" para começar.'
            : 'Nenhum membro encontrado para essa busca.'}
        </p>
      )}

      {/* Grade de membros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const status = STATUS_STYLES[member.status] ?? STATUS_STYLES.ATIVO;
          const isSelf = member.id === currentUser?.id;
          const cardClass = `bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left transition-all ${
            member.status === 'INATIVO' ? 'opacity-60' : ''
          }`;

          // ADMIN: o cartão inteiro abre o painel de edição
          if (isAdmin) {
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setEditing(member)}
                aria-label={`Gerenciar ${member.name}`}
                className={`${cardClass} cursor-pointer hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <MemberCardBody member={member} isSelf={isSelf} showInviter />
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <strong className={status.className}>{status.label}</strong>
                  <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                    <Settings2 className="w-3.5 h-3.5" />
                    Gerenciar
                  </span>
                </div>
              </button>
            );
          }

          // LIDER: cartão informativo
          return (
            <div key={member.id} className={cardClass}>
              <MemberCardBody member={member} isSelf={isSelf} showInviter={false} />
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <strong className={status.className}>{status.label}</strong>
                {canInvite && member.status === 'PENDENTE' && (
                  <button
                    onClick={() => handleResend(member)}
                    disabled={resendInvite.isPending}
                    className="text-blue-600 hover:text-blue-500 font-semibold cursor-pointer disabled:opacity-60"
                  >
                    Reenviar convite
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isInviteOpen && <InviteModal onClose={() => setIsInviteOpen(false)} />}
      {editing && <EditMemberModal member={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};