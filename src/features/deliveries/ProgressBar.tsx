import React from 'react';

// Barra de progresso com o percentual ao lado
export const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div
      className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${value === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-xs font-semibold text-slate-600 tabular-nums w-10 text-right">{value}%</span>
  </div>
);