'use client'

import { Bell, Search, RefreshCw, ChevronDown, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEventStore } from '@/store/eventStore'
import { useUIStore } from '@/store/uiStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getEventsByYear } from '@/services/tba.service'
import type { TBAEvent } from '@/types/tba.types'
import type { Event } from '@/types/database.types'
import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { activeEvent, setActiveEvent } = useEventStore()
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)

  const currentYear = new Date().getFullYear()
  const { data: events = [] } = useQuery({
    queryKey: ['tba-events', currentYear],
    queryFn: () => getEventsByYear(currentYear),
    staleTime: 10 * 60 * 1000,
  })

  async function handleEventChange(eventKey: string) {
    const tbaEvent = events.find((e: TBAEvent) => e.key === eventKey)
    if (!tbaEvent) return
    const mapped: Event = {
      id: tbaEvent.key,
      name: tbaEvent.name,
      short_name: tbaEvent.short_name,
      event_type: tbaEvent.event_type,
      start_date: tbaEvent.start_date,
      end_date: tbaEvent.end_date,
      city: tbaEvent.city,
      state_prov: tbaEvent.state_prov,
      year: tbaEvent.year,
      week: tbaEvent.week ?? null,
      raw_data: null,
      synced_at: new Date().toISOString(),
    }
    setActiveEvent(mapped)
  }

  async function handleSync() {
    if (!activeEvent) { toast.error('Select an event first'); return }
    setSyncing(true)
    try {
      const res = await fetch(`/api/sync/event/${activeEvent.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Sync failed')
      toast.success(`Synced ${json.synced.teams} teams · ${json.synced.matches} matches`)
      queryClient.invalidateQueries()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="h-13 border-b border-white/[0.06] bg-background/80 backdrop-blur-md flex items-center gap-2 px-4 sticky top-0 z-40">

      {/* Event selector */}
      <div className="w-[240px]">
        <Select value={activeEvent?.id ?? ''} onValueChange={(v) => v && handleEventChange(v)}>
          <SelectTrigger className={cn(
            'h-8 text-[13px] border-white/10 bg-white/[0.05] hover:bg-white/[0.08] transition-colors',
            activeEvent ? 'text-white' : 'text-slate-500'
          )}>
            {activeEvent ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="truncate font-medium">{activeEvent.short_name ?? activeEvent.name}</span>
              </div>
            ) : (
              <span>Select event…</span>
            )}
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d18] border-white/10">
            {events.map((e: TBAEvent) => (
              <SelectItem key={e.key} value={e.key} className="text-slate-300 hover:text-white text-[13px] focus:bg-white/[0.06]">
                <span className="font-medium text-white">{e.short_name ?? e.name}</span>
                <span className="ml-1.5 text-slate-500 text-[11px]">{e.key}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      {/* Sync button */}
      <button
        onClick={handleSync}
        disabled={syncing}
        title="Sync from TBA"
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-all',
          syncing
            ? 'bg-purple-500/20 text-purple-300 cursor-wait'
            : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'
        )}
      >
        <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
        <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
      </button>

      {/* Search */}
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.07] transition-all text-[12px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Search…</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-slate-600">⌘K</kbd>
      </button>

      {/* Notifications */}
      <Link href="/notifications">
        <button className="relative flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>
      </Link>
    </header>
  )
}
