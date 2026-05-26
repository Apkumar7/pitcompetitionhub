'use client'

// ─── Team Profile Page ─────────────────────────────────────────────────────
// Detailed view for a single team at the active event. Tabs:
//   Overview  — radar chart + scoring bar chart built from scouting entries
//   Matches   — every match the team played, with W/L and score
//   Pit       — pit scouting data (drivetrain, dimensions, language, etc.)
//   Notes     — free-text scout notes and tags from all scouting entries
//
// Also exposes:
//   Star button  → persists star to Supabase via useStarredTeams hook
//   Compare btn  → opens TeamCompareModal pre-seeded with this team
// ──────────────────────────────────────────────────────────────────────────

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EPABadge } from '@/components/shared/EPABadge'
import { AllianceBadge } from '@/components/shared/AllianceBadge'
import { useEventStore } from '@/store/eventStore'
import { useStarredTeams } from '@/hooks/useStarredTeams'
import { TeamCompareModal } from '@/components/teams/TeamCompareModal'
import { createClient } from '@/lib/supabase/client'
import { formatMatchLabel, formatTime, formatPercent } from '@/utils/format'
import { cn } from '@/lib/utils'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid
} from 'recharts'
import { Star, GitCompare } from 'lucide-react'
import type { Alliance } from '@/types/database.types'
import Link from 'next/link'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 text-center">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-xl tabular-nums">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

export default function TeamProfilePage({ params }: { params: Promise<{ teamNumber: string }> }) {
  const { teamNumber } = use(params)
  const teamNum = parseInt(teamNumber, 10)
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  // Compare modal visibility
  const [compareOpen, setCompareOpen] = useState(false)

  // Star system — optimistic updates, persisted to Supabase
  const { isStarred, toggleStar } = useStarredTeams()
  const starred = isStarred(teamNum)

  const { data: teamData } = useQuery({
    queryKey: ['team-event', teamNum, activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .eq('team_number', teamNum)
        .single()
      return data
    },
  })

  const { data: scoutEntries = [] } = useQuery({
    queryKey: ['team-scout-entries', teamNum, activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .eq('team_number', teamNum)
        .order('submitted_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: matches = [] } = useQuery({
    queryKey: ['team-matches', teamNum, activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .or(`red_teams.cs.{${teamNum}},blue_teams.cs.{${teamNum}}`)
        .order('scheduled_time', { ascending: true })
      return data ?? []
    },
  })

  const { data: pitData } = useQuery({
    queryKey: ['team-pit', teamNum, activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('pit_scouting')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .eq('team_number', teamNum)
        .maybeSingle()
      return data
    },
  })

  // Compute stats from scouting entries
  const totalEntries = scoutEntries.length
  const avgAuto = totalEntries
    ? scoutEntries.reduce((s: number, e: Record<string, unknown>) => s + ((e.auto_pieces_scored as number) ?? 0), 0) / totalEntries
    : 0
  const avgTeleop = totalEntries
    ? scoutEntries.reduce((s: number, e: Record<string, unknown>) => s + ((e.teleop_pieces_scored as number) ?? 0), 0) / totalEntries
    : 0
  const climbRate = totalEntries
    ? scoutEntries.filter((e: Record<string, unknown>) => (e.climb_level as number) > 0).length / totalEntries
    : 0
  const reliabilityScore = totalEntries
    ? 1 - scoutEntries.filter((e: Record<string, unknown>) => e.breakdown || e.disconnect).length / totalEntries
    : 1

  const radarData = [
    { subject: 'Auto', value: Math.min(10, avgAuto * 2) },
    { subject: 'Teleop', value: Math.min(10, avgTeleop) },
    { subject: 'Climb', value: climbRate * 10 },
    { subject: 'Defense', value: scoutEntries.filter((e: Record<string, unknown>) => e.defense_played).length / Math.max(1, totalEntries) * 10 },
    { subject: 'Reliability', value: reliabilityScore * 10 },
    { subject: 'Driver', value: totalEntries ? scoutEntries.reduce((s: number, e: Record<string, unknown>) => s + ((e.driver_smoothness as number) ?? 3), 0) / totalEntries * 2 : 6 },
  ]

  const scoreHistory = scoutEntries.map((e: Record<string, unknown>, i: number) => ({
    match: i + 1,
    auto: (e.auto_pieces_scored as number) ?? 0,
    teleop: (e.teleop_pieces_scored as number) ?? 0,
  })).reverse()

  if (!activeEvent) {
    return <div className="p-4 text-center text-slate-500 mt-10">Select an event first.</div>
  }

  return (
    <>
      {/* Compare modal — pre-seeds Team A with this team's number */}
      <TeamCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        initialTeamA={teamNum}
      />

    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-600/30 flex items-center justify-center">
          <span className="text-purple-300 font-black text-xl">{teamNum}</span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Team {teamNum}</h1>
          {teamData?.nickname && <p className="text-slate-300 text-sm">{teamData.nickname}</p>}
          {teamData?.city && <p className="text-slate-400 text-xs">{teamData.city}, {teamData.state_prov}</p>}
          <div className="flex items-center gap-2 mt-2">
            {teamData?.ranking && (
              <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs px-2 py-0.5 rounded font-medium">
                Rank #{teamData.ranking}
              </span>
            )}
            <span className="text-slate-400 text-xs">
              {teamData?.wins ?? 0}W-{teamData?.losses ?? 0}L-{teamData?.ties ?? 0}T
            </span>
            <EPABadge value={teamData?.epa_mean} />
          </div>
        </div>

        {/* Action buttons in the header */}
        <div className="flex items-center gap-2">
          {/* Star / unstar this team */}
          <button
            onClick={() => toggleStar(teamNum)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
              starred
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-white/[0.04] border-white/[0.1] text-slate-400 hover:text-amber-400'
            )}
            aria-label={starred ? 'Unstar team' : 'Star team'}
          >
            <Star className={cn('h-3.5 w-3.5', starred && 'fill-amber-400')} />
            {starred ? 'Starred' : 'Star'}
          </button>

          {/* Open head-to-head comparison */}
          <button
            onClick={() => setCompareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-600/10 border border-purple-600/30 text-purple-400 hover:bg-purple-600/20 transition-colors"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </button>

          <Link
            href={`/scout/match`}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Scout
          </Link>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Avg Auto" value={avgAuto.toFixed(1)} sub="pieces" />
        <StatCard label="Avg Teleop" value={avgTeleop.toFixed(1)} sub="pieces" />
        <StatCard label="Climb %" value={formatPercent(climbRate)} />
        <StatCard label="EPA" value={teamData?.epa_mean?.toFixed(1) ?? '—'} />
        <StatCard label="Reliability" value={formatPercent(reliabilityScore)} />
        <StatCard label="Entries" value={String(totalEntries)} sub="scouted" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-[#13131f]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">Matches</TabsTrigger>
          <TabsTrigger value="pit" className="data-[state=active]:bg-purple-600">Pit</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-purple-600">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {radarData.length > 0 && totalEntries > 0 && (
            <Card className="bg-[#0d0d18] border-white/[0.08]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Radar dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {scoreHistory.length > 0 && (
            <Card className="bg-[#0d0d18] border-white/[0.08]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Scoring History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="match" tick={{ fill: '#64748b', fontSize: 10 }} />
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
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {matches.map((match: Record<string, unknown>) => {
            const red = (match.red_teams as number[])
            const blue = (match.blue_teams as number[])
            const isRed = red.includes(teamNum)
            const alliance = isRed ? 'red' : 'blue'
            const label = formatMatchLabel(match.comp_level as string, match.match_number as number, match.set_number as number)
            const won = match.winner === alliance
            const score = isRed ? match.red_score : match.blue_score

            return (
              <div key={match.id as string} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-white font-semibold text-sm w-10">{label}</span>
                <AllianceBadge alliance={alliance as Alliance} />
                {match.red_score != null && (
                  <span className={cn('font-bold text-sm', won ? 'text-emerald-400' : 'text-red-400')}>
                    {won ? 'W' : 'L'} {score as number}
                  </span>
                )}
              </div>
            )
          })}
          {matches.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No matches yet</p>}
        </TabsContent>

        <TabsContent value="pit" className="mt-4">
          {pitData ? (
            <div className="space-y-3">
              <Card className="bg-[#0d0d18] border-white/[0.08]">
                <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Drivetrain', value: pitData.drivetrain },
                    { label: 'Weight', value: pitData.weight_lbs ? `${pitData.weight_lbs} lbs` : null },
                    { label: 'Size', value: pitData.width_in ? `${pitData.width_in}" × ${pitData.length_in}"` : null },
                    { label: 'Language', value: pitData.programming_language },
                    { label: 'Vision', value: pitData.vision_system },
                    { label: 'Role', value: pitData.preferred_role },
                    { label: 'Climb', value: pitData.climb_mechanism },
                    { label: 'Battery', value: pitData.battery_condition },
                  ].map(({ label, value }) => value && (
                    <div key={label}>
                      <p className="text-slate-400 text-xs">{label}</p>
                      <p className="text-white font-medium">{value as string}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {pitData.notes && (
                <Card className="bg-[#0d0d18] border-white/[0.08]">
                  <CardContent className="p-4">
                    <p className="text-slate-400 text-xs mb-1">Notes</p>
                    <p className="text-slate-200 text-sm">{pitData.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm mb-3">No pit scouting data yet</p>
              <Link href="/scout/pit" className="text-purple-400 hover:text-purple-300 text-sm underline">Scout this pit</Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-3">
          {scoutEntries.map((entry: Record<string, unknown>) => (
            <Card key={entry.id as string} className="bg-[#0d0d18] border-white/[0.08]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">{entry.scout_name as string} · {formatTime(entry.submitted_at as string)}</span>
                  <AllianceBadge alliance={entry.alliance as Alliance} />
                </div>
                {Boolean(entry.notes) && <p className="text-slate-200 text-sm mb-2">{entry.notes as string}</p>}
                {(entry.tags as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(entry.tags as string[]).map((t) => (
                      <span key={t} className="bg-purple-600/20 text-purple-300 text-xs px-2 py-0.5 rounded">#{t}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {scoutEntries.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No scout notes yet</p>}
        </TabsContent>
      </Tabs>
    </div>
    </>
  )
}
