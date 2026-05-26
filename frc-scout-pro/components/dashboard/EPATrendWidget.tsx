'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'

const OUR_TEAM = 418

export function EPATrendWidget() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data: entries, isLoading } = useQuery({
    queryKey: ['epa-trend', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('submitted_at, teleop_pieces_scored, auto_pieces_scored, climb_level')
        .eq('event_id', activeEvent!.id)
        .eq('team_number', OUR_TEAM)
        .order('submitted_at', { ascending: true })
        .limit(10)
      return data ?? []
    },
  })

  const chartData = entries?.map((e: Record<string, unknown>, i: number) => ({
    match: i + 1,
    score: ((e.auto_pieces_scored as number) ?? 0) * 3 + ((e.teleop_pieces_scored as number) ?? 0) * 2 + ((e.climb_level as number) ?? 0) * 5,
  }))

  if (!activeEvent) return null

  if (isLoading) {
    return (
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardContent className="p-4"><Skeleton className="shimmer" /></CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#0d0d18] border-white/[0.08]">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          Team {OUR_TEAM} Performance Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!chartData || chartData.length === 0) ? (
          <p className="text-slate-500 text-sm">No scouting data yet</p>
        ) : (
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                  labelFormatter={(v) => `Match ${v}`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
