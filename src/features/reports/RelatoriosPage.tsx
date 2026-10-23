import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  TrendingUp 
} from 'lucide-react';
import { initialDeliveries } from '../../services/mockData';

export const RelatoriosPage: React.FC = () => {
  const [deliveries] = useState(initialDeliveries);

  // Métrica consolidada
  const totalDeliveries = deliveries.length;
  const completedCount = deliveries.filter((d) => d.completed).length;
  const inProgressCount = totalDeliveries - completedCount;
  const delayedCount = deliveries.filter((d) => String(d.scheduleStatus) === 'ATRASADO' && !d.completed).length;

  const completionRate = totalDeliveries > 0 
    ? Math.round((completedCount / totalDeliveries) * 100) 
    : 0;

  // Agrupamento por Setor
  const sectorsSummary = deliveries.reduce((acc, delivery) => {
    const sectorName = delivery.sector || 'Outros';
    if (!acc[sectorName]) {
      acc[sectorName] = { total: 0, completed: 0, delayed: 0 };
    }
    acc[sectorName].total += 1;
    if (delivery.completed) acc[sectorName].completed += 1;
    if (String(delivery.scheduleStatus) === 'ATRASADO' && !delivery.completed) acc[sectorName].delayed += 1;
    return acc;
  }, {} as Record<string, { total: number; completed: number; delayed: number }>);

  // Função para exportar os dados em formato CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Titulo', 'Responsavel', 'Setor', 'Prazo', 'Status', 'Concluido'];
    const rows = deliveries.map((d) => [
      d.id,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.assignedToName}"`,
      `"${d.sector}"`,
      d.dueDate,
      d.scheduleStatus,
      d.completed ? 'SIM' : 'NAO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_wiaflow_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório (CSV)</span>
        </button>
      </div>

      {/* Cartões de Estatísticas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Entregas
            </span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalDeliveries}</div>
          <p className="text-xs text-slate-500 mt-1">Registradas no sistema</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Taxa de Conclusão
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{completionRate}%</div>
          <p className="text-xs text-slate-500 mt-1">{completedCount} de {totalDeliveries} concluídas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Em Andamento
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{inProgressCount}</div>
          <p className="text-xs text-slate-500 mt-1">Aguardando finalização</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Atrasadas
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">{delayedCount}</div>
          <p className="text-xs text-slate-500 mt-1">Requerem atenção crítica</p>
        </div>
      </div>

      {/* Desempenho por Setor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Desempenho por Setor / Área
        </h2>

        <div className="space-y-4">
          {Object.entries(sectorsSummary).map(([sector, data]) => {
            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={sector} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{sector}</h3>
                    <p className="text-xs text-slate-500">
                      Total: {data.total} entregas | {data.completed} concluídas | {data.delayed} atrasadas
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                    {pct}% concluído
                  </span>
                </div>

                {/* Barra de Progresso Visual */}
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