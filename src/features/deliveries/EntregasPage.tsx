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
  ChevronDown,
  ChevronUp,
  Send,
  type LucideIcon,
} from 'lucide-react';
import type { DeliverySituation } from '../../types';
import type { DeliveryScope } from '../../services/deliveryService';
import { useAuth } from '../../context/AuthContext';
import { useDeliveries } from './useDeliveries';
import { useSectors } from '../sectors/useSectors';
import { getDeliverySituation } from './deliverySituation';
import { formatDate } from '../../lib/format';
import { ProgressBar } from './ProgressBar';
import { DeliveryDetails } from './DeliveryDetails';
import { LaunchModal } from './LaunchModal';

type FilterOption = 'TODOS' | 'NO PRAZO' | 'EM RISCO' | 'ATRASADO' | 'CONCLUIDOS';

const SITUATION_STYLES: Record<DeliverySituation, { label: string; className: string; Icon: LucideIcon }> = {
  'NO PRAZO': { label: 'No prazo', className: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Clock },
  'EM RISCO': { label: 'Em risco', className: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertCircle },
  'ATRASADO': { label: 'Atrasado', className: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle },
  'CONCLUIDO': { label: 'Concluído', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  'CONCLUIDO COM ATRASO': { label: 'Concluído com atraso', className: 'bg-orange-50 text-orange-700 border-orange-200', Icon: CheckCircle2 },
};

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

export const EntregasPage: React.FC<{ scope: DeliveryScope }> = ({ scope }) => {
  const { user } = useAuth();
  const isTeam = scope === 'team';
  const isAdmin = user?.role === 'ADMIN';

  // ADMIN pode filtrar a equipe por setor (no servidor)
  const { data: sectors = [] } = useSectors();
  const [sectorFilter, setSectorFilter] = useState('');
  const { data: deliveries = [], isLoading, isError, error, refetch } = useDeliveries(
    scope,
    isTeam && isAdmin ? sectorFilter || undefined : undefined
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterOption>('TODOS');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [launchFor, setLaunchFor] = useState<string | null>(null);

  const withSituation = useMemo(
    () => deliveries.map((d) => ({ ...d, situation: getDeliverySituation(d) })),
    [deliveries]
  );

  const counts = useMemo(() => {
    const result: Record<FilterOption, number> = { TODOS: 0, 'NO PRAZO': 0, 'EM RISCO': 0, ATRASADO: 0, CONCLUIDOS: 0 };
    for (const d of withSituation) {
      for (const f of FILTERS) {
        if (matchesFilter(d.situation, f.value)) result[f.value] += 1;
      }
    }
    return result;
  }, [withSituation]);

  const term = searchTerm.trim().toLowerCase();
  const filtered = withSituation.filter((d) => {
    const matchesSearch =
      !term || [d.title, d.assignedToName, d.sector].some((value) => value.toLowerCase().includes(term));
    return matchesSearch && matchesFilter(d.situation, filter);
  });

  const title = isTeam ? 'Entregas da equipe' : 'Minhas entregas';
  const subtitle = isTeam
    ? isAdmin
      ? 'Acompanhe as entregas de todos os setores.'
      : `Entregas do setor ${user?.sectorName ?? ''}.`
    : 'Atividades atribuídas a você. Lance cada etapa conforme for concluindo.';

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>

        {isTeam && isAdmin && (
          <div className="relative w-full sm:w-64">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Todos os setores</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Busca e filtros */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isTeam ? 'Pesquisar por título, responsável ou setor...' : 'Pesquisar nas minhas atividades...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {isLoading && <p className="text-sm text-slate-500">Carregando entregas...</p>}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-8 text-center">
          {deliveries.length === 0
            ? isTeam
              ? 'Nenhuma entrega no setor ainda. Use "Atribuir Entrega" para começar.'
              : 'Você não tem atividades atribuídas.'
            : 'Nenhuma entrega encontrada para essa busca ou filtro.'}
        </p>
      )}

      {/* Lista */}
      <ul className="space-y-3">
        {filtered.map((d) => {
          const style = SITUATION_STYLES[d.situation];
          const expanded = expandedId === d.id;
          const doneStages = d.stages.filter((s) => s.completed).length;

          return (
            <li key={d.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`font-semibold ${d.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {d.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.className}`}>
                      <style.Icon className="w-3.5 h-3.5" />
                      {style.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {isTeam && (
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {d.assignedToName || 'Sem responsável'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      {d.sector}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Prazo {formatDate(d.dueDate)}
                    </span>
                    <span>{d.stageCount === 1 ? 'Etapa única' : `${doneStages} de ${d.stageCount} etapas`}</span>
                  </div>

                  <ProgressBar value={d.progress} className="max-w-md" />
                </div>

                <div className="flex gap-2 shrink-0">
                  {!isTeam && !d.completed && (
                    <button
                      onClick={() => setLaunchFor(d.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Lançar
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                    aria-expanded={expanded}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Detalhes
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-slate-100 px-4 py-4">
                  <DeliveryDetails delivery={d} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {launchFor && <LaunchModal initialDeliveryId={launchFor} onClose={() => setLaunchFor(null)} />}
    </div>
  );
};