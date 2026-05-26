'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeSync(eventId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!eventId) return

    const supabase = createClient()
    const channel = supabase
      .channel('app-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scouting_entries', filter: `event_id=eq.${eventId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['scouting-progress', eventId] })
          queryClient.invalidateQueries({ queryKey: ['team-alerts', eventId] })
          queryClient.invalidateQueries({ queryKey: ['analytics-entries', eventId] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `event_id=eq.${eventId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['schedule-matches', eventId] })
          queryClient.invalidateQueries({ queryKey: ['upcoming-matches', eventId] })
          queryClient.invalidateQueries({ queryKey: ['strategy-matches', eventId] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'picklists', filter: `event_id=eq.${eventId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['picklist', eventId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, queryClient])
}
