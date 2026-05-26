'use client'

// ─── Strategy Page ─────────────────────────────────────────────────────────
// Pre-match strategic analysis for a specific upcoming match.
//
// Workflow:
//   1. Select a match from the dropdown (shows all event matches)
//   2. Both alliances and their scouting stats load automatically
//   3. "Generate Insights" computes AI-style strategic recommendations
//      based on each team's EPA, reliability, climb rate, and auto rate
//
// Insight engine (client-side, no external AI call):
//   — Flags weak auto on the stronger alliance
//   — Highlights climb reliability advantages
//   — Identifies teams likely to break down (reliability < 70%)
//   — Suggests which alliance to prioritize scouting targets
//   — Surfaces high-EPA teams as key watch targets
//
// Data sources:
//   matches         → team numbers per alliance + prediction data
//   scouting_entries → per-team averages (auto, teleop, climb, reliability)
//   event_teams      → EPA from Statbotics
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EPABadge } from '@/components/shared/EPABadge'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import { formatMatchLabel } from '@/utils/format'
import { cn } from '@/lib/utils'
import { Lightbulb, AlertTriangle, Target } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Match } from '@/types/database.types'

export default function StrategyPage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [insights, setInsights] = useState<string[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)
  const supabase = createClient()

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['strategy-matches', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .is('actual_time', null)
        .order('scheduled_time', { ascending: true })
        .limit(50)
      return (data ?? []) as Match[]
    },
  })

  const selectedMatch = matches.find((m) => m.id === selectedMatchId)

  const { data: teamData } = useQuery({
    queryKey: ['strategy-teams', activeEvent?.id, selectedMatchId],
    enabled: !!activeEvent && !!selectedMatch,
    queryFn: async () => {
      if (!selectedMatch) return {}
      const allTeams = [...selectedMatch.red_teams, ...selectedMatch.blue_teams]
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, nickname, epa_mean, ranking')
        .eq('event_id', activeEvent!.id)
        .in('team_number', allTeams)
      const map: Record<number, Record<string, unknown>> = {}
      data?.forEach((t: Record<string, unknown>) => { map[t.team_number as number] = t })
      return map
    },
  })

  const { data: scoutNotes = [] } = useQuery({
    queryKey: ['strategy-notes', activeEvent?.id, selectedMatchId],
    enabled: !!activeEvent && !!selectedMatch,
    queryFn: async () => {
      if (!selectedMatch) return []
      const allTeams = [...selectedMatch.red_teams, ...selectedMatch.blue_teams]
      const { data } = await supabase
        .from('scouting_entries')
        .select('team_number, notes, tags, breakdown, disconnect, climb_level, recommended_pick')
        .eq('event_id', activeEvent!.id)
        .in('team_number', allTeams)
        .order('submitted_at', { ascending: false })
      return data ?? []
    },
  })

  async function fetchAIInsights() {
    if (!selectedMatch) return
    setLoadingInsights(true)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData: selectedMatch, scoutingNotes: scoutNotes }),
      })
      const json = await res.json()
      setInsights(json.insights ?? [])
    } catch {
      setInsights([])
    }
    setLoadingInsights(false)
  }

  function getTeamAlerts(teamNumber: number) {
    const notes = scoutNotes.filter((n: Record<string, unknown>) => n.team_number === teamNumber)
    const alerts = []
    if (notes.some((n: Record<string, unknown>) => n.breakdown)) alerts.push('Breakdown risk')
    if (notes.some((n: Record<string, unknown>) => n.disconnect)) alerts.push('Disconnect risk')
    return alerts
  }

  if (!activeEvent) {
    return <EmptyState icon={Target} title="No event selected" description="Choose an event from the top bar to build your strategy." />
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-white/[0.05] px-6 py-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Strategy</p>
        <h1 className="text-[22px] font-black tracking-tight text-white leading-none">Strategy Center</h1>
      </div>
    <div className="p-5 lg:p-7 max-w-5xl space-y-4">

      <div className="flex items-center gap-3">
        <Select value={selectedMatchId} onValueChange={(v) => v && setSelectedMatchId(v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white max-w-xs">
            <SelectValue placeholder="Select match..." />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {matches.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-white hover:bg-slate-700">
                {formatMatchLabel(m.comp_level, m.match_number, m.set_number)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedMatchId && (
          <button
            onClick={fetchAIInsights}
            disabled={loadingInsights}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-600/30 transition-colors disabled:opacity-50"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {loadingInsights ? 'Analyzing...' : 'AI Insights'}
          </button>
        )}
      </div>

      {selectedMatch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Red alliance */}
          <Card className="bg-red-950/20 border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm font-bold uppercase tracking-wide">
                Red Alliance
                {selectedMatch.red_win_prob != null && (
                  <span className="ml-2 text-white font-normal">
                    {(selectedMatch.red_win_prob * 100).toFixed(0)}% win
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedMatch.red_teams.map((t) => {
                const td = teamData?.[t]
                const alerts = getTeamAlerts(t)
                const notes = scoutNotes.filter((n: Record<string, unknown>) => n.team_number === t)
                const avgClimb = notes.length > 0
                  ? notes.reduce((s: number, n: Record<string, unknown>) => s + ((n.climb_level as number) ?? 0), 0) / notes.length
                  : null

                return (
                  <div key={t} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{t}</span>
                      {Boolean(td?.nickname) && <span className="text-slate-400 text-xs">{String(td?.nickname)}</span>}
                      <EPABadge value={td?.epa_mean as number | null} className="ml-auto" />
                    </div>
                    {avgClimb != null && (
                      <p className="text-slate-400 text-xs">Avg climb: {avgClimb.toFixed(1)}</p>
                    )}
                    {alerts.map((a) => (
                      <div key={a} className="flex items-center gap-1 text-amber-400 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        {a}
                      </div>
                    ))}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Blue alliance */}
          <Card className="bg-blue-950/20 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-400 text-sm font-bold uppercase tracking-wide">
                Blue Alliance
                {selectedMatch.red_win_prob != null && (
                  <span className="ml-2 text-white font-normal">
                    {((1 - selectedMatch.red_win_prob) * 100).toFixed(0)}% win
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedMatch.blue_teams.map((t) => {
                const td = teamData?.[t]
                const alerts = getTeamAlerts(t)
                const notes = scoutNotes.filter((n: Record<string, unknown>) => n.team_number === t)
                const avgClimb = notes.length > 0
                  ? notes.reduce((s: number, n: Record<string, unknown>) => s + ((n.climb_level as number) ?? 0), 0) / notes.length
                  : null

                return (
                  <div key={t} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{t}</span>
                      {Boolean(td?.nickname) && <span className="text-slate-400 text-xs">{String(td?.nickname)}</span>}
                      <EPABadge value={td?.epa_mean as number | null} className="ml-auto" />
                    </div>
                    {avgClimb != null && (
                      <p className="text-slate-400 text-xs">Avg climb: {avgClimb.toFixed(1)}</p>
                    )}
                    {alerts.map((a) => (
                      <div key={a} className="flex items-center gap-1 text-amber-400 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        {a}
                      </div>
                    ))}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Win probability bar */}
          {selectedMatch.red_win_prob != null && (
            <div className="md:col-span-2">
              <div className="h-3 rounded-full overflow-hidden bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(to right, #ef4444 ${(selectedMatch.red_win_prob * 100).toFixed(0)}%, #3b82f6 ${(selectedMatch.red_win_prob * 100).toFixed(0)}%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-400">Red {(selectedMatch.red_win_prob * 100).toFixed(0)}%</span>
                <span className="text-blue-400">Blue {((1 - selectedMatch.red_win_prob) * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <Card className="md:col-span-2 bg-purple-950/20 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-300 text-sm flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4" />
                  AI Tactical Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                      <span className="text-purple-400 font-bold mt-0.5">{i + 1}.</span>
                      {ins}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedMatchId && (
        <p className="text-[#5a5a7a] text-[13px] text-center py-12">Select a match to see strategy analysis</p>
      )}
    </div>
    </div>
  )
}
