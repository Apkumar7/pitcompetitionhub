'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ClipboardList } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'

export function ScoutingProgressWidget() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data } = useQuery({
    queryKey: ['scouting-progress', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const [{ count: assigned }, { count: completed }] = await Promise.all([
        supabase
          .from('scout_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', activeEvent!.id),
        supabase
          .from('scout_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', activeEvent!.id)
          .eq('completed', true),
      ])
      return { assigned: assigned ?? 0, completed: completed ?? 0 }
    },
  })

  if (!activeEvent) return null

  const pct = data?.assigned ? Math.round((data.completed / data.assigned) * 100) : 0

  return (
    <Card className="bg-[#0d0d18] border-white/[0.08]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-emerald-400" />
          Scouting Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm">{data?.completed ?? 0} / {data?.assigned ?? 0} assigned</span>
          <span className="text-white font-bold tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2 bg-slate-800" />
      </CardContent>
    </Card>
  )
}
