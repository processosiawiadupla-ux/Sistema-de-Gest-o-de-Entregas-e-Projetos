import { useState, type FormEvent } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EntregasPage } from './features/deliveries/EntregasPage';
import { RelatoriosPage } from './features/reports/RelatoriosPage';
import { ConfiguracoesPage } from './features/settings/ConfiguracoesPage';
import { initialDeliveries } from './services/mockData';
import type { Delivery } from './types';

type NewDeliveryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (delivery: Partial<Delivery>) => void;
};

function NewDeliveryModal({ isOpen, onClose, onSave }: NewDeliveryModalProps) {
  const [delivery, setDelivery] = useState<Partial<Delivery>>({});

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(delivery);
    setDelivery({});
    onClose();
  };

  const updateField = (field: keyof Delivery, value: string) => {
    setDelivery((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900">Nova entrega</h2>
        <label className="block text-sm font-medium text-slate-700">
          Título
          <input required value={delivery.title ?? ''} onChange={(event) => updateField('title', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Descrição
          <textarea value={delivery.description ?? ''} onChange={(event) => updateField('description', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" rows={3} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Responsável
          <input value={delivery.assignedToName ?? ''} onChange={(event) => updateField('assignedToName', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Setor
          <input value={delivery.sector ?? ''} onChange={(event) => updateField('sector', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Prazo
          <input type="date" value={delivery.dueDate ?? ''} onChange={(event) => updateField('dueDate', event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-slate-700">Cancelar</button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Salvar</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);

  const handleOpenNewDelivery = () => {
    setIsModalOpen(true);
  };

  const handleSaveDelivery = (newDeliveryData: Partial<Delivery>) => {
    const createdDelivery: Delivery = {
      id: `del-${Date.now()}`,
      projectId: 'proj-1',
      title: newDeliveryData.title || '',
      description: newDeliveryData.description || '',
      assignedToId: newDeliveryData.assignedToId || '',
      assignedToName: newDeliveryData.assignedToName || '',
      sector: newDeliveryData.sector || '',
      dueDate: newDeliveryData.dueDate || '',
      scheduleStatus: newDeliveryData.scheduleStatus ?? initialDeliveries[0].scheduleStatus,
      completed: false,
      commentsCount: 0,
    };

    setDeliveries((prev) => [createdDelivery, ...prev]);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'team':
        return <section className="text-2xl font-bold text-slate-900">Equipe</section>;
      case 'deliveries':
        return <EntregasPage />;
      case 'reports':
        return <RelatoriosPage />;
      case 'settings':
      case 'profile':
        return <ConfiguracoesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden m-0 p-0">
      {/* Menu Lateral Fixo */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onOpenNewDelivery={handleOpenNewDelivery} 
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Modal de Lançar Entrega */}
      <NewDeliveryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDelivery}
      />
    </div>
  );
}

export default App;
