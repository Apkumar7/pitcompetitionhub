'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EPABadge } from '@/components/shared/EPABadge'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function EventLeaderboard() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data: teams, isLoading } = useQuery({
    queryKey: ['event-leaderboard', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, nickname, epa_mean, ranking, wins, losses')
        .eq('event_id', activeEvent!.id)
        .order('epa_mean', { ascending: false, nullsFirst: false })
        .limit(10)
      return data ?? []
    },
  })

  if (!activeEvent) return null

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardContent className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 bg-slate-800" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0d0d18] border-white/[0.08]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          Event Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3">
        {teams?.map((team: Record<string, unknown>, idx: number) => (
          <Link
            key={team.team_number as number}
            href={`/teams/${team.team_number}`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
          >
            <span className="text-slate-500 text-xs w-5 text-right tabular-nums">{idx + 1}</span>
            <span className="text-white text-sm font-medium flex-1 truncate group-hover:text-purple-300 transition-colors">
              {String(team.team_number)}
              {Boolean(team.nickname) && <span className="text-slate-400 text-xs ml-1">· {String(team.nickname)}</span>}
            </span>
            <EPABadge value={team.epa_mean as number | null} />
          </Link>
        ))}
        {(!teams || teams.length === 0) && (
          <p className="text-slate-500 text-sm text-center py-4">No team data yet. Sync from TBA.</p>
        )}
      </CardContent>
    </Card>
  )
}
