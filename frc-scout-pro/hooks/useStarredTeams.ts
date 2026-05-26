'use client'

// ─── Starred Teams Hook ────────────────────────────────────────────────────
// Provides optimistic star/unstar mutations backed by the Supabase
// `starred_teams` table. Stars are per-user and persist across sessions.
// Uses optimistic updates so the UI responds instantly even on slow networks.
// ──────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useStarredTeams() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Fetch the current user's starred team numbers as a flat array
  const { data: starredTeams = [] } = useQuery<number[]>({
    queryKey: ['starred-teams'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('starred_teams')
        .select('team_number')
        .eq('user_id', user.id)
      return (data ?? []).map((r: { team_number: number }) => r.team_number)
    },
    // Stars rarely change mid-session — keep cache warm for 5 minutes
    staleTime: 5 * 60 * 1000,
  })

  const starMutation = useMutation({
    mutationFn: async ({ teamNumber, wasStarred }: { teamNumber: number; wasStarred: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (wasStarred) {
        // Remove the star
        await supabase
          .from('starred_teams')
          .delete()
          .eq('user_id', user.id)
          .eq('team_number', teamNumber)
      } else {
        // Add the star
        await supabase
          .from('starred_teams')
          .insert({ user_id: user.id, team_number: teamNumber })
      }
    },

    // Optimistically update the cache before the server responds
    onMutate: async ({ teamNumber, wasStarred }) => {
      await queryClient.cancelQueries({ queryKey: ['starred-teams'] })
      const previous = queryClient.getQueryData<number[]>(['starred-teams']) ?? []
      queryClient.setQueryData<number[]>(
        ['starred-teams'],
        wasStarred ? previous.filter((t) => t !== teamNumber) : [...previous, teamNumber]
      )
      return { previous }
    },

    // Roll back if the server request fails
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['starred-teams'], ctx.previous)
      }
    },

    // Always refetch to ensure consistency with DB
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['starred-teams'] })
    },
  })

  return {
    /** Flat array of starred team numbers for the current user */
    starredTeams,
    /** Returns true if the given team is starred */
    isStarred: (teamNumber: number) => starredTeams.includes(teamNumber),
    /** Toggle star state with optimistic update */
    toggleStar: (teamNumber: number) =>
      starMutation.mutate({ teamNumber, wasStarred: starredTeams.includes(teamNumber) }),
    isPending: starMutation.isPending,
  }
}
