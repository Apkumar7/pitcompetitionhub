'use client'

// ─── Teams List Page ───────────────────────────────────────────────────────
// Displays all teams at the active event ranked by qualification standing.
// Features:
//   • Live search by team number or name
//   • Starred teams pinned to the top for quick alliance-selection access
//   • Per-row star toggle with optimistic updates (no page reload)
//   • Click any row to open the full team profile
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EPABadge } from '@/components/shared/EPABadge'
import { TeamAvatar } from '@/components/shared/TeamAvatar'
import { useEventStore } from '@/store/eventStore'
import { useStarredTeams } from '@/hooks/useStarredTeams'
import { createClient } from '@/lib/supabase/client'
import { Search, Users, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function TeamsPage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  // Star system — optimistic updates keep the UI snappy
  const { isStarred, toggleStar } = useStarredTeams()

  // Fetch all teams at the active event, sorted by qual ranking
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['event-teams', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .order('ranking', { ascending: true, nullsFirst: false })
      return data ?? []
    },
  })

  // Apply search filter against team number and nickname
  const filtered = teams.filter((t: Record<string, unknown>) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (t.team_number as number).toString().includes(s) ||
      ((t.nickname as string) ?? '').toLowerCase().includes(s)
    )
  })

  // Starred teams float to the top; unstarred follow in their original order
  const starredFiltered = filtered.filter((t: Record<string, unknown>) => isStarred(t.team_number as number))
  const unstarredFiltered = filtered.filter((t: Record<string, unknown>) => !isStarred(t.team_number as number))

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <Users className="h-8 w-8 text-[#3a3a55]" />
        <p className="text-[#5a5a7a] text-sm">Select an event from the top bar to browse teams.</p>
      </div>
    )
  }

  // Renders a single team row — extracted for DRY usage in starred + main lists
  function TeamRow({ team }: { team: Record<string, unknown> }) {
    const teamNum = team.team_number as number
    const starred = isStarred(teamNum)
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group">
        {/* Star toggle — stop propagation so the link doesn't fire */}
        <button
          onClick={(e) => { e.preventDefault(); toggleStar(teamNum) }}
          className={cn(
            'p-1 rounded transition-colors shrink-0',
            starred ? 'text-amber-400' : 'text-[#3a3a55] hover:text-amber-400'
          )}
          aria-label={starred ? 'Unstar team' : 'Star team'}
        >
          <Star className={cn('h-3.5 w-3.5', starred && 'fill-amber-400')} />
        </button>

        <Link href={`/teams/${teamNum}`} className="flex items-center gap-3 flex-1 min-w-0">
          {team.ranking != null && (
            <span className="text-[#4a4a65] text-[12px] w-6 text-right tabular-nums font-mono">
              {String(team.ranking)}
            </span>
          )}
          <TeamAvatar teamNumber={teamNum} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[13px] group-hover:text-violet-300 transition-colors">
              Team {String(teamNum)}
            </p>
            {Boolean(team.nickname) && (
              <p className="text-[#6b6b8a] text-[11px] truncate">
                {String(team.nickname)}{team.city ? ` · ${String(team.city)}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[#5a5a7a] text-[11px] tabular-nums font-mono">
              {(team.wins as number) ?? 0}W–{(team.losses as number) ?? 0}L
            </span>
            <EPABadge value={team.epa_mean as number | null} />
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {/* ── Page header ── */}
      <div className="border-b border-white/[0.05] px-6 py-7 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Intel</p>
          <h1 className="text-[22px] font-black tracking-tight text-white leading-none">Teams</h1>
        </div>
        <span className="text-[13px] font-semibold text-[#5a5a7a] mb-0.5">{teams.length} teams</span>
      </div>

      <div className="p-5 lg:p-7 max-w-5xl">
        {/* ── Search bar ── */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a5a7a]" />
          <Input
            placeholder="Search team # or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white h-10 placeholder:text-[#4a4a65]"
          />
        </div>

        {isLoading ? (
          <div className="space-y-1.5">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-[52px] shimmer rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {/* ── Starred section — pinned for quick alliance access ── */}
            {starredFiltered.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-2 px-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/70">
                    Starred
                  </span>
                </div>
                {starredFiltered.map((team: Record<string, unknown>) => (
                  <TeamRow key={team.team_number as number} team={team} />
                ))}
                <div className="border-t border-white/[0.05] my-3" />
              </>
            )}

            {/* ── All teams (or search results) ── */}
            {unstarredFiltered.map((team: Record<string, unknown>) => (
              <TeamRow key={team.team_number as number} team={team} />
            ))}

            {filtered.length === 0 && (
              <p className="text-[#4a4a65] text-[13px] text-center py-12">No teams found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
