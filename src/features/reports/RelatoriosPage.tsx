import React, { useMemo } from 'react';
import {
  BarChart3,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { useDeliveries } from '../deliveries/useDeliveries';
import { getDeliverySituation, SITUATION_LABELS, todayISO } from '../deliveries/deliverySituation';
import { formatDate } from '../../lib/format';

// Coloca um valor entre aspas para o CSV, protegendo aspas internas
function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export const RelatoriosPage: React.FC = () => {
  const { data: deliveries = [], isLoading, isError, error, refetch } = useDeliveries();

  // Todos os números do relatório, calculados numa passada só
  const report = useMemo(() => {
    const items = deliveries.map((d) => ({ ...d, situation: getDeliverySituation(d) }));

    let completed = 0;
    let completedOnTime = 0;
    let late = 0;
    const sectors: Record<string, { total: number; completed: number; late: number }> = {};

    for (const d of items) {
      const isCompleted = d.situation === 'CONCLUIDO' || d.situation === 'CONCLUIDO COM ATRASO';
      const isLate = d.situation === 'ATRASADO';

      if (isCompleted) completed += 1;
      if (d.situation === 'CONCLUIDO') completedOnTime += 1;
      if (isLate) late += 1;

      const sectorName = d.sector || 'Geral';
      if (!sectors[sectorName]) {
        sectors[sectorName] = { total: 0, completed: 0, late: 0 };
      }
      sectors[sectorName].total += 1;
      if (isCompleted) sectors[sectorName].completed += 1;
      if (isLate) sectors[sectorName].late += 1;
    }

    const total = items.length;

    return {
      items,
      total,
      completed,
      completedOnTime,
      late,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      punctualityRate: completed > 0 ? Math.round((completedOnTime / completed) * 100) : 0,
      // Setores com mais entregas primeiro
      sectors: Object.entries(sectors).sort((a, b) => b[1].total - a[1].total),
    };
  }, [deliveries]);

  // Exporta as entregas em CSV, pronto para abrir no Excel
  const handleExportCSV = () => {
    const headers = ['Título', 'Projeto', 'Responsável', 'Atribuído por', 'Setor', 'Prazo', 'Situação', 'Concluída em'];
    const rows = report.items.map((d) => [
      d.title,
      d.assignedToName,
      d.assignedByName ?? '',
      d.sector,
      formatDate(d.dueDate),
      SITUATION_LABELS[d.situation],
      d.completedAt ? new Date(d.completedAt).toLocaleDateString('pt-BR') : '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(';'))
      .join('\r\n');

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
      label: 'Total de Entregas',
      value: String(report.total),
      valueClass: 'text-slate-900',
      hint: `${report.pending} pendente(s)`,
      Icon: BarChart3,
      iconClass: 'text-blue-600',
    },
    {
      label: 'Taxa de Conclusão',
      value: `${report.completionRate}%`,
      valueClass: 'text-emerald-600',
      hint: `${report.completed} de ${report.total} concluídas`,
      Icon: TrendingUp,
      iconClass: 'text-emerald-600',
    },
    {
      label: 'Pontualidade',
      value: report.completed > 0 ? `${report.punctualityRate}%` : '–',
      valueClass: 'text-blue-600',
      hint: `${report.completedOnTime} concluídas dentro do prazo`,
      Icon: CheckCircle2,
      iconClass: 'text-blue-600',
    },
    {
      label: 'Atrasadas',
      value: String(report.late),
      valueClass: 'text-rose-600',
      hint: 'Requerem atenção',
      Icon: AlertTriangle,
      iconClass: 'text-rose-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios & Métricas</h1>
          <p className="text-sm text-slate-500">
            Análise consolidada de prazos, entregas e desempenho por setor.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={report.total === 0}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório (CSV)</span>
        </button>
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

      {/* Cartões de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              <card.Icon className={`w-5 h-5 ${card.iconClass}`} />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${card.valueClass}`}>
              {isLoading ? '–' : card.value}
            </div>
            <p className="text-xs text-slate-500 mt-1">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* Desempenho por Setor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Desempenho por Setor / Área
        </h2>

        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}

        {!isLoading && report.sectors.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma entrega cadastrada ainda.</p>
        )}

        <div className="space-y-4">
          {report.sectors.map(([sector, data]) => {
            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={sector} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{sector}</h3>
                    <p className="text-xs text-slate-500">
                      Total: {data.total} entrega(s) | {data.completed} concluída(s) | {data.late} atrasada(s)
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                    {pct}% concluído
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};