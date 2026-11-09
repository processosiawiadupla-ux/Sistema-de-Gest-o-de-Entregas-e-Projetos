import React from 'react';
import { Filter, X } from 'lucide-react';
import type { FilterControls } from './useDeliveryFilters';

const selectClass =
  'bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-48';

export const DeliveryFilters: React.FC<{ filters: FilterControls }> = ({ filters }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
    <Filter className="hidden md:block w-4 h-4 text-slate-400 shrink-0" />

    <select
      value={filters.sectorId}
      onChange={(e) => filters.changeSector(e.target.value)}
      className={selectClass}
      aria-label="Setor"
    >
      <option value="">Todos os setores</option>
      {filters.sectorOptions.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} ({s.count})
        </option>
      ))}
    </select>

    <select
      value={filters.personId}
      onChange={(e) => filters.changePerson(e.target.value)}
      className={selectClass}
      aria-label="Pessoa"
    >
      <option value="">{filters.sectorId ? 'Todas as pessoas do setor' : 'Todas as pessoas'}</option>
      {filters.personOptions.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.count})
        </option>
      ))}
    </select>

    {filters.hasFilter && (
      <>
        <span className="text-sm text-slate-500 md:ml-2">
          Mostrando:{' '}
          <b className="text-slate-800">
            {[filters.sectorName, filters.personName].filter(Boolean).join(' · ')}
          </b>
        </span>
        <button
          onClick={filters.clear}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500 cursor-pointer md:ml-auto"
        >
          <X className="w-4 h-4" />
          Limpar filtros
        </button>
      </>
    )}
  </div>
);