'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getEventsByYear } from '@/services/tba.service'
import { useEventStore } from '@/store/eventStore'
import type { TBAEvent } from '@/types/tba.types'
import type { Event } from '@/types/database.types'
import { formatDate } from '@/utils/format'
import { cn } from '@/lib/utils'
import { MapPin, Calendar, CheckCircle2 } from 'lucide-react'

export default function EventsPage() {
  const { activeEvent, setActiveEvent } = useEventStore()
  const currentYear = new Date().getFullYear()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['tba-events', currentYear],
    queryFn: () => getEventsByYear(currentYear),
    staleTime: 10 * 60 * 1000,
  })

  function selectEvent(e: TBAEvent) {
    const mapped: Event = {
      id: e.key,
      name: e.name,
      short_name: e.short_name,
      event_type: e.event_type,
      start_date: e.start_date,
      end_date: e.end_date,
      city: e.city,
      state_prov: e.state_prov,
      year: e.year,
      week: e.week ?? null,
      raw_data: null,
      synced_at: new Date().toISOString(),
    }
    setActiveEvent(mapped)
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Events — {currentYear}</h1>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 bg-slate-800" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {(events as TBAEvent[]).map((event) => {
            const isActive = activeEvent?.id === event.key
            return (
              <button
                key={event.key}
                onClick={() => selectEvent(event)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  isActive
                    ? 'bg-purple-600/20 border-purple-500/40'
                    : 'bg-[#0d0d18] border-white/[0.08] hover:border-slate-600'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{event.name}</p>
                    {isActive && <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />}
                  </div>
                  <p className="text-slate-400 text-xs truncate">
                    {event.key}
                    {event.week != null && ` · Week ${event.week + 1}`}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="flex items-center gap-1 text-slate-400 text-xs justify-end">
                    <MapPin className="h-3 w-3" />
                    {event.city}, {event.state_prov}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs justify-end">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.start_date)} – {formatDate(event.end_date)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
