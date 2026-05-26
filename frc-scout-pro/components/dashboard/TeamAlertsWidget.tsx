'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function TeamAlertsWidget() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data: alerts } = useQuery({
    queryKey: ['team-alerts', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('team_number, breakdown, disconnect, brownout')
        .eq('event_id', activeEvent!.id)

      if (!data) return []

      const counts: Record<number, { breakdowns: number; disconnects: number; brownouts: number }> = {}
      for (const e of data) {
        const t = e.team_number as number
        if (!counts[t]) counts[t] = { breakdowns: 0, disconnects: 0, brownouts: 0 }
        if (e.breakdown) counts[t].breakdowns++
        if (e.disconnect) counts[t].disconnects++
        if (e.brownout) counts[t].brownouts++
      }

      return Object.entries(counts)
        .filter(([, c]) => c.breakdowns >= 2 || c.disconnects >= 1)
        .map(([team, c]) => ({ team: Number(team), ...c }))
        .sort((a, b) => (b.breakdowns + b.disconnects) - (a.breakdowns + a.disconnects))
        .slice(0, 8)
    },
  })

  if (!activeEvent) return null

  return (
    <Card className="bg-[#0d0d18] border-white/[0.08]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Reliability Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-3">
        {(!alerts || alerts.length === 0) ? (
          <p className="text-slate-500 text-sm">No reliability issues flagged</p>
        ) : (
          alerts.map((a) => (
            <Link
              key={a.team}
              href={`/teams/${a.team}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <span className="text-white text-sm font-medium">Team {a.team}</span>
              <div className="flex items-center gap-2 text-xs">
                {a.breakdowns > 0 && (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded">
                    {a.breakdowns}× breakdown
                  </span>
                )}
                {a.disconnects > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    {a.disconnects}× disconnect
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
