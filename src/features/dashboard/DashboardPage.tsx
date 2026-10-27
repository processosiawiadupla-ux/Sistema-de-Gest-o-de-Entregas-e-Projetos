import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Calendar, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDeliveries } from '../deliveries/useDeliveries';
import { getDeliverySituation } from '../deliveries/deliverySituation';
import { formatDate } from '../../lib/format';
import type { Delivery } from '../../types';

// Saudação conforme a hora do dia
function getGreeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Primeira letra maiúscula
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Primeiro nome, com só a inicial maiúscula
function getFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return capitalize(first.toLowerCase());
}

// Lista compacta de entregas, usada nos dois painéis
// Lista compacta de entregas, usada nos dois painéis
const DeliveryList: React.FC<{ items: Delivery[]; emptyText: string }> = ({ items, emptyText }) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 py-4">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((d) => (
        <li key={d.id} className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{d.title}</p>
            <p className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5" />
              {d.assignedToName || 'Sem responsável'}
              {d.sector && <span className="text-slate-400">· {d.sector}</span>}
            </p>
          </div>
          <span className="text-xs text-slate-600 inline-flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(d.dueDate)}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data: deliveries = [], isLoading, isError, error, refetch } = useDeliveries();

  // Saudação e data de hoje
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const firstName = user?.name ? getFirstName(user.name) : '';
  const todayLabel = capitalize(
    now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  // Números e listas calculados a partir das entregas
  const summary = useMemo(() => {
    const late: Delivery[] = [];
    const atRisk: Delivery[] = [];
    let onTime = 0;
    let completed = 0;

    for (const d of deliveries) {
      const situation = getDeliverySituation(d);
      if (situation === 'ATRASADO') late.push(d);
      else if (situation === 'EM RISCO') atRisk.push(d);
      else if (situation === 'NO PRAZO') onTime += 1;
      else completed += 1;
    }

    const byDueDate = (a: Delivery, b: Delivery) => a.dueDate.localeCompare(b.dueDate);

    return {
      total: deliveries.length,
      onTime,
      completed,
      atRisk: atRisk.sort(byDueDate),
      late: late.sort(byDueDate),
    };
  }, [deliveries]);

  const cards = [
    {
      label: 'Total de Entregas',
      value: summary.total,
      color: 'text-blue-600',
      hint: `${summary.completed} concluída(s)`,
    },
    {
      label: 'No Prazo',
      value: summary.onTime,
      color: 'text-emerald-600',
      hint: 'pendentes, com folga',
    },
    {
      label: 'Em Risco',
      value: summary.atRisk.length,
      color: 'text-amber-500',
      hint: 'vencem em até 3 dias',
    },
    {
      label: 'Entregas Atrasadas',
      value: summary.late.length,
      color: 'text-rose-600',
      hint: 'prazo vencido',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {greeting}{firstName && `, ${firstName}`} 👋
        </h1>
        <p className="text-sm text-slate-500">{todayLabel}</p>
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

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`text-3xl font-extrabold mt-1 ${card.color}`}>
              {isLoading ? '–' : card.value}
            </p>
            <p className="text-xs text-slate-400 mt-1">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* Painéis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Entregas Atrasadas
          </h2>
          {isLoading ? (
            <p className="text-sm text-slate-500 py-4">Carregando...</p>
          ) : (
            <DeliveryList items={summary.late} emptyText="Nenhuma entrega em atraso. 🎉" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Vencem nos Próximos Dias
          </h2>
          {isLoading ? (
            <p className="text-sm text-slate-500 py-4">Carregando...</p>
          ) : (
            <DeliveryList items={summary.atRisk} emptyText="Nenhuma entrega vencendo nos próximos dias." />
          )}
        </div>
      </div>
    </div>
  );
};