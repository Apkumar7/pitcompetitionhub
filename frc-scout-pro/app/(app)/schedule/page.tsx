'use client'

// ─── Match Schedule Page ───────────────────────────────────────────────────
// Two-tab view of the event schedule, optimized for pit-wall use.
//
// Daily tab
//   Full match list for all alliances. Search by team number or match #.
//   Filter by competition level: Quals / Semis / Finals.
//   Each row shows completion dots (●) for teams that have been scouted in
//   that match — green = scouted, grey = not yet. This lets the head scout
//   quickly see coverage gaps.
//   Team 418 matches are highlighted (red/blue tinted background).
//
// Drive Team tab
//   Minimal, high-contrast view intended for the driver coach's tablet.
//   Shows only Team 418's upcoming matches (not yet played), one at a time,
//   with large font for the alliance color, match label, and time.
//   Win probability bar (from Statbotics) gives a quick read on expected odds.
//
// OUR_TEAM constant: set to 418 (Team Purple Haze). Update this if the app
// is deployed for a different team.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import { formatMatchLabel, formatTime } from '@/utils/format'
import { cn } from '@/lib/utils'
import { Search, Clock, AlertTriangle } from 'lucide-react'
import type { Match } from '@/types/database.types'
import Link from 'next/link'

const OUR_TEAM = 418

function MatchRow({ match, teamEPAs, ourTeam, scoutedTeams }: {
  match: Match
  teamEPAs: Record<number, number>
  ourTeam: number
  scoutedTeams: Set<string>
}) {
  const label = formatMatchLabel(match.comp_level, match.match_number, match.set_number)
  const time = formatTime(match.scheduled_time ?? match.actual_time)
  const isPlayed = match.red_score != null
  const redAlliance = match.red_teams.includes(ourTeam)
  const blueAlliance = match.blue_teams.includes(ourTeam)
  const ourAlliance = redAlliance ? 'red' : blueAlliance ? 'blue' : null

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
      ourAlliance === 'red' ? 'border-red-500/30 bg-red-500/5' :
      ourAlliance === 'blue' ? 'border-blue-500/30 bg-blue-500/5' :
      'border-slate-800 bg-slate-900 hover:border-slate-700'
    )}>
      <div className="w-14 shrink-0">
        <p className="text-white font-bold text-sm">{label}</p>
        <p className="text-slate-400 text-xs">{time}</p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-red-400 font-bold mb-0.5">RED {isPlayed && <span className="text-red-300 font-black">{match.red_score}</span>}</p>
          <div className="flex flex-wrap gap-1">
            {match.red_teams.map((t) => (
              <Link key={t} href={`/teams/${t}`} className={cn('hover:underline', t === ourTeam ? 'text-white font-bold' : 'text-slate-300')}>
                {t}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-blue-400 font-bold mb-0.5">BLUE {isPlayed && <span className="text-blue-300 font-black">{match.blue_score}</span>}</p>
          <div className="flex flex-wrap gap-1">
            {match.blue_teams.map((t) => (
              <Link key={t} href={`/teams/${t}`} className={cn('hover:underline', t === ourTeam ? 'text-white font-bold' : 'text-slate-300')}>
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Scout completion dots */}
      <div className="flex gap-1 shrink-0">
        {[...match.red_teams, ...match.blue_teams].map((t) => {
          const key = `${match.id}:${t}`
          return (
            <div
              key={t}
              className={cn(
                'w-2 h-2 rounded-full',
                scoutedTeams.has(key) ? 'bg-emerald-400' : 'bg-slate-700'
              )}
              title={`Team ${t}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function DriveTeamView({ matches, ourTeam }: { matches: Match[]; ourTeam: number }) {
  const upcomingMatches = matches.filter((m) =>
    (m.red_teams.includes(ourTeam) || m.blue_teams.includes(ourTeam)) && !m.actual_time
  )

  if (upcomingMatches.length === 0) {
    return <p className="text-slate-500 text-center py-8">No upcoming matches for Team {ourTeam}</p>
  }

  return (
    <div className="space-y-4">
      {upcomingMatches.map((match) => {
        const red = match.red_teams.includes(ourTeam)
        const alliance = red ? 'red' : 'blue'
        const label = formatMatchLabel(match.comp_level, match.match_number, match.set_number)
        const time = formatTime(match.scheduled_time)

        return (
          <div key={match.id} className={cn(
            'rounded-2xl border-2 p-6',
            red ? 'border-red-500 bg-red-950/30' : 'border-blue-500 bg-blue-950/30'
          )}>
            <div className={cn('text-center font-black text-2xl mb-2 tracking-widest uppercase', red ? 'text-red-400' : 'text-blue-400')}>
              WE ARE {alliance.toUpperCase()}
            </div>
            <div className="text-center text-white font-bold text-4xl mb-1">{label}</div>
            <div className="text-center text-slate-300 text-xl">{time}</div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-red-500/10 rounded-xl p-3">
                <p className="text-red-400 font-bold text-xs mb-2">RED ALLIANCE</p>
                {match.red_teams.map((t) => (
                  <p key={t} className={cn('text-xl font-bold', t === ourTeam ? 'text-white' : 'text-red-200')}>{t}</p>
                ))}
              </div>
              <div className="bg-blue-500/10 rounded-xl p-3">
                <p className="text-blue-400 font-bold text-xs mb-2">BLUE ALLIANCE</p>
                {match.blue_teams.map((t) => (
                  <p key={t} className={cn('text-xl font-bold', t === ourTeam ? 'text-white' : 'text-blue-200')}>{t}</p>
                ))}
              </div>
            </div>

            {match.red_win_prob != null && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-blue-500"
                    style={{ background: `linear-gradient(to right, #ef4444 ${(match.red_win_prob * 100).toFixed(0)}%, #3b82f6 ${(match.red_win_prob * 100).toFixed(0)}%)` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-red-400">Red {(match.red_win_prob * 100).toFixed(0)}%</span>
                  <span className="text-blue-400">Blue {((1 - match.red_win_prob) * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SchedulePage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const supabase = createClient()

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['schedule-matches', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .order('scheduled_time', { ascending: true })
      return (data ?? []) as Match[]
    },
  })

  const { data: scoutingEntries = [] } = useQuery({
    queryKey: ['scouted-entries', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('scouting_entries')
        .select('match_id, team_number')
        .eq('event_id', activeEvent!.id)
      return data ?? []
    },
  })

  const scoutedTeams = new Set<string>(
    scoutingEntries.map((e: { match_id: string; team_number: number }) => `${e.match_id}:${e.team_number}`)
  )

  const filtered = matches.filter((m) => {
    if (levelFilter !== 'all' && m.comp_level !== levelFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        m.match_number.toString().includes(s) ||
        m.red_teams.some((t) => t.toString().includes(s)) ||
        m.blue_teams.some((t) => t.toString().includes(s))
      )
    }
    return true
  })

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <Clock className="h-8 w-8 text-[#3a3a55]" />
        <p className="text-[#5a5a7a] text-sm">Select an event from the top bar to view the schedule.</p>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="border-b border-white/[0.05] px-6 py-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Schedule</p>
        <h1 className="text-[22px] font-black tracking-tight text-white leading-none">
          Match Schedule
        </h1>
      </div>

      <div className="p-5 lg:p-7 max-w-5xl">
      <Tabs defaultValue="daily">
        <TabsList className="bg-white/[0.05] border border-white/[0.07] mb-5">
          <TabsTrigger value="daily" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-[#6b6b8a]">Daily</TabsTrigger>
          <TabsTrigger value="driveteam" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-[#6b6b8a]">Drive Team</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a5a7a]" />
              <Input
                placeholder="Search teams or match #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/[0.04] border-white/[0.08] text-white h-10 placeholder:text-[#4a4a65]"
              />
            </div>
            <div className="flex gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'qm', label: 'Quals' },
                { value: 'sf', label: 'Semis' },
                { value: 'f', label: 'Finals' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLevelFilter(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                    levelFilter === value
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/[0.05] text-[#6b6b8a] hover:text-white hover:bg-white/[0.08]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 shimmer" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  teamEPAs={{}}
                  ourTeam={OUR_TEAM}
                  scoutedTeams={scoutedTeams}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-slate-500 text-center py-8">No matches found</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="driveteam">
          {isLoading ? (
            <Skeleton className="shimmer" />
          ) : (
            <DriveTeamView matches={matches} ourTeam={OUR_TEAM} />
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
