import { z } from 'zod';

export const PROJECT_STATUS = [
  'not_started',
  'in_progress',
  'waiting',
  'completed',
  'cancelled',
] as const;

// Colunas do Kanban: A fazer, Em andamento, Concluído
export const STAGE_STATUS = ['todo', 'doing', 'done'] as const;

// Mesmas opções das entregas: etapa única, 5 ou 10 etapas
export const STAGE_COUNTS = [1, 5, 10] as const;

// Uma etapa do projeto: título, prazo e responsável
export const stageSchema = z.object({
  title: z
    .string('O título da etapa é obrigatório.')
    .trim()
    .min(1, 'O título da etapa é obrigatório.')
    .max(255, 'O título da etapa pode ter no máximo 255 caracteres.'),
  due_date: z.iso.date('Prazo da etapa inválido.'),
  responsible_id: z.uuid('Escolha o responsável da etapa.'),
});

// Dados gerais do projeto (usados para criar e para editar)
const baseProjectSchema = z.object({
  name: z
    .string('O nome do projeto é obrigatório.')
    .trim()
    .min(1, 'O nome do projeto é obrigatório.')
    .max(255, 'O nome pode ter no máximo 255 caracteres.'),
  description: z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres.').nullish(),
  owner_id: z.uuid('Escolha o responsável principal.'),
  sector_id: z.uuid('O setor inválido').nullish(),
  start_date: z.iso.date('Data de início inválida.').nullish(),
  due_date: z.iso.date('Prazo inválido.').nullish(),
  status: z.enum(PROJECT_STATUS, 'Status inválido.').optional(),
  notes: z.string().trim().max(2000, 'As observações podem ter no máximo 2000 caracteres.').nullish(),
});

type ProjectDates = { start_date?: string | null; due_date?: string | null };

const datesInOrder = (data: ProjectDates) =>
  !data.start_date || !data.due_date || data.due_date >= data.start_date;

const DATES_MESSAGE = {
  message: 'O prazo deve ser igual ou posterior à data de início.',
  path: ['due_date'],
};

// Criar: dados gerais + etapas
export const createProjectSchema = baseProjectSchema
  .extend({
    stages: z
      .array(stageSchema, 'Defina as etapas do projeto.')
      .refine(
        (stages) => (STAGE_COUNTS as readonly number[]).includes(stages.length),
        'O projeto deve ter 1, 5 ou 10 etapas.',
      ),
  })
  .refine(datesInOrder, DATES_MESSAGE)
  .refine(
    (data) => !data.due_date || data.stages.every((s) => s.due_date <= data.due_date!),
    { message: 'O prazo de cada etapa deve ser até o prazo final do projeto.', path: ['stages'] },
  )
  .refine(
    (data) => !data.start_date || data.stages.every((s) => s.due_date >= data.start_date!),
    { message: 'O prazo de cada etapa deve ser depois da data de início.', path: ['stages'] },
  );

// Editar: só os dados gerais (as etapas são editadas uma a uma)
export const updateProjectSchema = baseProjectSchema.refine(datesInOrder, DATES_MESSAGE);

// Mover um cartão de coluna no Kanban
export const moveStageSchema = z.object({
  status: z.enum(STAGE_STATUS, 'Coluna inválida.'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type StageInput = z.infer<typeof stageSchema>;

// Valida o id que vem no endereço (/projects/:id)
export const projectIdSchema = z.uuid();