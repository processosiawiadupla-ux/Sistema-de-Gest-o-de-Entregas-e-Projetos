import React from 'react';

export const ConfiguracoesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configurações da Conta</h1>
          <p className="text-sm text-slate-500">Ajuste seu perfil, segurança, integrações e permissões.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-slate-600 text-sm">Módulo de configurações ativado.</p>
      </div>
    </div>
  );
};