'use client'

// ─── Team Comparison Modal ─────────────────────────────────────────────────
// Side-by-side comparison of two teams using Supabase-stored event data
// and scouting entries. Intended for alliance selection decisions.
//
// Data sources:
//   event_teams  → EPA, ranking, W/L record, nickname
//   scouting_entries → avg auto, avg teleop, climb rate, reliability
//   pit_scouting → drivetrain, preferred role, vision system
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEventStore } from '@/store/eventStore'
import { EPABadge } from '@/components/shared/EPABadge'
import { TeamAvatar } from '@/components/shared/TeamAvatar'
import { Input } from '@/components/ui/input'
import { X, GitCompare, Trophy, Zap, Shield, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface TeamSnapshot {
  team_number: number
  nickname: string | null
  epa_mean: number | null
  ranking: number | null
  wins: number
  losses: number
  // Computed from scouting entries
  avgAuto: number
  avgTeleop: number
  climbRate: number
  reliability: number
  entryCount: number
  // Pit scouting
  drivetrain: string | null
  preferredRole: string | null
  visionSystem: string | null
  programmingLanguage: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  // Pre-seed one team when opened from a team profile
  initialTeamA?: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function winRate(w: number, l: number): string {
  const total = w + l
  if (total === 0) return '—'
  return `${Math.round((w / total) * 100)}%`
}

function statColor(a: number, b: number, higherIsBetter = true): [string, string] {
  if (a === b) return ['text-white', 'text-white']
  const aWins = higherIsBetter ? a > b : a < b
  return aWins
    ? ['text-emerald-400 font-bold', 'text-slate-400']
    : ['text-slate-400', 'text-emerald-400 font-bold']
}

// ── Stat Row ───────────────────────────────────────────────────────────────

function StatRow({
  label,
  a,
  b,
  format = (v: number) => v.toFixed(1),
  higherIsBetter = true,
}: {
  label: string
  a: number | null
  b: number | null
  format?: (v: number) => string
  higherIsBetter?: boolean
}) {
  const av = a ?? 0
  const bv = b ?? 0
  const [ac, bc] = statColor(av, bv, higherIsBetter)

  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2 border-b border-white/[0.05]">
      <span className={cn('text-right tabular-nums text-sm', ac)}>
        {a == null ? '—' : format(av)}
      </span>
      <span className="text-center text-[11px] text-slate-500 font-medium uppercase tracking-wider px-1 leading-tight">
        {label}
      </span>
      <span className={cn('text-left tabular-nums text-sm', bc)}>
        {b == null ? '—' : format(bv)}
      </span>
    </div>
  )
}

function TextRow({ label, a, b }: { label: string; a: string | null; b: string | null }) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2 border-b border-white/[0.05]">
      <span className="text-right text-sm text-slate-300">{a ?? '—'}</span>
      <span className="text-center text-[11px] text-slate-500 font-medium uppercase tracking-wider px-1 leading-tight">
        {label}
      </span>
      <span className="text-left text-sm text-slate-300">{b ?? '—'}</span>
    </div>
  )
}

// ── Data Fetcher ───────────────────────────────────────────────────────────

function useTeamSnapshot(teamNumber: number | null) {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  return useQuery<TeamSnapshot | null>({
    queryKey: ['compare-team', teamNumber, activeEvent?.id],
    enabled: !!teamNumber && !!activeEvent,
    queryFn: async () => {
      if (!teamNumber || !activeEvent) return null

      // Fetch event_teams, scouting_entries, and pit_scouting in parallel
      const [teamRes, entriesRes, pitRes] = await Promise.all([
        supabase
          .from('event_teams')
          .select('team_number, nickname, epa_mean, ranking, wins, losses')
          .eq('event_id', activeEvent.id)
          .eq('team_number', teamNumber)
          .single(),
        supabase
          .from('scouting_entries')
          .select('auto_pieces_scored, teleop_pieces_scored, climb_level, breakdown, disconnect')
          .eq('event_id', activeEvent.id)
          .eq('team_number', teamNumber),
        supabase
          .from('pit_scouting')
          .select('drivetrain, preferred_role, vision_system, programming_language')
          .eq('event_id', activeEvent.id)
          .eq('team_number', teamNumber)
          .maybeSingle(),
      ])

      const t = teamRes.data
      if (!t) return null

      // Compute averages from scouting entries
      const entries = entriesRes.data ?? []
      const n = entries.length
      const avgAuto = n ? entries.reduce((s, e) => s + ((e.auto_pieces_scored as number) ?? 0), 0) / n : 0
      const avgTeleop = n ? entries.reduce((s, e) => s + ((e.teleop_pieces_scored as number) ?? 0), 0) / n : 0
      const climbRate = n ? entries.filter((e) => (e.climb_level as number) > 0).length / n : 0
      const reliability = n ? 1 - entries.filter((e) => e.breakdown || e.disconnect).length / n : 1

      const pit = pitRes.data

      return {
        team_number: t.team_number as number,
        nickname: t.nickname as string | null,
        epa_mean: t.epa_mean as number | null,
        ranking: t.ranking as number | null,
        wins: (t.wins as number) ?? 0,
        losses: (t.losses as number) ?? 0,
        avgAuto,
        avgTeleop,
        climbRate,
        reliability,
        entryCount: n,
        drivetrain: pit?.drivetrain ?? null,
        preferredRole: pit?.preferred_role ?? null,
        visionSystem: pit?.vision_system ?? null,
        programmingLanguage: pit?.programming_language ?? null,
      }
    },
  })
}

// ── Main Component ─────────────────────────────────────────────────────────

export function TeamCompareModal({ open, onClose, initialTeamA }: Props) {
  const [inputA, setInputA] = useState(initialTeamA ? String(initialTeamA) : '')
  const [inputB, setInputB] = useState('')

  const teamANum = parseInt(inputA) || null
  const teamBNum = parseInt(inputB) || null

  const { data: teamA, isLoading: loadingA } = useTeamSnapshot(teamANum)
  const { data: teamB, isLoading: loadingB } = useTeamSnapshot(teamBNum)

  if (!open) return null

  return (
    // Backdrop overlay — clicking outside closes the modal
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-12 px-4 pb-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0d0d18] border border-white/[0.1] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()} // prevent backdrop click from bubbling
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-purple-400" />
            <h2 className="text-white font-bold text-sm">Compare Teams</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Team selectors ── */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-white/[0.08]">
          <div>
            <label className="text-slate-500 text-[11px] font-medium uppercase tracking-wider mb-1 block">
              Team A
            </label>
            <Input
              type="number"
              placeholder="e.g. 418"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              className="bg-white/[0.05] border-white/[0.1] text-white h-11 text-lg font-bold"
            />
          </div>
          <div>
            <label className="text-slate-500 text-[11px] font-medium uppercase tracking-wider mb-1 block">
              Team B
            </label>
            <Input
              type="number"
              placeholder="e.g. 254"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              className="bg-white/[0.05] border-white/[0.1] text-white h-11 text-lg font-bold"
            />
          </div>
        </div>

        {/* ── Team header cards ── */}
        {(teamANum || teamBNum) && (
          <div className="grid grid-cols-2 gap-0 border-b border-white/[0.08]">
            {[{ team: teamA, num: teamANum, loading: loadingA }, { team: teamB, num: teamBNum, loading: loadingB }].map(
              ({ team, num, loading }, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-4 flex flex-col items-center gap-2 text-center',
                    i === 0 && 'border-r border-white/[0.08]'
                  )}
                >
                  {loading ? (
                    <div className="h-8 w-24 bg-white/[0.06] rounded animate-pulse" />
                  ) : num && team ? (
                    <>
                      <TeamAvatar teamNumber={team.team_number} size="md" />
                      <div>
                        <p className="text-white font-bold text-sm">{team.team_number}</p>
                        {team.nickname && (
                          <p className="text-slate-400 text-xs truncate max-w-[140px]">{team.nickname}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <EPABadge value={team.epa_mean} />
                        {team.ranking && (
                          <span className="text-amber-400 text-xs font-medium">#{team.ranking}</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">
                        {team.wins}W–{team.losses}L ({winRate(team.wins, team.losses)} win)
                      </p>
                    </>
                  ) : num ? (
                    <p className="text-slate-500 text-sm">Not found — sync first</p>
                  ) : null}
                </div>
              )
            )}
          </div>
        )}

        {/* ── Stat comparison table ── */}
        {teamA && teamB && (
          <div className="px-4 pb-4">
            {/* Performance section */}
            <div className="flex items-center gap-2 pt-4 pb-2">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Performance</span>
            </div>
            <StatRow label="EPA" a={teamA.epa_mean} b={teamB.epa_mean} />
            <StatRow label="Avg Auto" a={teamA.avgAuto} b={teamB.avgAuto} />
            <StatRow label="Avg Teleop" a={teamA.avgTeleop} b={teamB.avgTeleop} />
            <StatRow
              label="Climb Rate"
              a={teamA.climbRate}
              b={teamB.climbRate}
              format={(v) => `${Math.round(v * 100)}%`}
            />

            {/* Reliability section */}
            <div className="flex items-center gap-2 pt-4 pb-2">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Reliability</span>
            </div>
            <StatRow
              label="Reliability"
              a={teamA.reliability}
              b={teamB.reliability}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <StatRow
              label="Scout Entries"
              a={teamA.entryCount}
              b={teamB.entryCount}
              format={(v) => String(Math.round(v))}
            />
            <StatRow
              label="Win Rate"
              a={teamA.wins + teamA.losses > 0 ? teamA.wins / (teamA.wins + teamA.losses) : 0}
              b={teamB.wins + teamB.losses > 0 ? teamB.wins / (teamB.wins + teamB.losses) : 0}
              format={(v) => `${Math.round(v * 100)}%`}
            />

            {/* Robot info section */}
            {(teamA.drivetrain || teamB.drivetrain || teamA.preferredRole || teamB.preferredRole) && (
              <>
                <div className="flex items-center gap-2 pt-4 pb-2">
                  <Wrench className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Robot Info</span>
                </div>
                <TextRow label="Drivetrain" a={teamA.drivetrain} b={teamB.drivetrain} />
                <TextRow label="Role" a={teamA.preferredRole} b={teamB.preferredRole} />
                <TextRow label="Vision" a={teamA.visionSystem} b={teamB.visionSystem} />
                <TextRow label="Language" a={teamA.programmingLanguage} b={teamB.programmingLanguage} />
              </>
            )}

            {/* Ranking section */}
            <div className="flex items-center gap-2 pt-4 pb-2">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Standings</span>
            </div>
            <StatRow
              label="Rank"
              a={teamA.ranking}
              b={teamB.ranking}
              higherIsBetter={false}
              format={(v) => `#${Math.round(v)}`}
            />
          </div>
        )}

        {/* Prompt when no teams entered yet */}
        {!teamANum && !teamBNum && (
          <p className="text-slate-500 text-sm text-center py-8">
            Enter two team numbers above to compare them
          </p>
        )}
      </div>
    </div>
  )
}
