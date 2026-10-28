import React, { useState } from 'react';
import { UserPlus, Shield, Mail, Briefcase, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { initialUsers } from '../../services/mockData';

// Cor de cada situação do membro
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ATIVO: { label: 'Ativo', className: 'text-emerald-600' },
  PENDENTE: { label: 'Pendente', className: 'text-amber-600' },
  INATIVO: { label: 'Inativo', className: 'text-slate-400' },
};

export const EquipePage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const canInvite = can(currentUser?.role, 'team:invite');

  // Por enquanto, a lista vem do mock. Na parte 3g, passa a vir do banco.
  const [members] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');

  const term = searchTerm.trim().toLowerCase();
  const filteredMembers = members.filter(
    (member) =>
      !term ||
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.role.toLowerCase().includes(term)
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'LIDER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Equipe</h1>
          <p className="text-sm text-slate-500">
            Administre os membros da organização, permissões e setores de atuação.
          </p>
        </div>

        {/* Convidar: só ADMIN e LIDER */}
        {canInvite && (
          <button
            onClick={() => alert('Funcionalidade de convidar novo membro em breve!')}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Convidar Membro</span>
          </button>
        )}
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail ou papel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium hidden sm:block">
          Total: <span className="text-slate-900 font-bold">{filteredMembers.length}</span> membro(s)
        </div>
      </div>

      {/* Lista vazia */}
      {filteredMembers.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum membro encontrado para essa busca.</p>
      )}

      {/* Grade de Membros da Equipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const status = STATUS_STYLES[member.status] ?? STATUS_STYLES.ATIVO;

          return (
            <div
              key={member.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-inner shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base truncate">{member.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {member.email}
                    </p>
                  </div>
                </div>

                {/* Informações detalhadas */}
                <div className="space-y-2 py-3 border-t border-slate-100 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" /> Papel
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Setor
                    </span>
                    <span className="text-xs text-slate-700 font-medium text-right truncate max-w-[160px]">
                      {member.sector || 'Sem setor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Status: <strong className={status.className}>{status.label}</strong>
                </span>
                <button className="text-blue-600 hover:text-blue-500 font-semibold transition-colors cursor-pointer">
                  Ver detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};