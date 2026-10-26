import { z } from 'zod';

export const PROJECT_STATUS = [
  'not_started',
  'in_progress',
  'waiting',
  'completed',
  'cancelled',
] as const;

export const createProjectSchema = z
  .object({
    name: z
      .string('O nome do projeto é obrigatório.')
      .trim()
      .min(1, 'O nome do projeto é obrigatório.')
      .max(255, 'O nome pode ter no máximo 255 caracteres.'),
    description: z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres.').nullish(),
    owner: z.string().trim().max(255, 'O nome do responsável é muito longo.').nullish(),
    department: z.string().trim().max(100, 'O setor pode ter no máximo 100 caracteres.').nullish(),
    start_date: z.iso.date('Data de início inválida.').nullish(),
    due_date: z.iso.date('Prazo inválido.').nullish(),
    status: z.enum(PROJECT_STATUS, 'Status inválido.').optional(),
    notes: z.string().trim().max(2000, 'As observações podem ter no máximo 2000 caracteres.').nullish(),
  })
  .refine(
    (data) => !data.start_date || !data.due_date || data.due_date >= data.start_date,
    { message: 'O prazo deve ser igual ou posterior à data de início.', path: ['due_date'] },
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;