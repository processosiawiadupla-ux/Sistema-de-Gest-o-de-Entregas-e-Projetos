import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boa tarde, Naiara 👋</h1>
          <p className="text-sm text-slate-500">Quarta-Feira, 21 De Outubro</p>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Entregas</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">4</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Prazo</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">4</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Risco</p>
            <p className="text-3xl font-extrabold text-amber-500 mt-1">0</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entregas Atrasadas</p>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">0</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Entregas Atrasadas</h2>
        <p className="text-sm text-slate-500 py-4">Nenhuma entrega em atraso.</p>
      </div>
    </div>
  );
};