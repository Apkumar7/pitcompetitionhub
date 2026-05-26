'use client'

// ─── Alliance Selection Page ───────────────────────────────────────────────
// Drag-and-drop picklist builder for alliance selection at FRC events.
// Used by the head strategist during the alliance selection process.
//
// Picklist mechanics:
//   • Teams load sorted by EPA (best first) as a starting point
//   • Drag rows to reorder manually
//   • "Auto-rank" re-sorts using a weighted composite score:
//       EPA × 0.35 + ClimbRate × 0.20 + Reliability × 0.20 + CycleAvg × 0.10
//     Favorited teams always float to the top; blacklisted teams sink to bottom
//   • Star (favorite) = highlight in amber, pinned above normal teams
//   • X (blacklist) = greyed out and moved to end (off-limits for picks)
//   • Per-team notes field for scout observations
//
// Suggestions panel:
//   Shows the top 5 non-blacklisted teams with projected combined EPA
//   (our EPA + partner EPA). Hardcoded to Team 418 for now (ourEPA = 40).
//
// Persistence:
//   "Save Picklist" upserts to the `picklists` table in Supabase.
//   The `rankings` column stores the full ordered array as JSONB so the
//   entire picklist round-trips in a single row.
//
// Drag-and-drop: @hello-pangea/dnd (drop-in React 19-compatible replacement
// for react-beautiful-dnd which has a StrictMode bug in React 19).
// ──────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EPABadge } from '@/components/shared/EPABadge'
import { useEventStore } from '@/store/eventStore'
import { createClient } from '@/lib/supabase/client'
import { Star, X, GripVertical, Wand2, Handshake } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PicklistEntry } from '@/types/database.types'

interface TeamPickRow {
  team_number: number
  nickname: string | null
  epa_mean: number | null
  ranking: number | null
  // scouting stats
  reliability: number
  climbRate: number
  cycleAvg: number
  favorited: boolean
  blacklisted: boolean
  notes: string
}

export default function AlliancePage() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [picklistName, setPicklistName] = useState('Main Picklist')
  const [rows, setRows] = useState<TeamPickRow[]>([])
  const [initialized, setInitialized] = useState(false)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['alliance-teams', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data: teamsData } = await supabase
        .from('event_teams')
        .select('team_number, nickname, epa_mean, ranking')
        .eq('event_id', activeEvent!.id)
        .order('epa_mean', { ascending: false, nullsFirst: false })

      const { data: entriesData } = await supabase
        .from('scouting_entries')
        .select('team_number, climb_level, cycle_count, breakdown, disconnect')
        .eq('event_id', activeEvent!.id)

      // Build stats per team
      const statsMap: Record<number, { climbs: number[], cycles: number[], breakdowns: number, count: number }> = {}
      for (const e of (entriesData ?? [])) {
        const t = e.team_number as number
        if (!statsMap[t]) statsMap[t] = { climbs: [], cycles: [], breakdowns: 0, count: 0 }
        statsMap[t].climbs.push((e.climb_level as number) ?? 0)
        statsMap[t].cycles.push((e.cycle_count as number) ?? 0)
        if (e.breakdown || e.disconnect) statsMap[t].breakdowns++
        statsMap[t].count++
      }

      const result = (teamsData ?? []).map((t: Record<string, unknown>) => {
        const s = statsMap[t.team_number as number] ?? { climbs: [], cycles: [], breakdowns: 0, count: 0 }
        const climbRate = s.count > 0 ? s.climbs.filter((c) => c > 0).length / s.count : 0
        const cycleAvg = s.cycles.length > 0 ? s.cycles.reduce((a, b) => a + b, 0) / s.cycles.length : 0
        const reliability = s.count > 0 ? 1 - s.breakdowns / s.count : 1
        return {
          team_number: t.team_number as number,
          nickname: t.nickname as string | null,
          epa_mean: t.epa_mean as number | null,
          ranking: t.ranking as number | null,
          reliability,
          climbRate,
          cycleAvg,
          favorited: false,
          blacklisted: false,
          notes: '',
        }
      })

      if (!initialized) {
        setRows(result)
        setInitialized(true)
      }
      return result
    },
  })

  function autoRank() {
    const MAX_EPA = Math.max(...rows.map((r) => r.epa_mean ?? 0), 1)
    const MAX_CYCLES = Math.max(...rows.map((r) => r.cycleAvg), 1)

    const scored = rows.map((r) => ({
      ...r,
      score: ((r.epa_mean ?? 0) / MAX_EPA * 0.35) +
        (r.climbRate * 0.20) +
        (r.reliability * 0.20) +
        (r.cycleAvg / MAX_CYCLES * 0.10),
    }))

    scored.sort((a, b) => {
      if (a.favorited && !b.favorited) return -1
      if (!a.favorited && b.favorited) return 1
      if (a.blacklisted && !b.blacklisted) return 1
      if (!a.blacklisted && b.blacklisted) return -1
      return b.score - a.score
    })

    setRows(scored)
    toast.success('Picklist auto-ranked!')
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const newRows = [...rows]
    const [moved] = newRows.splice(result.source.index, 1)
    newRows.splice(result.destination.index, 0, moved)
    setRows(newRows)
  }

  function toggleFavorite(idx: number) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, favorited: !r.favorited } : r))
  }

  function toggleBlacklist(idx: number) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, blacklisted: !r.blacklisted } : r))
  }

  function updateNotes(idx: number, notes: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, notes } : r))
  }

  async function savePicklist() {
    const { data: { user } } = await supabase.auth.getUser()
    const rankings: PicklistEntry[] = rows.map((r, i) => ({
      team_number: r.team_number,
      rank: i + 1,
      notes: r.notes,
      favorited: r.favorited,
      blacklisted: r.blacklisted,
    }))

    const { error } = await supabase.from('picklists').upsert({
      event_id: activeEvent?.id,
      name: picklistName,
      created_by: user?.id,
      rankings,
      updated_at: new Date().toISOString(),
    })

    if (error) toast.error('Failed to save')
    else toast.success('Picklist saved!')
  }

  // Alliance suggestion with synergy scoring.
  // Synergy accounts for complementary capabilities, not just raw EPA sum:
  //  - High climb partner = endgame reliability bonus
  //  - High cycle partner = teleop multiplier
  //  - Reliable partner = reduces alliance breakdown risk
  const ourRow = rows.find((r) => r.team_number === 418)
  const ourEPA = ourRow?.epa_mean ?? rows[0]?.epa_mean ?? 40
  const ourClimb = ourRow?.climbRate ?? 0.5

  const top5 = rows
    .filter((r) => !r.blacklisted && r.team_number !== 418)
    .slice(0, 5)

  const suggestions = top5.map((r) => {
    const baseEPA = ourEPA + (r.epa_mean ?? 0)
    // Synergy bonuses — capped at ±15% of base
    const climbBonus = r.climbRate > 0.8 && ourClimb < 0.7 ? baseEPA * 0.05 : 0
    const cycleBonus = r.cycleAvg > 5 ? baseEPA * 0.03 : 0
    const reliabilityBonus = r.reliability > 0.9 ? baseEPA * 0.04 : r.reliability < 0.7 ? baseEPA * -0.08 : 0
    const synergyScore = baseEPA + climbBonus + cycleBonus + reliabilityBonus
    return {
      team: r.team_number,
      nickname: r.nickname,
      projectedEPA: synergyScore,
      climbRate: r.climbRate,
      reliability: r.reliability,
    }
  }).sort((a, b) => b.projectedEPA - a.projectedEPA)

  if (!activeEvent) {
    return <EmptyState icon={Handshake} title="No event selected" description="Choose an event from the top bar to get started." />
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-white/[0.05] px-6 py-7 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">Strategy</p>
          <h1 className="text-[22px] font-black tracking-tight text-white leading-none">Alliance Selection</h1>
        </div>
        <div className="flex items-center gap-2 mb-0.5">
          <Button onClick={autoRank} variant="outline" size="sm" className="border-white/[0.12] text-[#9090a8] hover:text-white gap-1.5 h-8 text-[12px]">
            <Wand2 className="h-3.5 w-3.5" />
            Auto-rank
          </Button>
          <Button onClick={savePicklist} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white h-8 text-[12px]">
            Save Picklist
          </Button>
        </div>
      </div>
    <div className="p-5 lg:p-7 max-w-7xl">

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Picklist */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={picklistName}
              onChange={(e) => setPicklistName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white h-9 text-sm max-w-xs"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 bg-slate-800" />)}
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="picklist" isDropDisabled={false}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                    {rows.map((row, idx) => (
                      <Draggable key={row.team_number} draggableId={String(row.team_number)} index={idx}>
                        {(drag, snapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={cn(
                              'flex items-center gap-2 p-2.5 rounded-lg border transition-colors',
                              snapshot.isDragging ? 'bg-slate-700 border-purple-500 shadow-lg' : 'bg-[#0d0d18] border-white/[0.08]',
                              row.blacklisted && 'opacity-40',
                              row.favorited && 'border-amber-500/30 bg-amber-500/5'
                            )}
                          >
                            <div {...drag.dragHandleProps} className="text-slate-600 hover:text-slate-400 cursor-grab">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <span className="text-slate-500 text-xs w-5 text-right tabular-nums">{idx + 1}</span>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold text-sm">{row.team_number}</span>
                                {row.nickname && <span className="text-slate-400 text-xs truncate">{row.nickname}</span>}
                              </div>
                            </div>

                            <EPABadge value={row.epa_mean} />

                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              row.reliability >= 0.9 ? 'bg-emerald-400' : row.reliability >= 0.7 ? 'bg-amber-400' : 'bg-red-400'
                            )} title={`Reliability: ${(row.reliability * 100).toFixed(0)}%`} />

                            <Input
                              value={row.notes}
                              onChange={(e) => updateNotes(idx, e.target.value)}
                              placeholder="Notes..."
                              className="bg-slate-800 border-slate-700 text-white h-7 text-xs w-24 hidden md:block"
                              onClick={(e) => e.stopPropagation()}
                            />

                            <button
                              onClick={() => toggleFavorite(idx)}
                              className={cn('p-1 rounded transition-colors', row.favorited ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400')}
                            >
                              <Star className={cn('h-3.5 w-3.5', row.favorited && 'fill-amber-400')} />
                            </button>
                            <button
                              onClick={() => toggleBlacklist(idx)}
                              className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Suggestions panel */}
        <div className="space-y-3">
          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Best First Picks for Team 418</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={s.team} className="p-2 rounded-lg bg-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-500 text-xs">{i + 1}.</span>
                      <span className="text-white text-sm font-medium">{s.team}</span>
                      {s.nickname && <span className="text-slate-400 text-xs truncate">{s.nickname}</span>}
                    </div>
                    <span className="text-emerald-400 text-xs font-medium tabular-nums shrink-0">
                      ~{s.projectedEPA.toFixed(1)} EPA
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>Climb {(s.climbRate * 100).toFixed(0)}%</span>
                    <span className={cn(
                      s.reliability >= 0.9 ? 'text-emerald-400' : s.reliability >= 0.7 ? 'text-amber-400' : 'text-red-400'
                    )}>Rel {(s.reliability * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
              {suggestions.length === 0 && <p className="text-slate-500 text-xs">Add teams to see suggestions</p>}
            </CardContent>
          </Card>

          <Card className="bg-[#0d0d18] border-white/[0.08]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Starred Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {rows.filter((r) => r.favorited).map((r) => (
                <div key={r.team_number} className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-white text-sm">{r.team_number}</span>
                  <EPABadge value={r.epa_mean} className="ml-auto" />
                </div>
              ))}
              {rows.filter((r) => r.favorited).length === 0 && (
                <p className="text-slate-500 text-xs">Star teams to pin them here</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
