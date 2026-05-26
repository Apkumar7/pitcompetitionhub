'use client'

// ─── Analytics Page ────────────────────────────────────────────────────────
// Event-wide performance dashboards built entirely from scouting entries.
// Charts update in real-time as scouts submit new forms during the event.
//
// Data sources:
//   event_teams      → EPA, W/L, ranking (synced from TBA + Statbotics)
//   scouting_entries → auto/teleop pieces, climb levels, breakdown flags
//
// Charts:
//   Top Scorers      — avg (auto + teleop) pieces, top 12 teams
//   EPA Distribution — scatter: team vs EPA, colored by rank tier
//   Climb Breakdown  — stacked bar: L1/L2/L3 attempts per team
//   Auto Consistency — % of matches where the team scored in auto
//   Reliability      — 1 - (breakdowns / matches), red-to-green color scale
//
// All derived stats are computed client-side on each render from the raw
// scouting_entries rows. This is intentional: it keeps the server stateless
// and ensures charts reflect the latest data without a separate aggregation
// pipeline.
// ──────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/shared/EmptyState'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['analytics-teams', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, nickname, epa_mean, ranking, wins, losses')
        .eq('event_id', activeEvent!.id)
        .order('epa_mean', { ascending: false, nullsFirst: false })
        .limit(20)
      return data ?? []
    },
  })

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['analytics-entries', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('*')
        .eq('event_id', activeEvent!.id)
      return data ?? []
    },
  })

  type TeamStat = { auto: number[]; teleop: number[]; climbs: number[]; breakdowns: number; matches: number }
  // Group entries by team
  const teamStats = (entries as Record<string, unknown>[]).reduce<Record<number, TeamStat>>((acc, e) => {
    const t = e.team_number as number
    if (!acc[t]) acc[t] = { auto: [], teleop: [], climbs: [], breakdowns: 0, matches: 0 }
    acc[t].auto.push((e.auto_pieces_scored as number) ?? 0)
    acc[t].teleop.push((e.teleop_pieces_scored as number) ?? 0)
    acc[t].climbs.push((e.climb_level as number) ?? 0)
    if (e.breakdown || e.disconnect) acc[t].breakdowns++
    acc[t].matches++
    return acc
  }, {})

  const topScorers = Object.entries(teamStats)
    .map(([team, s]) => ({
      team: `T${team}`,
      avg: s.teleop.length > 0
        ? (s.auto.reduce((a, b) => a + b, 0) + s.teleop.reduce((a, b) => a + b, 0)) / s.teleop.length
        : 0,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 12)

  const climbData = Object.entries(teamStats)
    .map(([team, s]) => ({
      team: `T${team}`,
      lvl0: s.climbs.filter((c) => c === 0).length,
      lvl1: s.climbs.filter((c) => c === 1).length,
      lvl2: s.climbs.filter((c) => c === 2).length,
      lvl3: s.climbs.filter((c) => c === 3).length,
    }))
    .filter((t) => t.lvl1 + t.lvl2 + t.lvl3 > 0)
    .slice(0, 15)

  const autoData = Object.entries(teamStats)
    .map(([team, s]) => ({
      team: `T${team}`,
      rate: s.matches > 0 ? s.auto.filter((a) => a > 0).length / s.matches * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 12)

  const foulData = Object.entries(teamStats)
    .map(([team, s]) => ({
      team: `T${team}`,
      reliability: s.matches > 0 ? (1 - s.breakdowns / s.matches) * 100 : 100,
    }))
    .sort((a, b) => a.reliability - b.reliability)
    .slice(0, 12)

  const epaScatter = (teams as Array<Record<string, unknown>>).map((t) => ({
    team: t.team_number as number,
    epa: (t.epa_mean as number) ?? 0,
    rank: (t.ranking as number) ?? 999,
  }))

  if (!activeEvent) {
    return <EmptyState icon={BarChart3} title="No event selected" description="Choose an event from the top bar to view analytics." />
  }

  const loading = teamsLoading || entriesLoading

  return (
    <div className="min-h-full">
      <div className="border-b border-white/[0.05] px-6 py-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Intel</p>
        <h1 className="text-[22px] font-black tracking-tight text-white leading-none">Analytics</h1>
      </div>
    <div className="p-5 lg:p-7 space-y-4 max-w-6xl">

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 shimmer rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Scorers */}
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Top Scorers (avg pieces)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topScorers} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis dataKey="team" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
                    <Bar dataKey="avg" fill="#a855f7" radius={[0, 3, 3, 0]} name="Avg Pieces" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* EPA Distribution */}
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">EPA Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="team" name="Team" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis dataKey="epa" name="EPA" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }}
                      formatter={(val, name) => [typeof val === 'number' ? val.toFixed(1) : val, name]}
                    />
                    <Scatter data={epaScatter} fill="#a855f7">
                      {epaScatter.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.rank <= 8 ? '#10b981' : entry.rank <= 16 ? '#3b82f6' : entry.rank <= 24 ? '#a855f7' : '#64748b'}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Climb Breakdown */}
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Climb Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={climbData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="team" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
                    <Bar dataKey="lvl1" stackId="a" fill="#3b82f6" name="L1" />
                    <Bar dataKey="lvl2" stackId="a" fill="#a855f7" name="L2" />
                    <Bar dataKey="lvl3" stackId="a" fill="#10b981" name="L3" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Auto consistency */}
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Auto Consistency Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={autoData} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis dataKey="team" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }}
                      formatter={(v) => [`${Number(v).toFixed(0)}%`, 'Auto Rate']}
                    />
                    <Bar dataKey="rate" fill="#3b82f6" radius={[0, 3, 3, 0]} name="Auto Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Reliability */}
          <Card className="bg-[#0d0d18] border-white/[0.08] md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Reliability Score (lower = more issues)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={foulData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="team" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }}
                      formatter={(v) => [`${Number(v).toFixed(0)}%`, 'Reliability']}
                    />
                    <Bar dataKey="reliability" name="Reliability %" radius={[3, 3, 0, 0]}>
                      {foulData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.reliability >= 90 ? '#10b981' : entry.reliability >= 70 ? '#f59e0b' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {entries.length === 0 && !loading && (
        <p className="text-[#5a5a7a] text-[13px] text-center py-12">No scouting data yet. Start scouting matches to see analytics.</p>
      )}
    </div>
    </div>
  )
}
