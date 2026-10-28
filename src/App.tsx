import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './features/auth/AuthPage';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EquipePage } from './features/team/EquipePage';
import { ProjetosPage } from './features/projects/ProjetosPage';
import { EntregasPage } from './features/deliveries/EntregasPage';
import { RelatoriosPage } from './features/reports/RelatoriosPage';
import { PerfilPage } from './features/profile/PerfilPage';
import { ConfiguracoesPage } from './features/settings/ConfiguracoesPage';
import { LaunchModal } from './features/deliveries/LaunchModal';
import { AssignModal } from './features/deliveries/AssignModal';
import { can } from './lib/permissions';

type DeliveryModal = 'launch' | 'assign' | null;

// Componente do layout protegido por autenticação
const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [deliveryModal, setDeliveryModal] = useState<DeliveryModal>(null);

  // Enquanto confere a sessão com o backend, não mostra nada
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  // Sem sessão: mostra a tela de login
  if (!user) {
    return <AuthPage />;
  }

  const canViewTeam = can(user.role, 'deliveries:view_team');

  // Cada tela confere a permissão antes de aparecer
  const renderContent = () => {
    switch (currentTab) {
      case 'minhas-entregas':
        return <EntregasPage key="mine" scope="mine" />;
      case 'entregas-equipe':
        return canViewTeam ? <EntregasPage key="team" scope="team" /> : <DashboardPage />;
      case 'projetos':
        return <ProjetosPage />;
      case 'equipe':
        return can(user.role, 'team:view') ? <EquipePage /> : <DashboardPage />;
      case 'relatorios':
        return canViewTeam ? <RelatoriosPage /> : <DashboardPage />;
      case 'profile':
        return <PerfilPage />;
      case 'configuracoes':
        return <ConfiguracoesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewDelivery={() => setDeliveryModal('launch')}
        onOpenAssignDelivery={() => setDeliveryModal('assign')}
      />
      <main className="flex-1 overflow-y-auto p-8">{renderContent()}</main>

      {deliveryModal === 'launch' && (
        <LaunchModal
          onClose={() => setDeliveryModal(null)}
          onLaunched={() => setCurrentTab('minhas-entregas')}
        />
      )}

      {deliveryModal === 'assign' && (
        <AssignModal
          onClose={() => setDeliveryModal(null)}
          onCreated={() => setCurrentTab('entregas-equipe')}
        />
      )}
    </div>
  );
};

// Componente Raiz da Aplicação
export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}