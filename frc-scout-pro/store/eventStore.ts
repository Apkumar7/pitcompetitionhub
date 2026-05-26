import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Event } from '@/types/database.types'

interface EventStore {
  activeEvent: Event | null
  setActiveEvent: (event: Event | null) => void
  events: Event[]
  setEvents: (events: Event[]) => void
}

export const useEventStore = create<EventStore>()(
  persist(
    (set) => ({
      activeEvent: null,
      setActiveEvent: (event) => set({ activeEvent: event }),
      events: [],
      setEvents: (events) => set({ events }),
    }),
    { name: 'frc-scout-event' }
  )
)
