'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import { formatMatchLabel } from '@/utils/format'
import { cn } from '@/lib/utils'
import { parseISO, differenceInSeconds } from 'date-fns'

const OUR_TEAM = 418

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'NOW'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

export function MatchCountdown() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { data: nextMatch } = useQuery({
    queryKey: ['next-match', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .contains('red_teams', [OUR_TEAM])
        .or(`red_teams.cs.{${OUR_TEAM}},blue_teams.cs.{${OUR_TEAM}}`)
        .is('actual_time', null)
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  if (!activeEvent || !nextMatch) return null

  const red = (nextMatch.red_teams as number[]) ?? []
  const alliance = red.includes(OUR_TEAM) ? 'red' : 'blue'
  const scheduledTime = nextMatch.scheduled_time
  const secondsUntil = scheduledTime
    ? Math.max(0, differenceInSeconds(parseISO(scheduledTime), new Date(now)))
    : null

  const label = formatMatchLabel(nextMatch.comp_level as string, nextMatch.match_number as number, nextMatch.set_number as number)

  return (
    <Card className={cn(
      'border-0',
      alliance === 'red' ? 'bg-red-950/50 border border-red-500/30' : 'bg-blue-950/50 border border-blue-500/30'
    )}>
      <CardContent className="p-4 text-center">
        <p className={cn('text-xs font-bold uppercase tracking-widest mb-1', alliance === 'red' ? 'text-red-400' : 'text-blue-400')}>
          Next Match · We are {alliance.toUpperCase()}
        </p>
        <p className="text-white font-bold text-lg mb-2">{label}</p>
        <p className={cn('text-5xl font-black tabular-nums tracking-tight', alliance === 'red' ? 'text-red-300' : 'text-blue-300')}>
          {secondsUntil != null ? formatCountdown(secondsUntil) : 'TBD'}
        </p>
      </CardContent>
    </Card>
  )
}
