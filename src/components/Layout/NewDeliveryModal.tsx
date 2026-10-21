import React, { useState } from 'react';
import { X } from 'lucide-react';
import { initialUsers } from '../../services/mockData';
import type { Delivery } from '../../types';

interface NewDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDelivery: Partial<Delivery>) => void;
}

export const NewDeliveryModal: React.FC<NewDeliveryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [sector, setSector] = useState('Tecnologia / Desenvolvimento');
  const [dueDate, setDueDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate || !assignedToId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const selectedUser = initialUsers.find((u) => u.id === assignedToId);

    onSave({
      title,
      description,
      assignedToId,
      assignedToName: selectedUser ? selectedUser.name : 'Não atribuído',
      sector,
      dueDate,
      completed: false,
      commentsCount: 0,
    });

    // Resetar campos e fechar
    setTitle('');
    setDescription('');
    setAssignedToId('');
    setDueDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Cabeçalho do Modal */}
        <div className="bg-[#0A192F] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">Lançar Nova Entrega</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Título da Entrega *
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Atualizar licenças de software"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhamento ou observações da entrega..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Responsável *
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                required
              >
                <option value="">Selecione...</option>
                {initialUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Setor / Área
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">
                <option value="Diretoria e Gestão">Diretoria e Gestão</option>
                <option value="Engenharia e Projetos">Engenharia e Projetos</option>
                <option value="Produção e Asfalto">Produção e Asfalto</option>
                <option value="Comercial e Vendas">Comercial e Vendas</option>
                <option value="Lógistica e Transporte">Lógistica e Transporte</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Recursos Humanos">Recursos Humanos</option>
                <option value="Tecnologia e processos com IA">Tecnologia e processos com IA</option>
                <option value="Marketing e Comunicação">Marketing e Comunicação</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Data do Prazo *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
            >
              Lançar Entrega
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};