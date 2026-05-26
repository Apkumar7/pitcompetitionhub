'use client'

// ─── Drive Team Dashboard ──────────────────────────────────────────────────
// Post-match analytics hub for the drive team. Optimized for quick reads
// between matches (30-second match gap before the next queue call).
//
// Shows for each of Team 418's played matches:
//   • Score, win/loss, alliance color
//   • Our scouted auto/teleop/climb performance
//   • Win probability prediction vs actual result
//
// AI Analysis (Claude Haiku):
//   "Analyze" button POSTs match data to /api/ai/match-analysis and renders
//   bullet-point drive-coach insights. Cached per match so re-clicking is instant.
//
// Also shows upcoming (unplayed) matches with predicted win probability so
// the drive coach can prep strategy before queuing.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEventStore } from '@/store/eventStore'
import { formatMatchLabel, formatPercent } from '@/utils/format'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Sparkles, Trophy, AlertTriangle, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Match } from '@/types/database.types'

const OUR_TEAM = 418

// ── AI analysis cache (per match, per session) ────────────────────────────
const aiCache: Record<string, string[]> = {}

function MatchAnalysisPanel({ match, ourStats, teams }: {
  match: Match
  ourStats: Record<string, unknown> | null
  teams: Record<number, { nickname: string | null; epa_mean: number | null }>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bullets, setBullets] = useState<string[]>(aiCache[match.id] ?? [])

  const isRed = match.red_teams.includes(OUR_TEAM)
  const alliance = isRed ? 'red' : 'blue'
  const ourScore = isRed ? match.red_score : match.blue_score
  const oppScore = isRed ? match.blue_score : match.red_score
  const played = ourScore != null
  const won = played ? match.winner === alliance : null

  const partners = (isRed ? match.red_teams : match.blue_teams)
    .filter((t) => t !== OUR_TEAM)
    .map((t) => ({ team: t, nickname: teams[t]?.nickname ?? null, epa: teams[t]?.epa_mean ?? null }))

  const opponents = (isRed ? match.blue_teams : match.red_teams)
    .map((t) => ({ team: t, nickname: teams[t]?.nickname ?? null, epa: teams[t]?.epa_mean ?? null }))

  const label = formatMatchLabel(match.comp_level, match.match_number, match.set_number)

  async function runAnalysis() {
    if (bullets.length) { setOpen(true); return }
    setLoading(true)
    setOpen(true)
    try {
      const res = await fetch('/api/ai/match-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchLabel: label,
          ourTeam: OUR_TEAM,
          alliance,
          ourScore,
          opponentScore: oppScore,
          won,
          ourStats: ourStats ? {
            auto: ourStats.auto_pieces_scored ?? 0,
            teleop: ourStats.teleop_pieces_scored ?? 0,
            climb: ourStats.climb_level ?? 0,
            cycleCount: ourStats.cycle_count ?? 0,
            breakdown: ourStats.breakdown ?? false,
            disconnect: ourStats.disconnect ?? false,
          } : null,
          partners,
          opponents,
          notes: ourStats?.notes ? [ourStats.notes as string] : [],
        }),
      })
      const data = await res.json()
      const result: string[] = data.bullets ?? [data.analysis ?? 'No analysis available.']
      setBullets(result)
      aiCache[match.id] = result
    } catch {
      setBullets(['Analysis unavailable — check your ANTHROPIC_API_KEY.'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-colors',
      played
        ? won ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
        : 'bg-white/[0.03] border-white/[0.08]'
    )}>
      {/* Match header row */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-2 h-8 rounded-full shrink-0',
          isRed ? 'bg-red-500' : 'bg-blue-500'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold">{label}</span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-semibold',
              isRed ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
            )}>
              {isRed ? 'RED' : 'BLUE'}
            </span>
            {played && (
              <span className={cn(
                'text-sm font-black',
                won ? 'text-emerald-400' : 'text-red-400'
              )}>
                {won ? '✓ WIN' : '✗ LOSS'} {ourScore}–{oppScore}
              </span>
            )}
            {!played && match.red_win_prob != null && (
              <span className="text-xs text-slate-500">
                Win prob: {isRed
                  ? `${(match.red_win_prob * 100).toFixed(0)}%`
                  : `${((1 - match.red_win_prob) * 100).toFixed(0)}%`
                }
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Partners: {partners.map((p) => p.team).join(', ')} · vs {opponents.map((o) => o.team).join(', ')}
          </div>
        </div>

        {/* AI analysis button */}
        <button
          onClick={runAnalysis}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0',
            loading
              ? 'bg-purple-600/20 border-purple-500/30 text-purple-300 cursor-wait'
              : 'bg-purple-600/10 border-purple-500/20 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/40'
          )}
        >
          <Sparkles className={cn('h-3 w-3', loading && 'animate-pulse')} />
          {loading ? 'Analyzing…' : bullets.length ? 'View AI' : 'AI Analysis'}
          {bullets.length > 0 && !loading && (
            open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Scouted performance stats (if data exists) */}
      {ourStats && played && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Auto', value: String(ourStats.auto_pieces_scored ?? 0) },
            { label: 'Teleop', value: String(ourStats.teleop_pieces_scored ?? 0) },
            { label: 'Climb', value: (ourStats.climb_level as number) > 0 ? `L${ourStats.climb_level}` : '—' },
            {
              label: 'Status',
              value: ourStats.breakdown || ourStats.disconnect ? '⚠️ Issue' : '✓ OK',
              warn: !!(ourStats.breakdown || ourStats.disconnect),
            },
          ].map(({ label, value, warn }) => (
            <div key={label} className="bg-white/[0.04] rounded-lg p-2 text-center">
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">{label}</p>
              <p className={cn('text-white font-bold text-sm', warn && 'text-amber-400')}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {!ourStats && played && (
        <p className="text-slate-600 text-xs">No scouting data recorded for this match.</p>
      )}

      {/* AI analysis bullets */}
      {open && bullets.length > 0 && (
        <div className="bg-purple-950/30 border border-purple-500/15 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">AI Drive Coach Analysis</span>
          </div>
          {bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-purple-500 text-xs mt-0.5 shrink-0">•</span>
              <p className="text-slate-200 text-xs leading-relaxed">{b}</p>
            </div>
          ))}
          <p className="text-slate-600 text-[10px] pt-1 border-t border-white/[0.05]">Generated from match data · For strategic reference only</p>
        </div>
      )}
    </div>
  )
}

export default function DriveTeamPage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  // All matches for Team 418 at this event
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['drive-team-matches', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .or(`red_teams.cs.{${OUR_TEAM}},blue_teams.cs.{${OUR_TEAM}}`)
        .order('scheduled_time', { ascending: true })
      return (data ?? []) as Match[]
    },
  })

  // Scouting entries for Team 418 at this event (latest entry per match)
  const { data: scoutEntries = [] } = useQuery({
    queryKey: ['drive-team-entries', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .eq('team_number', OUR_TEAM)
        .order('submitted_at', { ascending: false })
      return data ?? []
    },
  })

  // Team EPA lookup for partners + opponents
  const { data: teamsRaw = [] } = useQuery({
    queryKey: ['drive-team-epas', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, nickname, epa_mean')
        .eq('event_id', activeEvent!.id)
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const teams: Record<number, { nickname: string | null; epa_mean: number | null }> = {}
  for (const t of teamsRaw as Array<Record<string, unknown>>) {
    teams[t.team_number as number] = {
      nickname: t.nickname as string | null,
      epa_mean: t.epa_mean as number | null,
    }
  }

  // Index scouting entries by match_id (most recent first)
  const entryByMatch: Record<string, Record<string, unknown>> = {}
  for (const e of scoutEntries as Array<Record<string, unknown>>) {
    if (!entryByMatch[e.match_id as string]) {
      entryByMatch[e.match_id as string] = e
    }
  }

  const playedMatches = matches.filter((m) => m.red_score != null)
  const upcomingMatches = matches.filter((m) => m.red_score == null)

  // W/L record
  const wins = playedMatches.filter((m) => {
    const isRed = m.red_teams.includes(OUR_TEAM)
    return m.winner === (isRed ? 'red' : 'blue')
  }).length
  const losses = playedMatches.length - wins

  // Performance history chart data
  const chartData = playedMatches.map((m) => {
    const label = formatMatchLabel(m.comp_level, m.match_number, m.set_number)
    const e = entryByMatch[m.id]
    return {
      match: label,
      auto: (e?.auto_pieces_scored as number) ?? 0,
      teleop: (e?.teleop_pieces_scored as number) ?? 0,
    }
  })

  if (!activeEvent) {
    return <EmptyState icon={Zap} title="No event selected" description="Select an event to view drive team analytics." />
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-white/[0.05] px-6 py-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Drive Team</p>
        <div className="flex items-end justify-between">
          <h1 className="text-[22px] font-black tracking-tight text-white leading-none">Post-Match Intel</h1>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-black text-lg">{wins}W</span>
            <span className="text-slate-600">–</span>
            <span className="text-red-400 font-black text-lg">{losses}L</span>
          </div>
        </div>
      </div>

      <div className="p-5 lg:p-7 max-w-4xl space-y-5">

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1">Matches Played</p>
              <p className="text-white font-black text-2xl">{playedMatches.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1">Win Rate</p>
              <p className="text-white font-black text-2xl">
                {playedMatches.length > 0 ? `${Math.round((wins / playedMatches.length) * 100)}%` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardContent className="p-4 text-center">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-1">Upcoming</p>
              <p className="text-white font-black text-2xl">{upcomingMatches.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Scoring history chart */}
        {chartData.length > 0 && (
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                Scoring History — Team {OUR_TEAM}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="match" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11 }} />
                    <Bar dataKey="auto" fill="#3b82f6" name="Auto" stackId="a" />
                    <Bar dataKey="teleop" fill="#a855f7" name="Teleop" stackId="a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming matches */}
        {upcomingMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Upcoming Matches</h2>
            </div>
            <div className="space-y-2">
              {upcomingMatches.slice(0, 3).map((m) => {
                const isRed = m.red_teams.includes(OUR_TEAM)
                const label = formatMatchLabel(m.comp_level, m.match_number, m.set_number)
                const winProb = isRed ? m.red_win_prob : m.red_win_prob != null ? 1 - m.red_win_prob : null
                const partners = (isRed ? m.red_teams : m.blue_teams).filter((t) => t !== OUR_TEAM)
                const opponents = isRed ? m.blue_teams : m.red_teams
                return (
                  <div key={m.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border',
                    isRed ? 'border-red-500/25 bg-red-500/5' : 'border-blue-500/25 bg-blue-500/5'
                  )}>
                    <div>
                      <p className="text-white font-bold text-sm">{label}</p>
                      <p className="text-slate-500 text-xs">
                        With {partners.join(', ')} vs {opponents.join(', ')}
                      </p>
                    </div>
                    {winProb != null && (
                      <div className="ml-auto text-right shrink-0">
                        <p className={cn('font-bold text-sm', winProb >= 0.5 ? 'text-emerald-400' : 'text-amber-400')}>
                          {(winProb * 100).toFixed(0)}% win
                        </p>
                        <p className="text-slate-600 text-[10px]">predicted</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Match-by-match analysis */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Played Matches</h2>
          </div>
          {matchesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 shimmer rounded-xl" />)}
            </div>
          ) : playedMatches.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">No matches played yet.</p>
          ) : (
            <div className="space-y-3">
              {[...playedMatches].reverse().map((m) => (
                <MatchAnalysisPanel
                  key={m.id}
                  match={m}
                  ourStats={entryByMatch[m.id] ?? null}
                  teams={teams}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
