import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  FolderKanban,
  BarChart3,
  User,
  Settings,
  LogOut,
  PlusCircle,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewDelivery: () => void;
  onOpenAssignDelivery: () => void;
}

interface NavItem {
  tab: string;
  label: string;
  Icon: LucideIcon;
  visible: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewDelivery,
  onOpenAssignDelivery,
}) => {
  const { user, logout } = useAuth();
  const role = user?.role;

  // Seções do menu: cada item aparece só para quem tem a permissão
  const sections: { title?: string; items: NavItem[] }[] = [
    { items: [{ tab: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, visible: true }] },
    {
      title: 'Entregas',
      items: [
        { tab: 'minhas-entregas', label: 'Minhas entregas', Icon: ClipboardList, visible: true },
        { tab: 'entregas-equipe', label: 'Entregas da equipe', Icon: CalendarDays, visible: can(role, 'deliveries:view_team') },
      ],
    },
    {
      title: 'Projetos',
      items: [{ tab: 'projetos', label: 'Projetos', Icon: FolderKanban, visible: true }],
    },
    {
      title: 'Gestão',
      items: [
        { tab: 'equipe', label: 'Equipe', Icon: Users, visible: can(role, 'team:view') },
        { tab: 'relatorios', label: 'Relatórios', Icon: BarChart3, visible: can(role, 'deliveries:view_team') },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0A192F] text-slate-300 flex flex-col h-screen border-r border-slate-800">
      {/* Topo: marca, ações e menu (rola se a tela for baixa) */}
      <div className="p-6 flex-1 overflow-y-auto">
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
          {can(role, 'deliveries:assign') && (
            <button
              onClick={onOpenAssignDelivery}
              className="w-full border border-blue-500/50 text-blue-300 hover:bg-blue-600/15 hover:text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Atribuir Entrega</span>
            </button>
          )}
          <button
            onClick={onOpenNewDelivery}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lançar Entrega</span>
          </button>
        </div>

        <nav className="space-y-4">
          {sections.map((section, index) => {
            const items = section.items.filter((item) => item.visible);
            if (items.length === 0) return null;

            return (
              <div key={index} className="space-y-1">
                {section.title && (
                  <p className="px-3.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {section.title}
                  </p>
                )}
                {items.map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => setCurrentTab(item.tab)}
                    aria-current={currentTab === item.tab ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      currentTab === item.tab
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <item.Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Rodapé */}
      <div className="p-4 border-t border-slate-800/80 space-y-1">
        <button
          onClick={() => setCurrentTab('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            currentTab === 'profile' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>Meu perfil</span>
        </button>

         {can(role, 'settings:access') && (
          <button
            onClick={() => setCurrentTab('configuracoes')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              currentTab === 'configuracoes' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Configurações</span>
          </button>
        )}

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