import React, { useMemo } from 'react';
import {
  BarChart3,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingUp,
  Users,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import type { Delivery, DeliverySituation } from '../../types';
import { useDeliveries } from '../deliveries/useDeliveries';
import { useDeliveryFilters, personKey } from '../deliveries/useDeliveryFilters';
import { DeliveryFilters } from '../deliveries/DeliveryFilters';
import { getDeliverySituation, SITUATION_LABELS, todayISO } from '../deliveries/deliverySituation';
import { formatDate } from '../../lib/format';

type Item = Delivery & { situation: DeliverySituation };

// Ordem e cor de cada situação (sempre com o nome escrito ao lado, nunca só a cor)
const SITUATIONS: { key: DeliverySituation; bar: string; badge: string }[] = [
  { key: 'ATRASADO', bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'EM RISCO', bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'NO PRAZO', bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'CONCLUIDO', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  {
    key: 'CONCLUIDO COM ATRASO',
    bar: 'bg-emerald-300',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
];

const isDone = (s: DeliverySituation) => s === 'CONCLUIDO' || s === 'CONCLUIDO COM ATRASO';

// Números de um grupo de entregas
function summarize(items: Item[]) {
  const total = items.length;
  const completed = items.filter((d) => isDone(d.situation)).length;
  const onTime = items.filter((d) => d.situation === 'CONCLUIDO').length;
  const late = items.filter((d) => d.situation === 'ATRASADO').length;
  const risk = items.filter((d) => d.situation === 'EM RISCO').length;
  const bySituation = Object.fromEntries(
    SITUATIONS.map((s) => [s.key, items.filter((d) => d.situation === s.key).length]),
  ) as Record<DeliverySituation, number>;

  return {
    total,
    completed,
    onTime,
    late,
    risk,
    pending: total - completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    punctualityRate: completed > 0 ? Math.round((onTime / completed) * 100) : null,
    bySituation,
  };
}

// Agrupa as entregas por uma chave (setor ou pessoa), com os números de cada grupo
function groupBy(items: Item[], key: (d: Item) => string, label: (d: Item) => string) {
  const groups = new Map<string, { id: string; name: string; items: Item[] }>();
  for (const d of items) {
    const id = key(d);
    if (!groups.has(id)) groups.set(id, { id, name: label(d), items: [] });
    groups.get(id)!.items.push(d);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, stats: summarize(g.items) }))
    .sort((a, b) => b.stats.total - a.stats.total || a.name.localeCompare(b.name));
}

// Coloca um valor entre aspas para o CSV, protegendo aspas internas
function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export const RelatoriosPage: React.FC = () => {
  // 'team': ADMIN vê todas; LIDER vê as do seu setor (quem decide é o backend)
  const { data: deliveries = [], isLoading, isFetching, isError, error, refetch, dataUpdatedAt } =
    useDeliveries('team');

  // Situação calculada uma vez para todas as entregas
  const all = useMemo<Item[]>(
    () => deliveries.map((d) => ({ ...d, situation: getDeliverySituation(d) })),
    [deliveries],
  );

  const { controls: filters, inSector, filtered } = useDeliveryFilters(all);
  const stats = useMemo(() => summarize(filtered), [filtered]);

  // Painel da direita: setores (sem filtro) ou pessoas do setor escolhido
  const breakdown = filters.sectorId
    ? {
        title: 'Por pessoa',
        Icon: Users,
        rows: groupBy(inSector, personKey, (d) => d.assignedToName || 'Sem responsável'),
        onPick: filters.changePerson,
        selected: filters.personId,
      }
    : {
        title: 'Por setor',
        Icon: Building2,
        rows: groupBy(all, (d) => d.sectorId, (d) => d.sector || 'Sem setor'),
        onPick: filters.changeSector,
        selected: filters.sectorId,
      };

  // Exporta as entregas filtradas em CSV, pronto para abrir no Excel
  const handleExportCSV = () => {
    const headers = ['Título', 'Responsável', 'Atribuído por', 'Setor', 'Prazo', 'Progresso', 'Situação', 'Concluída em'];
    const rows = filtered.map((d) => [
      d.title,
      d.assignedToName,
      d.assignedByName ?? '',
      d.sector,
      formatDate(d.dueDate),
      `${d.progress}%`,
      SITUATION_LABELS[d.situation],
      d.completedAt ? new Date(d.completedAt).toLocaleDateString('pt-BR') : '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');

    // O '\uFEFF' (BOM) avisa ao Excel que o arquivo é UTF-8, preservando os acentos
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_wiaflow_${todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    {
      label: 'Total de entregas',
      value: String(stats.total),
      valueClass: 'text-slate-900',
      hint: `${stats.pending} pendente(s)`,
      Icon: BarChart3,
      iconClass: 'text-blue-600',
    },
    {
      label: 'Taxa de conclusão',
      value: `${stats.completionRate}%`,
      valueClass: 'text-slate-900',
      hint: `${stats.completed} de ${stats.total} concluídas`,
      Icon: TrendingUp,
      iconClass: 'text-emerald-600',
    },
    {
      label: 'Pontualidade',
      value: stats.punctualityRate === null ? '–' : `${stats.punctualityRate}%`,
      valueClass: 'text-slate-900',
      hint: `${stats.onTime} concluídas dentro do prazo`,
      Icon: CheckCircle2,
      iconClass: 'text-blue-600',
    },
    {
      label: 'Atrasadas',
      value: String(stats.late),
      valueClass: stats.late > 0 ? 'text-rose-600' : 'text-slate-900',
      hint: `${stats.risk} em risco (vencem em até 3 dias)`,
      Icon: AlertTriangle,
      iconClass: 'text-rose-600',
    },
  ];

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const maxSituation = Math.max(1, ...SITUATIONS.map((s) => stats.bySituation[s.key]));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios & Métricas</h1>
          <p className="text-sm text-slate-500">Prazos, conclusão e desempenho por setor e por pessoa.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Atualizando...' : updatedAt ? `Atualizado às ${updatedAt}` : 'Atualizar'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={stats.total === 0}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros: uma linha só, acima de tudo */}
      {all.length > 0 && <DeliveryFilters filters={filters} />}

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

      {/* Cartões */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              <card.Icon className={`w-5 h-5 ${card.iconClass}`} />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${card.valueClass}`}>{isLoading ? '–' : card.value}</div>
            <p className="text-xs text-slate-500 mt-1">{card.hint}</p>
          </div>
        ))}
      </div>

      {!isLoading && all.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-6">
          Nenhuma entrega cadastrada ainda. Assim que as entregas forem atribuídas, os números aparecem aqui.
        </p>
      )}

      {all.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Situação das entregas: barras horizontais, cada uma com o nome e o número */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Situação das entregas
            </h2>
            <div className="space-y-3">
              {SITUATIONS.map((s) => {
                const count = stats.bySituation[s.key];
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={s.key} title={`${SITUATION_LABELS[s.key]}: ${count} (${pct}%)`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{SITUATION_LABELS[s.key]}</span>
                      <span className="text-slate-500">
                        <b className="text-slate-800">{count}</b> · {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                        style={{ width: `${(count / maxSituation) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por setor / por pessoa: clicar numa linha aplica o filtro */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <breakdown.Icon className="w-5 h-5 text-blue-600" />
              {breakdown.title}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Clique numa linha para filtrar.</p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {breakdown.rows.map((row) => {
                const active = breakdown.selected === row.id;
                return (
                  <button
                    key={row.id}
                    onClick={() => breakdown.onPick(active ? '' : row.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      active ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-sm text-slate-800 truncate">{row.name}</span>
                      <span className="text-xs font-bold text-slate-700 shrink-0">
                        {row.stats.completionRate}% concluído
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${row.stats.completionRate}%` }} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {row.stats.total} entrega(s) · {row.stats.completed} concluída(s)
                      {row.stats.late > 0 && (
                        <span className="text-rose-600 font-medium"> · {row.stats.late} atrasada(s)</span>
                      )}
                      {row.stats.risk > 0 && (
                        <span className="text-amber-700 font-medium"> · {row.stats.risk} em risco</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Entregas da pessoa escolhida */}
      {filters.personId && filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Entregas de {filters.personName}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-semibold">Entrega</th>
                  <th className="py-2 pr-4 font-semibold">Prazo</th>
                  <th className="py-2 pr-4 font-semibold w-44">Progresso</th>
                  <th className="py-2 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered]
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((d) => {
                    const s = SITUATIONS.find((x) => x.key === d.situation)!;
                    return (
                      <tr key={d.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-slate-800">{d.title}</p>
                          <p className="text-xs text-slate-500">{d.sector}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">{formatDate(d.dueDate)}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${d.progress}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 w-9 text-right">{d.progress}%</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${s.badge}`}
                          >
                            {SITUATION_LABELS[d.situation]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};