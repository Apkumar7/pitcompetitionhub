'use client'

// ─── Match Scout Form ──────────────────────────────────────────────────────
// Primary scouting input form. Designed for tablet use during a match.
//
// Match + team selection flow:
//   1. Scout picks a match from the dropdown (populated from DB match schedule)
//   2. Scout picks alliance (Red / Blue) — toggles the alliance color
//   3. Team dropdown auto-populates with the 3 teams on that alliance
//      so scouts can't accidentally scout a team that isn't in the match
//
// Offline-first:
//   Every submission is written to IndexedDB (saveEntryOffline) AND added
//   to the sync queue (addToSyncQueue) before attempting a Supabase upsert.
//   If the network call fails, the entry is safe locally and will retry
//   automatically when the sync engine runs.
//
// Auto-advance:
//   After a successful submission the form resets to the NEXT match in the
//   schedule (same alliance). This lets a scout complete an entire event
//   without manual navigation.
//
// Form validation: Zod schema (ScoutingEntrySchema) enforced via
// react-hook-form + zodResolver. Required fields: match, alliance, team.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CounterButton } from './CounterButton'
import { ScoutingEntrySchema, type ScoutingEntryFormData, SCOUTING_TAGS } from '@/types/scouting.types'
import { saveEntryOffline, addToSyncQueue } from '@/features/offline/db'
import { createClient } from '@/lib/supabase/client'
import { useEventStore } from '@/store/eventStore'
import { useScoutingStore } from '@/store/scoutingStore'
import { formatMatchLabel } from '@/utils/format'
import { cn } from '@/lib/utils'
import type { Match } from '@/types/database.types'

function SectionHeader({ title }: { title: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  )
}

function RatingButtons({ value, onChange, count = 5 }: { value: number | undefined; onChange: (v: number) => void; count?: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'flex-1 h-11 rounded-lg text-sm font-semibold transition-colors border',
            value === n
              ? 'bg-purple-600 border-purple-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function ToggleButton({ value, onChange, trueLabel, falseLabel, trueColor, falseColor }: {
  value: boolean
  onChange: (v: boolean) => void
  trueLabel: string
  falseLabel: string
  trueColor?: string
  falseColor?: string
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'flex-1 h-14 rounded-xl text-sm font-bold transition-colors border',
          value
            ? (trueColor ?? 'bg-emerald-600 border-emerald-500 text-white')
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
        )}
      >
        {trueLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'flex-1 h-14 rounded-xl text-sm font-bold transition-colors border',
          !value
            ? (falseColor ?? 'bg-slate-600 border-slate-500 text-white')
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
        )}
      >
        {falseLabel}
      </button>
    </div>
  )
}

export function MatchScoutForm() {
  const activeEvent = useEventStore((s) => s.activeEvent)
  const { scoutName, setScoutName, setLastMatchNumber } = useScoutingStore()
  const [driverExpanded, setDriverExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ['scout-matches', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('event_id', activeEvent!.id)
        .order('comp_level', { ascending: true })
        .order('match_number', { ascending: true })
      return (data ?? []) as Match[]
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, watch, setValue, reset } = useForm<ScoutingEntryFormData, any, ScoutingEntryFormData>({
    resolver: zodResolver(ScoutingEntrySchema) as any,
    defaultValues: {
      offline_id: crypto.randomUUID(),
      event_id: activeEvent?.id ?? '',
      match_id: '',
      team_number: 0,
      alliance: 'red',
      scout_id: '',
      scout_name: scoutName,
      auto_mobility: false,
      auto_pieces_scored: 0,
      auto_misses: 0,
      teleop_pieces_scored: 0,
      teleop_misses: 0,
      cycle_count: 0,
      intake_speed: 3,
      defense_played: false,
      feeding_capability: false,
      bump_traversal: false,
      trench_traversal: false,
      climb_level: 0,
      park_success: false,
      breakdown: false,
      brownout: false,
      disconnect: false,
      penalty_count: 0,
      tags: [],
      recommended_pick: false,
    },
  })

  const watchedData = watch()
  const defenseOn = watch('defense_played')
  const tags = watch('tags') ?? []

  // Auto-save every 2 seconds
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      if (watchedData.team_number > 0 && watchedData.match_id) {
        await saveEntryOffline({ ...watchedData, synced: false, submitted_at: new Date().toISOString() })
      }
    }, 2000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [watchedData])

  // When match selection changes, update match_id and clear team
  function handleMatchSelect(matchId: string | null) {
    if (!matchId) return
    const match = matches.find((m) => m.id === matchId) ?? null
    setSelectedMatch(match)
    setValue('match_id', matchId)
    setValue('team_number', 0)
  }

  // When alliance changes, clear team selection
  function handleAllianceSelect(alliance: 'red' | 'blue') {
    setValue('alliance', alliance)
    setValue('team_number', 0)
  }

  // Teams available for current match + alliance
  const allianceTeams: number[] = selectedMatch
    ? (watch('alliance') === 'red' ? selectedMatch.red_teams : selectedMatch.blue_teams)
    : []

  // Update event_id when activeEvent changes
  useEffect(() => {
    if (activeEvent) setValue('event_id', activeEvent.id)
  }, [activeEvent, setValue])

  // Load scout user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setValue('scout_id', user.id)
    })
  }, [])

  function toggleTag(tag: string) {
    const current = tags
    if (current.includes(tag)) {
      setValue('tags', current.filter((t) => t !== tag))
    } else {
      setValue('tags', [...current, tag])
    }
  }

  async function onSubmit(data: ScoutingEntryFormData) {
    if (!data.match_id || data.team_number === 0) {
      toast.error('Select a match and team before submitting')
      return
    }
    setSubmitting(true)
    const entry = {
      ...data,
      event_id: activeEvent?.id ?? '',
      submitted_at: new Date().toISOString(),
      synced: false,
    }

    // Always save offline first
    await saveEntryOffline({ ...entry, synced: false })

    // Try Supabase
    try {
      const { error } = await supabase.from('scouting_entries').insert(entry)
      if (error) throw error
      await saveEntryOffline({ ...entry, synced: true })
      toast.success('Entry submitted!')

      // Notify lead/admin users that new scouting data is available
      fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New scout entry: Team ${data.team_number}`,
          body: `${data.scout_name ?? 'A scout'} submitted data for Team ${data.team_number} in ${selectedMatch ? `match ${selectedMatch.match_number}` : 'a match'}.`,
          type: 'scouting',
        }),
      }).catch(() => {})

      // Breakdown or disconnect → alert pit crew immediately
      if (data.breakdown || data.disconnect) {
        const issueType = data.breakdown ? 'Breakdown' : 'Disconnect'
        fetch('/api/notifications/broadcast-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_role: 'pit_crew',
            title: `⚠️ ${issueType}: Team ${data.team_number}`,
            body: `${issueType} recorded in ${selectedMatch ? `match ${selectedMatch.match_number}` : 'a match'}. ${data.notes ?? ''}`.trim(),
            type: 'breakdown',
          }),
        }).catch(() => {})
      }
    } catch {
      await addToSyncQueue('scouting_entry', entry)
      toast.info('Saved offline — will sync when connected')
    }

    // Persist scout name
    setScoutName(data.scout_name ?? '')
    if (selectedMatch) setLastMatchNumber(selectedMatch.match_number + 1)

    // Advance to next match in list
    const currentIdx = matches.findIndex((m) => m.id === data.match_id)
    const nextMatch = currentIdx >= 0 && currentIdx < matches.length - 1 ? matches[currentIdx + 1] : null
    setSelectedMatch(nextMatch)

    // Reset form
    reset({
      offline_id: crypto.randomUUID(),
      event_id: activeEvent?.id ?? '',
      match_id: nextMatch?.id ?? '',
      team_number: 0,
      alliance: data.alliance,
      scout_id: data.scout_id,
      scout_name: data.scout_name,
      auto_mobility: false,
      auto_pieces_scored: 0,
      auto_misses: 0,
      teleop_pieces_scored: 0,
      teleop_misses: 0,
      cycle_count: 0,
      intake_speed: 3,
      defense_played: false,
      feeding_capability: false,
      bump_traversal: false,
      trench_traversal: false,
      climb_level: 0,
      park_success: false,
      breakdown: false,
      brownout: false,
      disconnect: false,
      penalty_count: 0,
      tags: [],
      recommended_pick: false,
    })

    setSubmitting(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-8">
      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 -mx-4 space-y-3">

        {/* Match selector */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Match</Label>
          {matches.length === 0 ? (
            <div className="h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center px-3 text-slate-500 text-sm">
              {activeEvent ? 'No matches — sync the event first' : 'Select an event first'}
            </div>
          ) : (
            <Select value={selectedMatch?.id ?? ''} onValueChange={handleMatchSelect}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12 text-base font-bold">
                <SelectValue placeholder="Select match…" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 max-h-64">
                {matches.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white focus:bg-slate-700">
                    <span className="font-bold">{formatMatchLabel(m.comp_level, m.match_number, m.set_number)}</span>
                    <span className="ml-2 text-slate-400 text-xs">
                      R: {m.red_teams.join(', ')} · B: {m.blue_teams.join(', ')}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Alliance toggle */}
        <Controller
          name="alliance"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAllianceSelect('red')}
                className={cn(
                  'flex-1 h-14 rounded-xl font-bold text-base border-2 transition-colors',
                  field.value === 'red'
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-950'
                )}
              >
                RED
              </button>
              <button
                type="button"
                onClick={() => handleAllianceSelect('blue')}
                className={cn(
                  'flex-1 h-14 rounded-xl font-bold text-base border-2 transition-colors',
                  field.value === 'blue'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-blue-950'
                )}
              >
                BLUE
              </button>
            </div>
          )}
        />

        {/* Team dropdown — populated from selected match + alliance */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Team</Label>
          <Controller
            name="team_number"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value > 0 ? String(field.value) : ''}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={allianceTeams.length === 0}
              >
                <SelectTrigger className={cn(
                  'h-14 text-xl font-black border-2 transition-colors',
                  field.value > 0
                    ? watch('alliance') === 'red'
                      ? 'bg-red-900/40 border-red-500 text-white'
                      : 'bg-blue-900/40 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                )}>
                  <SelectValue placeholder={allianceTeams.length === 0 ? 'Select match + alliance first' : 'Select team…'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {allianceTeams.map((t) => (
                    <SelectItem key={t} value={String(t)} className="text-white focus:bg-slate-700">
                      <span className="text-lg font-bold">{t}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Scout name */}
        <div>
          <Label className="text-slate-400 text-xs mb-1 block">Scout Name</Label>
          <Controller
            name="scout_name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Your name"
                className="bg-slate-800 border-slate-700 text-white h-11"
              />
            )}
          />
        </div>
      </div>

      {/* ── AUTONOMOUS ── */}
      <div className="space-y-3">
        <SectionHeader title="Autonomous" />

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Mobility</Label>
          <Controller
            name="auto_mobility"
            control={control}
            render={({ field }) => (
              <ToggleButton
                value={field.value}
                onChange={field.onChange}
                trueLabel="Mobility ✓"
                falseLabel="No Mobility"
                trueColor="bg-blue-600 border-blue-500 text-white"
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="auto_pieces_scored"
            control={control}
            render={({ field }) => (
              <CounterButton label="Pieces Scored" value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            name="auto_misses"
            control={control}
            render={({ field }) => (
              <CounterButton label="Misses" value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div>
          <Label className="text-slate-400 text-sm mb-1 block">Path Notes</Label>
          <Controller
            name="auto_path_notes"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Auto path description..."
                rows={2}
                className="bg-slate-800 border-slate-700 text-white text-sm resize-none"
              />
            )}
          />
        </div>
      </div>

      {/* ── TELEOP ── */}
      <div className="space-y-3">
        <SectionHeader title="Teleop" />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="teleop_pieces_scored"
            control={control}
            render={({ field }) => (
              <CounterButton label="Pieces Scored" value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            name="teleop_misses"
            control={control}
            render={({ field }) => (
              <CounterButton label="Misses" value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <Controller
          name="cycle_count"
          control={control}
          render={({ field }) => (
            <CounterButton label="Cycles" value={field.value} onChange={field.onChange} className="w-full" />
          )}
        />

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Intake Speed</Label>
          <Controller
            name="intake_speed"
            control={control}
            render={({ field }) => (
              <div className="flex gap-1.5">
                {[{ v: 1, l: 'Slow' }, { v: 2, l: '' }, { v: 3, l: 'OK' }, { v: 4, l: '' }, { v: 5, l: 'Fast' }].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => field.onChange(v)}
                    className={cn(
                      'flex-1 h-12 rounded-lg text-xs font-semibold transition-colors border flex flex-col items-center justify-center',
                      field.value === v
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    <span className="font-bold">{v}</span>
                    {l && <span className="text-[9px]">{l}</span>}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Scoring Location</Label>
          <Controller
            name="scoring_location"
            control={control}
            render={({ field }) => (
              <div className="flex gap-1.5">
                {['Left', 'Center', 'Right', 'Anywhere'].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => field.onChange(loc)}
                    className={cn(
                      'flex-1 h-12 rounded-lg text-xs font-semibold transition-colors border',
                      field.value === loc
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Defense</Label>
          <Controller
            name="defense_played"
            control={control}
            render={({ field }) => (
              <ToggleButton
                value={field.value}
                onChange={field.onChange}
                trueLabel="Played Defense"
                falseLabel="No Defense"
                trueColor="bg-amber-600 border-amber-500 text-white"
              />
            )}
          />
        </div>

        {defenseOn && (
          <div className="space-y-3 pl-3 border-l-2 border-amber-600/30">
            <div>
              <Label className="text-slate-400 text-sm mb-2 block">Defense Effectiveness</Label>
              <Controller
                name="defense_effectiveness"
                control={control}
                render={({ field }) => (
                  <RatingButtons value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-sm mb-2 block">Defense Resistance (took hits)</Label>
              <Controller
                name="defense_resistance"
                control={control}
                render={({ field }) => (
                  <RatingButtons value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── TRAVERSAL ── */}
      <div className="space-y-3">
        <SectionHeader title="Traversal / Field" />
        <div className="grid grid-cols-2 gap-2">
          <Controller
            name="bump_traversal"
            control={control}
            render={({ field }) => (
              <ToggleButton value={field.value} onChange={field.onChange} trueLabel="Bump ✓" falseLabel="Bump ✗" trueColor="bg-amber-600 border-amber-500 text-white" />
            )}
          />
          <Controller
            name="trench_traversal"
            control={control}
            render={({ field }) => (
              <ToggleButton value={field.value} onChange={field.onChange} trueLabel="Trench ✓" falseLabel="Trench ✗" trueColor="bg-amber-600 border-amber-500 text-white" />
            )}
          />
        </div>
        <Controller
          name="feeding_capability"
          control={control}
          render={({ field }) => (
            <ToggleButton value={field.value} onChange={field.onChange} trueLabel="Can Feed Alliance" falseLabel="No Feeding" trueColor="bg-amber-600 border-amber-500 text-white" />
          )}
        />
      </div>

      {/* ── ENDGAME ── */}
      <div className="space-y-3">
        <SectionHeader title="Endgame" />

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Climb Level</Label>
          <Controller
            name="climb_level"
            control={control}
            render={({ field }) => (
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => field.onChange(lvl)}
                    className={cn(
                      'flex-1 h-14 rounded-xl text-lg font-bold transition-colors border-2',
                      field.value === lvl
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    {lvl === 0 ? 'No' : lvl}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Climb Speed</Label>
          <Controller
            name="climb_speed"
            control={control}
            render={({ field }) => (
              <RatingButtons value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <Controller
          name="park_success"
          control={control}
          render={({ field }) => (
            <ToggleButton value={field.value} onChange={field.onChange} trueLabel="Parked ✓" falseLabel="No Park" trueColor="bg-purple-600 border-purple-500 text-white" />
          )}
        />

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Climb Consistency</Label>
          <Controller
            name="climb_consistency"
            control={control}
            render={({ field }) => (
              <RatingButtons value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </div>

      {/* ── DRIVER EVALUATION (collapsible) ── */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setDriverExpanded(!driverExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-slate-800/60 text-slate-400 text-sm hover:text-white transition-colors"
        >
          <span className="font-medium">Driver Evaluation (optional)</span>
          {driverExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {driverExpanded && (
          <div className="space-y-3 px-1">
            {[
              { name: 'driver_smoothness' as const, label: 'Smoothness' },
              { name: 'driver_awareness' as const, label: 'Awareness' },
              { name: 'driver_recovery' as const, label: 'Recovery' },
              { name: 'driver_pressure' as const, label: 'Under Pressure' },
            ].map(({ name, label }) => (
              <div key={name}>
                <Label className="text-slate-400 text-sm mb-2 block">{label}</Label>
                <Controller
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <RatingButtons value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RELIABILITY ── */}
      <div className="space-y-3">
        <SectionHeader title="Reliability" />

        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'breakdown' as const, label: 'Broke Down', color: 'bg-red-600 border-red-500 text-white' },
            { name: 'brownout' as const, label: 'Brownout', color: 'bg-orange-600 border-orange-500 text-white' },
            { name: 'disconnect' as const, label: 'Disconnect', color: 'bg-amber-600 border-amber-500 text-white' },
          ].map(({ name, label, color }) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'h-14 rounded-xl text-xs font-bold transition-colors border-2',
                    field.value
                      ? color
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  {label}
                </button>
              )}
            />
          ))}
        </div>

        <Controller
          name="penalty_count"
          control={control}
          render={({ field }) => (
            <CounterButton label="Penalties" value={field.value} onChange={field.onChange} />
          )}
        />

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Foul Severity</Label>
          <Controller
            name="foul_severity"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12">
                  <SelectValue placeholder="Select if applicable..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="minor" className="text-white">Minor</SelectItem>
                  <SelectItem value="major" className="text-white">Major</SelectItem>
                  <SelectItem value="technical" className="text-white">Technical</SelectItem>
                  <SelectItem value="red_card" className="text-white">Red Card</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* ── NOTES ── */}
      <div className="space-y-3">
        <SectionHeader title="Notes" />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder="Additional observations, strategy notes..."
              rows={4}
              className="bg-slate-800 border-slate-700 text-white resize-none text-sm"
            />
          )}
        />

        <div>
          <Label className="text-slate-400 text-sm mb-2 block">Tags</Label>
          <div className="flex flex-wrap gap-2">
            {SCOUTING_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  tags.includes(tag)
                    ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <Controller
          name="recommended_pick"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              onClick={() => field.onChange(!field.value)}
              className={cn(
                'w-full h-14 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 transition-colors',
                field.value
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-700'
              )}
            >
              <Star className={cn('h-5 w-5', field.value ? 'fill-amber-400 text-amber-400' : '')} />
              {field.value ? 'Recommended Pick ★' : 'Mark as Recommended Pick'}
            </button>
          )}
        />
      </div>

      {/* ── SUBMIT ── */}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg rounded-xl"
      >
        {submitting ? 'Submitting...' : 'Submit Entry'}
      </Button>
    </form>
  )
}
