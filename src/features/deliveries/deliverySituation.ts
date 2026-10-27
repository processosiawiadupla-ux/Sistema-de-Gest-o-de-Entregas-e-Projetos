import type { Delivery, DeliverySituation } from '../../types'

// Quantos dias antes do prazo a entrega passa a ficar "em risco"
export const RISK_WINDOW_DAYS = 3

// Formata uma data como 'AAAA-MM-DD' no fuso do navegador
function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Data de hoje no formato 'AAAA-MM-DD'
export function todayISO(): string {
  return toLocalISODate(new Date())
}

// Quantos dias faltam de uma data até outra (ambas 'AAAA-MM-DD')
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const diff = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)
  return Math.round(diff / 86_400_000) // milissegundos em um dia
}

// Decide a situação de uma entrega
export function getDeliverySituation(
  delivery: Pick<Delivery, 'dueDate' | 'completed' | 'completedAt'>,
  today: string = todayISO(),
): DeliverySituation {
  if (delivery.completed) {
    const completedDay = delivery.completedAt
      ? toLocalISODate(new Date(delivery.completedAt))
      : today
    return completedDay <= delivery.dueDate ? 'CONCLUIDO' : 'CONCLUIDO COM ATRASO'
  }

  const daysLeft = daysBetween(today, delivery.dueDate)
  if (daysLeft < 0) return 'ATRASADO'
  if (daysLeft <= RISK_WINDOW_DAYS) return 'EM RISCO'
  return 'NO PRAZO'
}

// Texto de cada situação, para exibir ou exportar
export const SITUATION_LABELS: Record<DeliverySituation, string> = {
  'NO PRAZO': 'No prazo',
  'EM RISCO': 'Em risco',
  'ATRASADO': 'Atrasado',
  'CONCLUIDO': 'Concluído',
  'CONCLUIDO COM ATRASO': 'Concluído com atraso',
};