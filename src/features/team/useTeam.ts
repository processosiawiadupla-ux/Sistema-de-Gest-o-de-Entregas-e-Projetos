import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teamService, type InviteInput, type MemberUpdateInput } from '../../services/teamService'
import type { TeamMember } from '../../types'
import type { ApiError } from '../../lib/api'

export const teamKeys = {
  all: ['team'] as const,
}

// Membros da equipe (ADMIN: todos; LIDER: quem ele convidou)
export function useTeam() {
  return useQuery<TeamMember[], ApiError>({
    queryKey: teamKeys.all,
    queryFn: teamService.list,
  })
}

// Depois de convidar ou editar, a equipe e as listas de responsáveis se atualizam
function useInvalidateTeam() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: teamKeys.all })
    queryClient.invalidateQueries({ queryKey: ['assignees'] })
  }
}

export function useInviteMember() {
  const invalidate = useInvalidateTeam()
  return useMutation<string, ApiError, InviteInput>({
    mutationFn: teamService.invite,
    onSuccess: invalidate,
  })
}

export function useUpdateMember() {
  const invalidate = useInvalidateTeam()
  return useMutation<TeamMember, ApiError, { id: string; input: MemberUpdateInput }>({
    mutationFn: ({ id, input }) => teamService.update(id, input),
    onSuccess: invalidate,
  })
}

export function useSendPasswordReset() {
  return useMutation<string, ApiError, string>({
    mutationFn: teamService.sendPasswordReset,
  })
}