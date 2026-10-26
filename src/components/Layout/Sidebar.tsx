import React from 'react';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarDays,
  BarChart3,
  User,
  Settings,
  LogOut,
  PlusCircle,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAssignDeliveries } from '../../lib/permissions';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewDelivery: () => void;
  onOpenAssignDelivery: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewDelivery,
  onOpenAssignDelivery,
}) => {
  const { user, logout } = useAuth();
  const showAssign = canAssignDeliveries(user?.role);

  return (
    <aside className="w-64 bg-[#0A192F] text-slate-300 flex flex-col h-screen justify-between border-r border-slate-800">
      {/* Topo: Logótipo e Botões de Ação */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            W
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-wider">WIAFLOW</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Gestão de Entregas</p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {/* Atribuir: só ADMIN e LIDER */}
          {showAssign && (
            <button
              onClick={onOpenAssignDelivery}
              className="w-full border border-blue-500/50 text-blue-300 hover:bg-blue-600/15 hover:text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Atribuir Entrega</span>
            </button>
          )}

          {/* Lançar: todos os papéis */}
          <button
            onClick={onOpenNewDelivery}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lançar Entrega</span>
          </button>
        </div>

        {/* Menu de Navegação */}
        <nav className="space-y-1.5">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentTab === 'dashboard' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentTab('equipe')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentTab === 'equipe' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Equipe</span>
          </button>

          <button
            onClick={() => setCurrentTab('projetos')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentTab === 'projetos' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Projetos</span>
          </button>

          <button
            onClick={() => setCurrentTab('entregas')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentTab === 'entregas' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Agenda de Entregas</span>
          </button>

          <button
            onClick={() => setCurrentTab('relatorios')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentTab === 'relatorios' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-slate-800/60 text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Relatórios</span>
          </button>
        </nav>
      </div>

      {/* Rodapé da Barra Lateral */}
      <div className="p-4 border-t border-slate-800/80 space-y-1">
        <button
          onClick={() => setCurrentTab('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentTab === 'profile' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Meu perfil</span>
        </button>
        <button
          onClick={() => setCurrentTab('configuracoes')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentTab === 'configuracoes' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Configurações</span>
        </button>

        <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">{user?.name ?? 'Visitante'}</p>
              <p className="text-[10px] text-blue-400 font-semibold tracking-wider">{user?.role ?? ''}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sair do sistema"
            className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};