import React from 'react';
import { Target, TrendingUp, AlertCircle, AlertTriangle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boa tarde, Naiara 👋</h1>
          <p className="text-sm text-slate-500">Quarta-Feira, 21 De Outubro</p>
        </div>
      </div>

      {/* Cards de Métricas com Ícones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Entregas */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL DE ENTREGAS</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">4</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* No Prazo */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">NO PRAZO</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">4</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Em Risco */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EM RISCO</p>
            <p className="text-3xl font-extrabold text-amber-500 mt-1">0</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Entregas Atrasadas */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ENTREGAS ATLASADAS</p>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">0</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Lista de Entregas Atrasadas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-2">ENTREGAS ATLASADAS</h2>
        <p className="text-sm text-slate-500 py-4">Nenhuma entrega em atraso.</p>
      </div>
    </div>
  );
};