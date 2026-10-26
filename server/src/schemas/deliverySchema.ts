import { z } from 'zod';

export const createDeliverySchema = z.object({
  title: z
    .string('O título da entrega é obrigatório.')
    .trim()
    .min(1, 'O título da entrega é obrigatório.')
    .max(255, 'O título pode ter no máximo 255 caracteres.'),
  description: z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres.').nullish(),
  project_id: z.uuid('Projeto inválido.').nullish(),
  assigned_to_name: z
    .string('Informe o responsável pela entrega.')
    .trim()
    .min(1, 'Informe o responsável pela entrega.')
    .max(255, 'O nome do responsável é muito longo.'),
  assigned_by_name: z.string().trim().max(255, 'O nome de quem atribuiu é muito longo.').nullish(),
  sector: z.string().trim().max(100, 'O setor pode ter no máximo 100 caracteres.').nullish(),
  due_date: z.iso.date('Informe um prazo válido.'),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const completeDeliverySchema = z.object({
  completed: z.boolean('Informe se a entrega está concluída.'),
});

export const deliveryIdSchema = z.uuid();