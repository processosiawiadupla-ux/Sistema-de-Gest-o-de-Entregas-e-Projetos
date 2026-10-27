import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Calendar,
  User,
  Building,
  FolderKanban,
  type LucideIcon,
} from 'lucide-react';
import type { DeliverySituation } from '../../types';
import { useDeliveries, useSetDeliveryCompleted } from './useDeliveries';
import { getDeliverySituation } from './deliverySituation';
import { formatDate } from '../../lib/format';

type FilterOption = 'TODOS' | 'NO PRAZO' | 'EM RISCO' | 'ATRASADO' | 'CONCLUIDOS';

// Aparência de cada situação
const SITUATION_STYLES: Record<DeliverySituation, { label: string; className: string; Icon: LucideIcon }> = {
  'NO PRAZO': { label: 'No prazo', className: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Clock },
  'EM RISCO': { label: 'Em risco', className: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertCircle },
  'ATRASADO': { label: 'Atrasado', className: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle },
  'CONCLUIDO': { label: 'Concluído', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  'CONCLUIDO COM ATRASO': { label: 'Concluído com atraso', className: 'bg-orange-50 text-orange-700 border-orange-200', Icon: CheckCircle2 },
};

// Botões de filtro
const FILTERS: { value: FilterOption; label: string; activeClass: string }[] = [
  { value: 'TODOS', label: 'Todos', activeClass: 'bg-slate-900 text-white' },
  { value: 'NO PRAZO', label: 'No prazo', activeClass: 'bg-blue-600 text-white' },
  { value: 'EM RISCO', label: 'Em risco', activeClass: 'bg-amber-500 text-white' },
  { value: 'ATRASADO', label: 'Atrasados', activeClass: 'bg-rose-600 text-white' },
  { value: 'CONCLUIDOS', label: 'Concluídos', activeClass: 'bg-emerald-600 text-white' },
];

function matchesFilter(situation: DeliverySituation, filter: FilterOption): boolean {
  if (filter === 'TODOS') return true;
  if (filter === 'CONCLUIDOS') return situation === 'CONCLUIDO' || situation === 'CONCLUIDO COM ATRASO';
  return situation === filter;
}

export const EntregasPage: React.FC = () => {
  const { data: deliveries = [], isLoading, isError, error, refetch } = useDeliveries();
  const setCompleted = useSetDeliveryCompleted();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterOption>('TODOS');

  // Cada entrega com a sua situação calculada para hoje
  const withSituation = useMemo(
    () => deliveries.map((d) => ({ ...d, situation: getDeliverySituation(d) })),
    [deliveries]
  );

  // Quantidade de entregas em cada filtro
  const counts = useMemo(() => {
    const result: Record<FilterOption, number> = {
      TODOS: 0,
      'NO PRAZO': 0,
      'EM RISCO': 0,
      ATRASADO: 0,
      CONCLUIDOS: 0,
    };
    for (const d of withSituation) {
      for (const f of FILTERS) {
        if (matchesFilter(d.situation, f.value)) result[f.value] += 1;
      }
    }
    return result;
  }, [withSituation]);

  // Busca + filtro
  const term = searchTerm.trim().toLowerCase();
  const filteredDeliveries = withSituation.filter((d) => {
    const matchesSearch =
      !term ||
      [d.title, d.assignedToName, d.sector, d.projectName ?? ''].some((value) =>
        value.toLowerCase().includes(term)
      );
    return matchesSearch && matchesFilter(d.situation, filter);
  });

  const toggleComplete = (id: string, completed: boolean) => {
    setCompleted.mutate(
      { id, completed: !completed },
      { onError: (err) => window.alert(err.message) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Entregas</h1>
        <p className="text-sm text-slate-500">
          Acompanhe o progresso, prazos e responsabilidades de todas as entregas.
        </p>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por título, responsável, setor ou projeto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === f.value ? f.activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label} ({counts[f.value]})
            </button>
          ))}
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
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">Carregando entregas...</td>
                </tr>
              )}

              {filteredDeliveries.map((delivery) => {
                const style = SITUATION_STYLES[delivery.situation as DeliverySituation];
                const isUpdating = setCompleted.isPending && setCompleted.variables?.id === delivery.id;

                return (
                  <tr key={delivery.id} className={`border-b border-slate-100 last:border-0 ${isUpdating ? 'opacity-50' : ''}`}>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleComplete(delivery.id, delivery.completed)}
                        disabled={isUpdating}
                        aria-label={delivery.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                        className="inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className={`w-5 h-5 ${delivery.completed ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`} />
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className={`text-sm font-medium ${delivery.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {delivery.title}
                      </p>
                      {delivery.projectName && (
                        <p className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
                          <FolderKanban className="w-3.5 h-3.5" />
                          {delivery.projectName}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {delivery.assignedToName || 'Sem responsável'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {delivery.sector || 'Geral'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(delivery.dueDate)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${style.className}`}>
                        <style.Icon className="w-3.5 h-3.5" />
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && !isError && filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    {deliveries.length === 0
                      ? 'Nenhuma entrega cadastrada ainda. Use "Lançar Entrega" para começar.'
                      : 'Nenhuma entrega encontrada para essa busca ou filtro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};