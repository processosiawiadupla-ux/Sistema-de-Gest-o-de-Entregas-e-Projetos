import { z } from 'zod';

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

// Cadastro de uma rotina (entrega que se repete)
export const recurrenceSchema = z
  .object({
    title: z
      .string('O título é obrigatório.')
      .trim()
      .min(1, 'O título é obrigatório.')
      .max(255, 'O título pode ter no máximo 255 caracteres.'),
    description: z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres.').nullish(),
    sector_id: z.uuid('Selecione um setor.'),
    assigned_to_id: z.uuid('Selecione o responsável.'),
    frequency: z.enum(FREQUENCIES, 'Escolha a frequência.'),
    // Semanal: 1 = segunda ... 7 = domingo
    weekday: z.number().int().min(1).max(7).nullish(),
    // Mensal: dia do prazo (se o mês for mais curto, usa o último dia)
    month_day: z.number().int().min(1).max(31).nullish(),
    // Quantos dias antes do prazo a entrega aparece
    lead_days: z
      .number('Informe a antecedência.')
      .int()
      .min(0, 'A antecedência não pode ser negativa.')
      .max(30, 'A antecedência pode ser de no máximo 30 dias.')
      .default(0),
    start_date: z.iso.date('Data de início inválida.').optional(),
    end_date: z.iso.date('Data de término inválida.').nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === 'WEEKLY' && !data.weekday) {
      ctx.addIssue({ code: 'custom', message: 'Escolha o dia da semana do prazo.', path: ['weekday'] });
    }
    if (data.frequency === 'MONTHLY' && !data.month_day) {
      ctx.addIssue({ code: 'custom', message: 'Informe o dia do mês do prazo.', path: ['month_day'] });
    }
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({ code: 'custom', message: 'O término deve ser depois do início.', path: ['end_date'] });
    }
  });

export type RecurrenceInput = z.infer<typeof recurrenceSchema>;

// Pausar / reativar
export const activeSchema = z.object({
  active: z.boolean('Informe se a rotina fica ativa.'),
});

export const recurrenceIdSchema = z.uuid();