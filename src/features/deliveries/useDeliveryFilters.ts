import { useMemo, useState } from 'react';
import type { Delivery } from '../../types';

// Identifica a pessoa responsável (pelo id; se faltar, pelo nome)
export const personKey = (d: Delivery) => d.assignedToId ?? `nome:${d.assignedToName}`;

export interface FilterOption {
  id: string;
  name: string;
  count: number; // quantas entregas
}

// O que a barra de filtros precisa para funcionar
export interface FilterControls {
  sectorId: string;
  personId: string;
  changeSector: (id: string) => void;
  changePerson: (id: string) => void;
  clear: () => void;
  sectorOptions: FilterOption[];
  personOptions: FilterOption[];
  sectorName?: string;
  personName?: string;
  hasFilter: boolean;
}

function buildOptions<T extends Delivery>(
  items: T[],
  key: (d: T) => string,
  label: (d: T) => string,
): FilterOption[] {
  const map = new Map<string, FilterOption>();
  for (const d of items) {
    const id = key(d);
    const current = map.get(id);
    if (current) current.count += 1;
    else map.set(id, { id, name: label(d), count: 1 });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Filtro por setor e por pessoa, usado no Dashboard e nos Relatórios
export function useDeliveryFilters<T extends Delivery>(items: T[]) {
  const [sectorId, setSectorId] = useState('');
  const [personId, setPersonId] = useState('');

  const sectorOptions = useMemo(
    () => buildOptions(items, (d) => d.sectorId, (d) => d.sector || 'Sem setor'),
    [items],
  );

  // Entregas do setor escolhido (ou todas)
  const inSector = useMemo(
    () => (sectorId ? items.filter((d) => d.sectorId === sectorId) : items),
    [items, sectorId],
  );

  // A lista de pessoas mostra só quem é do setor escolhido
  const personOptions = useMemo(
    () => buildOptions(inSector, personKey, (d) => d.assignedToName || 'Sem responsável'),
    [inSector],
  );

  // Entregas que passam pelos dois filtros
  const filtered = useMemo(
    () => (personId ? inSector.filter((d) => personKey(d) === personId) : inSector),
    [inSector, personId],
  );

  const changeSector = (id: string) => {
    setSectorId(id);
    setPersonId(''); // a pessoa escolhida pode não ser do setor novo
  };

  const clear = () => {
    setSectorId('');
    setPersonId('');
  };

  const controls: FilterControls = {
    sectorId,
    personId,
    changeSector,
    changePerson: setPersonId,
    clear,
    sectorOptions,
    personOptions,
    sectorName: sectorOptions.find((s) => s.id === sectorId)?.name,
    personName: personOptions.find((p) => p.id === personId)?.name,
    hasFilter: Boolean(sectorId || personId),
  };

  return { controls, inSector, filtered };
}