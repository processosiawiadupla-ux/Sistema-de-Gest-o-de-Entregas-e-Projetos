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
import { DeliveryFormModal, type DeliveryFormMode } from './features/deliveries/DeliveryFormModal';

// Componente do layout protegido por autenticação
const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  // Modal de entrega aberto: 'launch', 'assign' ou null (fechado)
  const [deliveryModal, setDeliveryModal] = useState<DeliveryFormMode | null>(null);

  // Se não houver utilizador autenticado, exibe a tela de Login / Cadastro
  if (!user) {
    return <AuthPage />;
  }

  // Renderização dinâmica do conteúdo conforme a aba selecionada no menu
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'team':
      case 'equipe':
        return <EquipePage />;
      case 'projects':
      case 'projetos':
        return <ProjetosPage />;
      case 'deliveries':
      case 'entregas':
        return <EntregasPage />;
      case 'reports':
      case 'relatorios':
        return <RelatoriosPage />;
      case 'profile':
        return <PerfilPage />;
      case 'settings':
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
      <main className="flex-1 overflow-y-auto p-8">
        {renderContent()}
      </main>

      {deliveryModal && (
        <DeliveryFormModal
          mode={deliveryModal}
          onClose={() => setDeliveryModal(null)}
          onCreated={() => setCurrentTab('entregas')}
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