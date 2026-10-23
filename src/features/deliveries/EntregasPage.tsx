import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  Calendar,
  User,
  MessageSquare,
  Building
} from 'lucide-react';
import { initialDeliveries } from '../../services/mockData';
import type { Delivery } from '../../types';

export const EntregasPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  // Alternar estado de conclusão da entrega
  const toggleComplete = (id: string) => {
    setDeliveries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Filtragem combinada por busca e status
  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.assignedToName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.sector.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'TODOS') return matchesSearch;
    if (statusFilter === 'CONCLUIDOS') return matchesSearch && delivery.completed;
    if (statusFilter === 'PENDENTES') return matchesSearch && !delivery.completed;
    return matchesSearch && delivery.scheduleStatus === statusFilter;
  });

  // Badges visuais de status do prazo
  const getStatusBadge = (status: string, completed: boolean) => {
    if (completed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> CONCLUÍDO
        </span>
      );
    }

    switch (status) {
      case 'NO PRAZO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> NO PRAZO
          </span>
        );
      case 'EM RISCO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> EM RISCO
          </span>
        );
      case 'ATRASADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> ATLASADO
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Entregas</h1>
          <p className="text-sm text-slate-500">
            Acompanhe o progresso, prazos e responsabilidades de todas as entregas ativas.
          </p>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Campo de Pesquisa */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por título, responsável ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <button
            onClick={() => setStatusFilter('TODOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'TODOS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({deliveries.length})
          </button>
          <button
            onClick={() => setStatusFilter('NO PRAZO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'NO PRAZO'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            No Prazo
          </button>
          <button
            onClick={() => setStatusFilter('EM RISCO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'EM RISCO'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Risco
          </button>
          <button
            onClick={() => setStatusFilter('ATRASADO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'ATRASADO'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Atrasados
          </button>
        </div>
      </div>

      {/* Tabela de Entregas */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">Status</th>
                <th className="py-3.5 px-4">Entrega</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4">Setor</th>
                <th className="py-3.5 px-4">Prazo</th>
                <th className="py-3.5 px-4">Situação</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => toggleComplete(delivery.id)}
                      aria-label={delivery.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                      className="inline-flex items-center justify-center"
                    >
                      <CheckCircle2 className={`w-5 h-5 ${delivery.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-medium text-slate-900">{delivery.title}</td>
                  <td className="py-3.5 px-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2"><User className="w-4 h-4" />{delivery.assignedToName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2"><Building className="w-4 h-4" />{delivery.sector}</span>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" />{delivery.deadline}</span>
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(delivery.scheduleStatus, delivery.completed)}</td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">Nenhuma entrega encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};