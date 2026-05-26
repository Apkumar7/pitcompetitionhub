'use client'

// ─── Pit Crew Dashboard ────────────────────────────────────────────────────
// Real-time breakdown tracker and robot reliability monitor.
// Designed to be running on a tablet in the pit during an event.
//
// Features:
//   • Live breakdown log — every scouting entry that flagged breakdown or
//     disconnect, sorted newest first, across all teams
//   • Reliability leaderboard — teams ranked worst-to-best
//   • "Our Robot" tab — breakdown history for Team 418 only
//   • Quick report form — pit crew can log a breakdown directly (creates a
//     pit note, doesn't require a full scouting form)
//
// Notifications: pit crew users receive a push notification whenever any
// scout submits an entry with breakdown=true or disconnect=true.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEventStore } from '@/store/eventStore'
import { formatMatchLabel, timeAgo } from '@/utils/format'
import { cn } from '@/lib/utils'
import { Wrench, AlertTriangle, CheckCircle, RefreshCw, Zap, Radio } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from 'sonner'

const OUR_TEAM = 418

type BreakdownEntry = {
  id: string
  match_id: string
  team_number: number
  breakdown: boolean
  disconnect: boolean
  brownout: boolean
  notes: string | null
  submitted_at: string
  comp_level: string
  match_number: number
  set_number: number
}

type TeamReliability = {
  team_number: number
  nickname: string | null
  total: number
  issues: number
  reliability: number
}

export default function PitCrewPage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'all' | 'ours'>('all')
  const [refreshing, setRefreshing] = useState(false)

  // All scouting entries with breakdown/disconnect flags + match info
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['pit-crew-entries', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data: scoutData } = await supabase
        .from('scouting_entries')
        .select('id, match_id, team_number, breakdown, disconnect, brownout, notes, submitted_at')
        .eq('event_id', activeEvent!.id)
        .or('breakdown.eq.true,disconnect.eq.true,brownout.eq.true')
        .order('submitted_at', { ascending: false })

      if (!scoutData || scoutData.length === 0) return []

      // Pull match labels for display
      const matchIds = [...new Set(scoutData.map((e: Record<string, unknown>) => e.match_id as string))]
      const { data: matchData } = await supabase
        .from('matches')
        .select('id, comp_level, match_number, set_number')
        .in('id', matchIds)

      const matchMap: Record<string, { comp_level: string; match_number: number; set_number: number }> = {}
      for (const m of (matchData ?? []) as Array<Record<string, unknown>>) {
        matchMap[m.id as string] = {
          comp_level: m.comp_level as string,
          match_number: m.match_number as number,
          set_number: m.set_number as number,
        }
      }

      return scoutData.map((e: Record<string, unknown>) => ({
        ...e,
        ...(matchMap[e.match_id as string] ?? { comp_level: '?', match_number: 0, set_number: 1 }),
      })) as BreakdownEntry[]
    },
    // Refresh every 30 seconds — pit crew needs near-realtime updates
    refetchInterval: 30_000,
  })

  // Reliability stats for all teams (for the leaderboard)
  const { data: allEntries = [] } = useQuery({
    queryKey: ['pit-crew-all-entries', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('team_number, breakdown, disconnect')
        .eq('event_id', activeEvent!.id)
      return (data ?? []) as Array<{ team_number: number; breakdown: boolean; disconnect: boolean }>
    },
    staleTime: 2 * 60 * 1000,
  })

  const { data: teamsRaw = [] } = useQuery({
    queryKey: ['pit-crew-teams', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, nickname')
        .eq('event_id', activeEvent!.id)
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const nicknameMap: Record<number, string | null> = {}
  for (const t of teamsRaw as Array<Record<string, unknown>>) {
    nicknameMap[t.team_number as number] = t.nickname as string | null
  }

  // Build reliability per team
  const statsMap: Record<number, { total: number; issues: number }> = {}
  for (const e of allEntries) {
    if (!statsMap[e.team_number]) statsMap[e.team_number] = { total: 0, issues: 0 }
    statsMap[e.team_number].total++
    if (e.breakdown || e.disconnect) statsMap[e.team_number].issues++
  }

  const reliability: TeamReliability[] = Object.entries(statsMap)
    .map(([team, s]) => ({
      team_number: Number(team),
      nickname: nicknameMap[Number(team)] ?? null,
      total: s.total,
      issues: s.issues,
      reliability: s.total > 0 ? (1 - s.issues / s.total) * 100 : 100,
    }))
    .filter((t) => t.issues > 0)
    .sort((a, b) => a.reliability - b.reliability)

  const ourEntries = entries.filter((e) => e.team_number === OUR_TEAM)
  const allBreakdowns = tab === 'ours' ? ourEntries : entries

  async function refresh() {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['pit-crew-entries'] })
    await queryClient.invalidateQueries({ queryKey: ['pit-crew-all-entries'] })
    toast.success('Refreshed')
    setRefreshing(false)
  }

  if (!activeEvent) {
    return <EmptyState icon={Wrench} title="No event selected" description="Select an event to view robot status." />
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-white/[0.05] px-6 py-7 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Pit Crew</p>
          <h1 className="text-[22px] font-black tracking-tight text-white leading-none">Robot Status</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse" />
            Live · 30s refresh
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-5 lg:p-7 max-w-5xl space-y-5">

        {/* Status strip */}
        <div className="grid grid-cols-3 gap-3">
          <Card className={cn('border', entries.length > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-emerald-950/20 border-emerald-500/20')}>
            <CardContent className="p-4 text-center">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1">Total Incidents</p>
              <p className={cn('font-black text-2xl', entries.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {entries.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1">Teams Affected</p>
              <p className="text-white font-black text-2xl">{reliability.length}</p>
            </CardContent>
          </Card>
          <Card className={cn('border', ourEntries.length > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-[#0d0d18] border-white/[0.08]')}>
            <CardContent className="p-4 text-center">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1">Our Issues</p>
              <p className={cn('font-black text-2xl', ourEntries.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {ourEntries.length > 0 ? ourEntries.length : '✓ 0'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Breakdown log */}
          <div className="xl:col-span-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'ours')}>
              <TabsList className="bg-white/[0.05] border border-white/[0.07] mb-4">
                <TabsTrigger value="all" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-[#6b6b8a]">
                  All Teams
                </TabsTrigger>
                <TabsTrigger value="ours" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-[#6b6b8a]">
                  Team {OUR_TEAM} Only
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tab}>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 shimmer rounded-lg" />)}
                  </div>
                ) : allBreakdowns.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                    <p className="text-emerald-400 font-semibold text-sm">
                      {tab === 'ours' ? 'No issues recorded for Team 418' : 'No breakdowns recorded yet'}
                    </p>
                    <p className="text-slate-600 text-xs">Scouts will flag issues during matches</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allBreakdowns.map((e) => {
                      const label = formatMatchLabel(e.comp_level, e.match_number, e.set_number)
                      const isOurs = e.team_number === OUR_TEAM
                      const issues: string[] = [
                        e.breakdown ? 'Breakdown' : null,
                        e.disconnect ? 'Disconnect' : null,
                        e.brownout ? 'Brownout' : null,
                      ].filter((x): x is string => x !== null)

                      return (
                        <div key={e.id} className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border',
                          isOurs
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-white/[0.06] bg-white/[0.02]'
                        )}>
                          <AlertTriangle className={cn('h-4 w-4 mt-0.5 shrink-0', isOurs ? 'text-red-400' : 'text-amber-400')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('font-bold text-sm', isOurs ? 'text-red-300' : 'text-white')}>
                                Team {e.team_number}
                                {isOurs && ' (US)'}
                              </span>
                              {nicknameMap[e.team_number] && (
                                <span className="text-slate-500 text-xs">{nicknameMap[e.team_number]}</span>
                              )}
                              <span className="text-slate-600 text-xs">{label}</span>
                              <div className="flex gap-1 flex-wrap">
                                {issues.map((issue) => (
                                  <span key={issue} className="bg-red-500/15 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {e.notes && (
                              <p className="text-slate-400 text-xs mt-1 italic">"{e.notes}"</p>
                            )}
                          </div>
                          <span className="text-slate-600 text-[10px] shrink-0">{timeAgo(e.submitted_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Reliability leaderboard */}
          <div>
            <Card className="bg-[#0d0d18] border-white/[0.08]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Most Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reliability.length === 0 ? (
                  <p className="text-slate-600 text-xs text-center py-4">No reliability data yet</p>
                ) : (
                  reliability.slice(0, 10).map((t) => (
                    <div key={t.team_number} className="flex items-center gap-2">
                      <span className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        t.reliability < 70 ? 'bg-red-400' : t.reliability < 85 ? 'bg-amber-400' : 'bg-emerald-400'
                      )} />
                      <span className={cn(
                        'text-sm font-semibold',
                        t.team_number === OUR_TEAM ? 'text-purple-300' : 'text-white'
                      )}>
                        {t.team_number}
                        {t.team_number === OUR_TEAM && ' ★'}
                      </span>
                      <span className="text-slate-500 text-xs truncate flex-1">{t.nickname ?? ''}</span>
                      <span className={cn(
                        'text-xs font-bold tabular-nums',
                        t.reliability < 70 ? 'text-red-400' : t.reliability < 85 ? 'text-amber-400' : 'text-emerald-400'
                      )}>
                        {t.reliability.toFixed(0)}%
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
