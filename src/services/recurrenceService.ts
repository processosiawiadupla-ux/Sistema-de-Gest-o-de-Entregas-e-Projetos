import { api } from '../lib/api';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

// Formato que o backend devolve
interface RecurrenceDTO {
  id: string;
  title: string;
  description: string | null;
  sector_id: string;
  sector_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  assigned_to_status: string;
  created_by_name: string | null;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
  lead_days: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  deliveries_count: number;
  next_due_date: string | null;
}

// Formato das telas
export interface Recurrence {
  id: string;
  title: string;
  description: string;
  sectorId: string;
  sectorName: string;
  assignedToId: string;
  assignedToName: string;
  assigneeActive: boolean;
  createdByName: string;
  frequency: Frequency;
  weekday: number | null;
  monthDay: number | null;
  leadDays: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  deliveriesCount: number;
  nextDueDate: string | null;
}

// O que as telas enviam
export interface RecurrenceInput {
  title: string;
  description: string;
  sectorId: string;
  assignedToId: string;
  frequency: Frequency;
  weekday: number;
  monthDay: number;
  leadDays: number;
  startDate?: string;
  endDate?: string;
}

const toRecurrence = (dto: RecurrenceDTO): Recurrence => ({
  id: dto.id,
  title: dto.title,
  description: dto.description ?? '',
  sectorId: dto.sector_id,
  sectorName: dto.sector_name,
  assignedToId: dto.assigned_to_id,
  assignedToName: dto.assigned_to_name,
  assigneeActive: dto.assigned_to_status === 'ATIVO',
  createdByName: dto.created_by_name ?? '',
  frequency: dto.frequency,
  weekday: dto.weekday,
  monthDay: dto.month_day,
  leadDays: dto.lead_days,
  startDate: dto.start_date,
  endDate: dto.end_date,
  active: dto.active,
  deliveriesCount: dto.deliveries_count,
  nextDueDate: dto.next_due_date,
});

const toPayload = (input: RecurrenceInput) => ({
  title: input.title,
  description: input.description || null,
  sector_id: input.sectorId,
  assigned_to_id: input.assignedToId,
  frequency: input.frequency,
  weekday: input.frequency === 'WEEKLY' ? input.weekday : null,
  month_day: input.frequency === 'MONTHLY' ? input.monthDay : null,
  lead_days: input.leadDays,
  ...(input.startDate && { start_date: input.startDate }),
  end_date: input.endDate || null,
});

export const recurrenceService = {
  async list(): Promise<Recurrence[]> {
    const { data } = await api.get<RecurrenceDTO[]>('/recurrences');
    return data.map(toRecurrence);
  },

  async create(input: RecurrenceInput): Promise<Recurrence> {
    const { data } = await api.post<RecurrenceDTO>('/recurrences', toPayload(input));
    return toRecurrence(data);
  },

  async update(id: string, input: RecurrenceInput): Promise<Recurrence> {
    const { data } = await api.put<RecurrenceDTO>(`/recurrences/${id}`, toPayload(input));
    return toRecurrence(data);
  },

  async setActive(id: string, active: boolean): Promise<Recurrence> {
    const { data } = await api.patch<RecurrenceDTO>(`/recurrences/${id}/active`, { active });
    return toRecurrence(data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/recurrences/${id}`);
  },
};