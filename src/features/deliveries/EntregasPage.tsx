import React from 'react';

export const EntregasPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda de Entregas</h1>
          <p className="text-sm text-slate-500">Acompanhe e registre a evolução das entregas e setores.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Módulo de agenda de entregas pronto.</p>
      </div>
    </div>
  );
};