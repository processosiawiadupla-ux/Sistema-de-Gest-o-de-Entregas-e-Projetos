import React from 'react';

export const RelatoriosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
          <p className="text-sm text-slate-500">Exporte indicadores por área, período e situação em CSV.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Módulo de relatórios pronto para filtros e exportação.</p>
      </div>
    </div>
  );
};