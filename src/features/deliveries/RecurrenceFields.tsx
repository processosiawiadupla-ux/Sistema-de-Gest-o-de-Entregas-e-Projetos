import React from 'react';
import type { Frequency } from '../../services/recurrenceService';
import { todayISO } from './deliverySituation';
import { formatDate } from '../../lib/format';

export interface RuleState {
  frequency: Frequency;
  weekday: number; // 1 = segunda ... 7 = domingo
  monthDay: number; // 1 a 31
  startDate: string;
}

export const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira', short: 'segunda' },
  { value: 2, label: 'Terça-feira', short: 'terça' },
  { value: 3, label: 'Quarta-feira', short: 'quarta' },
  { value: 4, label: 'Quinta-feira', short: 'quinta' },
  { value: 5, label: 'Sexta-feira', short: 'sexta' },
  { value: 6, label: 'Sábado', short: 'sábado' },
  { value: 7, label: 'Domingo', short: 'domingo' },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string; hint: string }[] = [
  { value: 'DAILY', label: 'Diária', hint: 'dias úteis' },
  { value: 'WEEKLY', label: 'Semanal', hint: 'um dia da semana' },
  { value: 'MONTHLY', label: 'Mensal', hint: 'um dia do mês' },
];

// ---------- Antecedência automática ----------
// A entrega aparece no início do período:
//   diária  → no próprio dia
//   semanal → na segunda-feira da semana do prazo
//   mensal  → no dia 1º do mês do prazo
export function leadDaysFor(rule: { frequency: Frequency; weekday: number; monthDay: number }): number {
  if (rule.frequency === 'WEEKLY') return rule.weekday - 1;
  if (rule.frequency === 'MONTHLY') return Math.min(rule.monthDay - 1, 30);
  return 0;
}

function appearsText(rule: RuleState): string {
  if (rule.frequency === 'WEEKLY') {
    return rule.weekday === 1 ? 'No próprio dia do prazo (segunda-feira)' : 'Na segunda-feira da semana do prazo';
  }
  if (rule.frequency === 'MONTHLY') {
    return rule.monthDay === 1 ? 'No próprio dia do prazo (dia 1º)' : 'No dia 1º do mês do prazo';
  }
  return 'No próprio dia do prazo';
}

// Frase curta que descreve a rotina (usada na lista de Rotinas)
export function describeRule(rule: {
  frequency: Frequency;
  weekday: number | null;
  monthDay: number | null;
  leadDays: number;
}): string {
  const base =
    rule.frequency === 'DAILY'
      ? 'Diária (dias úteis)'
      : rule.frequency === 'WEEKLY'
        ? `Semanal, prazo toda ${WEEKDAYS.find((w) => w.value === rule.weekday)?.short ?? '?'}`
        : `Mensal, prazo no dia ${rule.monthDay}`;
  const lead =
    rule.leadDays === 0 ? 'aparece no dia do prazo' : `aparece ${rule.leadDays} dia(s) antes do prazo`;
  return `${base} · ${lead}`;
}

// ---------- Datas (mesma regra do backend) ----------

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const addDays = (iso: string, days: number) => new Date(toUTC(iso) + days * 86_400_000).toISOString().slice(0, 10);
const isoWeekday = (iso: string) => ((new Date(toUTC(iso)).getUTCDay() + 6) % 7) + 1;
const lastDayOfMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

function isDueDate(rule: RuleState, iso: string) {
  if (rule.frequency === 'DAILY') return isoWeekday(iso) <= 5;
  if (rule.frequency === 'WEEKLY') return isoWeekday(iso) === rule.weekday;
  return Number(iso.slice(8, 10)) === Math.min(rule.monthDay, lastDayOfMonth(iso));
}

// Primeiro prazo a partir de hoje (ou do início, se for depois)
function nextDue(rule: RuleState): string {
  const today = todayISO();
  let day = rule.startDate > today ? rule.startDate : today;
  for (let i = 0; i < 400 && !isDueDate(rule, day); i++) day = addDays(day, 1);
  return day;
}

// ---------- Campos ----------

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

interface Props {
  value: RuleState;
  onChange: (changes: Partial<RuleState>) => void;
  showFrequency?: boolean; // na edição, a frequência aparece aqui; no Atribuir, ela vem do "Repetir"
  startLocked?: boolean; // na edição de rotina que já começou, a data de início não muda
}

export const RecurrenceFields: React.FC<Props> = ({ value, onChange, showFrequency = false, startLocked = false }) => {
  const today = todayISO();
  const due = nextDue(value);
  const appears = addDays(due, -leadDaysFor(value));

  return (
    <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      {showFrequency && (
        <div>
          <span className={labelClass}>Frequência *</span>
          <div className="grid grid-cols-3 gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ frequency: opt.value })}
                aria-pressed={value.frequency === opt.value}
                className={`rounded-xl border px-3 py-2 text-left cursor-pointer ${
                  value.frequency === opt.value
                    ? 'border-blue-600 bg-white ring-1 ring-blue-600'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                <span className="block text-xs text-slate-500">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {value.frequency === 'DAILY' && (
          <div>
            <span className={labelClass}>Prazo</span>
            <p className="text-sm text-slate-700 py-2.5">Todo dia útil (segunda a sexta)</p>
          </div>
        )}

        {value.frequency === 'WEEKLY' && (
          <div>
            <label className={labelClass}>Prazo toda *</label>
            <select
              value={value.weekday}
              onChange={(e) => onChange({ weekday: Number(e.target.value) })}
              className={inputClass}
            >
              {WEEKDAYS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {value.frequency === 'MONTHLY' && (
          <div>
            <label className={labelClass}>Prazo no dia *</label>
            <input
              type="number"
              min={1}
              max={31}
              required
              value={value.monthDay}
              onChange={(e) => onChange({ monthDay: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        )}

        {startLocked ? (
          <div>
            <span className={labelClass}>Início</span>
            <p className="text-sm text-slate-700 py-2.5">Começou em {formatDate(value.startDate)}</p>
          </div>
        ) : (
          <div>
            <label className={labelClass}>Começa em *</label>
            <input
              type="date"
              required
              min={today}
              value={value.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className={inputClass}
            />
          </div>
        )}
      </div>

      
    </div>
  );
};