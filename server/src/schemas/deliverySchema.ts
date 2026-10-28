import { z } from 'zod';

// Textos de um lançamento
const noteFields = {
  done_text: z
    .string('Descreva o que foi feito.')
    .trim()
    .min(1, 'Descreva o que foi feito.')
    .max(2000, 'O texto pode ter no máximo 2000 caracteres.'),
  missing_text: z.string().trim().max(2000, 'O texto pode ter no máximo 2000 caracteres.').nullish(),
};

export const launchNoteSchema = z.object(noteFields);
export type LaunchNote = z.infer<typeof launchNoteSchema>;

// Lançar: concluir uma etapa, contando o que foi feito
export const launchSchema = z.object({
  stage_id: z.uuid('Selecione a etapa concluída.'),
  ...noteFields,
});

// Uma etapa: título e prazo
const stageSchema = z.object({
  title: z
    .string('Informe o título da etapa.')
    .trim()
    .min(1, 'Informe o título da etapa.')
    .max(255, 'O título da etapa pode ter no máximo 255 caracteres.'),
  due_date: z.iso.date('Informe o prazo da etapa.'),
});

// Campos comuns de uma entrega
const baseDeliverySchema = z.object({
  title: z
    .string('O título da entrega é obrigatório.')
    .trim()
    .min(1, 'O título da entrega é obrigatório.')
    .max(255, 'O título pode ter no máximo 255 caracteres.'),
  description: z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres.').nullish(),
  sector_id: z.uuid('Selecione um setor.'),
  assigned_to_id: z.uuid('Selecione o responsável.').nullish(), // vazio = para mim mesmo
  due_date: z.iso.date('Informe um prazo válido.'),
});

export type DeliveryBaseInput = z.infer<typeof baseDeliverySchema>;

// Criar: sem "stages" = etapa única; com "stages" = 5 ou 10 etapas
export const createDeliverySchema = baseDeliverySchema
  .extend({
    stages: z.array(stageSchema).optional(),
    first_update: launchNoteSchema.optional(), // atividade não atribuída, já concluída
  })
  .superRefine((data, ctx) => {
    if (data.stages && data.stages.length !== 5 && data.stages.length !== 10) {
      ctx.addIssue({ code: 'custom', message: 'Escolha 5 ou 10 etapas.', path: ['stages'] });
    }

    data.stages?.forEach((stage, index) => {
      if (stage.due_date > data.due_date) {
        ctx.addIssue({
          code: 'custom',
          message: `O prazo da etapa ${index + 1} não pode passar do prazo da entrega.`,
          path: ['stages', index, 'due_date'],
        });
      }
    });

    if (data.first_update && data.stages) {
      ctx.addIssue({
        code: 'custom',
        message: 'Uma atividade não atribuída é sempre de etapa única.',
        path: ['stages'],
      });
    }
  });

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

// Editar: só os dados gerais (as etapas não mudam por aqui)
export const updateDeliverySchema = baseDeliverySchema;

// Quais entregas listar
export const listDeliveriesSchema = z.object({
  scope: z.enum(['mine', 'team']).default('mine'),
  sector_id: z.uuid('Setor inválido.').optional(),
});

export const deliveryIdSchema = z.uuid();