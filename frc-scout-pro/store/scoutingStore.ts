import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ScoutingStore {
  scoutName: string
  setScoutName: (name: string) => void
  lastMatchNumber: number
  setLastMatchNumber: (num: number) => void
  autoAdvanceMatch: boolean
  setAutoAdvanceMatch: (v: boolean) => void
}

export const useScoutingStore = create<ScoutingStore>()(
  persist(
    (set) => ({
      scoutName: '',
      setScoutName: (name) => set({ scoutName: name }),
      lastMatchNumber: 1,
      setLastMatchNumber: (num) => set({ lastMatchNumber: num }),
      autoAdvanceMatch: true,
      setAutoAdvanceMatch: (v) => set({ autoAdvanceMatch: v }),
    }),
    { name: 'frc-scout-scouting' }
  )
)
