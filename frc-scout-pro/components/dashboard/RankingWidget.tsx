'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'

const OUR_TEAM = 418

export function RankingWidget() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data: team, isLoading } = useQuery({
    queryKey: ['our-team-ranking', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .eq('team_number', OUR_TEAM)
        .single()
      return data
    },
  })

  const { data: totalTeams } = useQuery({
    queryKey: ['total-teams', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { count } = await supabase
        .from('event_teams')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', activeEvent!.id)
      return count ?? 0
    },
  })

  if (!activeEvent) return null

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardContent className="p-4">
          <Skeleton className="shimmer" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0d0d18] border-white/[0.08]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          Team {OUR_TEAM} Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-bold text-white tabular-nums">
              {team?.ranking ?? '—'}
            </p>
            <p className="text-slate-400 text-xs">of {totalTeams}</p>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-emerald-400 font-bold text-lg tabular-nums">{team?.wins ?? 0}</p>
              <p className="text-slate-500 text-xs">W</p>
            </div>
            <div>
              <p className="text-red-400 font-bold text-lg tabular-nums">{team?.losses ?? 0}</p>
              <p className="text-slate-500 text-xs">L</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-lg tabular-nums">{team?.ties ?? 0}</p>
              <p className="text-slate-500 text-xs">T</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
