import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCreateDelivery } from './useDeliveries';
import { useSectors } from '../sectors/useSectors';
import { canAssignDeliveries } from '../../lib/permissions';

export type DeliveryFormMode = 'launch' | 'assign';

interface DeliveryFormModalProps {
  mode: DeliveryFormMode;
  onClose: () => void;
  onCreated?: () => void;
}

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

export const DeliveryFormModal: React.FC<DeliveryFormModalProps> = ({ mode, onClose, onCreated }) => {
  const { user } = useAuth();
  const { data: sectors = [], isLoading: loadingSectors } = useSectors();
  const createDelivery = useCreateDelivery();

  const isAssign = mode === 'assign';
  const currentUserName = user?.name ?? '';

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToName, setAssignedToName] = useState(isAssign ? '' : currentUserName);
  const [sectorId, setSectorId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Proteção extra: o modo "atribuir" só abre para quem tem permissão
  if (isAssign && !canAssignDeliveries(user?.role)) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createDelivery.mutate(
      {
        title,
        description,
        assignedToName: isAssign ? assignedToName : currentUserName,
        assignedByName: currentUserName,
        sectorId,
        dueDate,
      },
      {
        onSuccess: () => {
          onClose();
          onCreated?.();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAssign ? 'Atribuir Entrega' : 'Lançar Entrega'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAssign
                ? 'Crie uma entrega e defina quem será responsável por ela.'
                : 'Registre uma entrega sob a sua responsabilidade.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Título da Entrega *</label>
            <input
              type="text"
              required
              placeholder="Ex: Relatório mensal de vendas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              rows={2}
              placeholder="Detalhes do que precisa ser entregue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Responsável *</label>
              <input
                type="text"
                required
                placeholder="Nome do responsável"
                value={isAssign ? assignedToName : currentUserName}
                onChange={(e) => setAssignedToName(e.target.value)}
                disabled={!isAssign}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Prazo *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Setor *</label>
            <select
              required
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              disabled={loadingSectors}
              className={inputClass}
            >
              <option value="" disabled>
                {loadingSectors ? 'Carregando setores...' : 'Selecione o setor'}
              </option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {createDelivery.isError && (
            <p className="text-sm text-rose-600">{createDelivery.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createDelivery.isPending}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createDelivery.isPending ? 'Salvando...' : isAssign ? 'Atribuir' : 'Lançar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};