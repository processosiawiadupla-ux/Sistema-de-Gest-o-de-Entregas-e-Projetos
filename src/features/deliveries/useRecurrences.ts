import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recurrenceService, type RecurrenceInput } from '../../services/recurrenceService';

const RECURRENCES_KEY = ['recurrences'] as const;

export function useRecurrences() {
  return useQuery({ queryKey: RECURRENCES_KEY, queryFn: recurrenceService.list });
}

// Depois de qualquer mudança, atualiza a lista de rotinas e as entregas
// (criar ou reativar uma rotina pode criar entregas na hora)
function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: RECURRENCES_KEY });
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
  };
}

export function useCreateRecurrence() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: RecurrenceInput) => recurrenceService.create(input),
    onSuccess: refresh,
  });
}

export function useUpdateRecurrence() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecurrenceInput }) => recurrenceService.update(id, input),
    onSuccess: refresh,
  });
}

export function useSetRecurrenceActive() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => recurrenceService.setActive(id, active),
    onSuccess: refresh,
  });
}

export function useDeleteRecurrence() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => recurrenceService.remove(id),
    onSuccess: refresh,
  });
}