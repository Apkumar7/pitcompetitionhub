'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EPABadge } from '@/components/shared/EPABadge'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import { formatMatchLabel, formatTime } from '@/utils/format'
import { Clock, AlertTriangle, Calendar } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

const OUR_TEAM = 418

export function UpcomingMatchCard() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data: matches, isLoading } = useQuery({
    queryKey: ['upcoming-matches', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .is('actual_time', null)
        .order('scheduled_time', { ascending: true })
        .limit(3)
      return data ?? []
    },
  })

  const { data: teamEPAs } = useQuery({
    queryKey: ['team-epas', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, epa_mean')
        .eq('event_id', activeEvent!.id)
      const map: Record<number, number> = {}
      data?.forEach((t: { team_number: number; epa_mean: number | null }) => {
        if (t.epa_mean != null) map[t.team_number] = t.epa_mean
      })
      return map
    },
  })

  if (!activeEvent) {
    return (
      <Card className="bg-slate-900/50 border-white/[0.06]">
        <EmptyState icon={Calendar} title="No event selected" description="Choose an event from the top bar to see upcoming matches." />
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Upcoming Matches</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-slate-800" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0d0d18] border-white/[0.08]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-400" />
          Upcoming Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(!matches || matches.length === 0) && (
          <p className="text-slate-500 text-sm">No upcoming matches scheduled</p>
        )}
        {matches?.map((match: Record<string, unknown>) => {
          const red = (match.red_teams as number[]) ?? []
          const blue = (match.blue_teams as number[]) ?? []
          const redProb = match.red_win_prob as number | null
          const label = formatMatchLabel(match.comp_level as string, match.match_number as number, match.set_number as number)
          const time = formatTime(match.scheduled_time as string | null)
          const ourAlliance = red.includes(OUR_TEAM) ? 'red' : blue.includes(OUR_TEAM) ? 'blue' : null

          return (
            <div key={match.id as string} className={cn(
              'rounded-lg border p-3 text-sm',
              ourAlliance === 'red' ? 'border-red-500/40 bg-red-500/5' : ourAlliance === 'blue' ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-800 bg-slate-800/40'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{label}</span>
                <span className="text-slate-400 text-xs">{time}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-red-400 text-[10px] font-bold mb-1">RED</p>
                  {red.map((t) => (
                    <div key={t} className="flex items-center justify-between gap-1">
                      <span className={cn('text-xs', t === OUR_TEAM ? 'text-white font-bold' : 'text-slate-300')}>{t}</span>
                      {teamEPAs && <EPABadge value={teamEPAs[t]} />}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-blue-400 text-[10px] font-bold mb-1">BLUE</p>
                  {blue.map((t) => (
                    <div key={t} className="flex items-center justify-between gap-1">
                      <span className={cn('text-xs', t === OUR_TEAM ? 'text-white font-bold' : 'text-slate-300')}>{t}</span>
                      {teamEPAs && <EPABadge value={teamEPAs[t]} />}
                    </div>
                  ))}
                </div>
              </div>
              {redProb != null && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(redProb * 100).toFixed(0)}%`,
                        background: 'linear-gradient(to right, #ef4444, #f97316)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-0.5">
                    <span className="text-red-400">Red {(redProb * 100).toFixed(0)}%</span>
                    <span className="text-blue-400">Blue {((1 - redProb) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
