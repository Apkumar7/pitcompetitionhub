import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  onlineStatus: boolean
  setOnlineStatus: (online: boolean) => void
  unsyncedCount: number
  setUnsyncedCount: (count: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  onlineStatus: true,
  setOnlineStatus: (online) => set({ onlineStatus: online }),
  unsyncedCount: 0,
  setUnsyncedCount: (count) => set({ unsyncedCount: count }),
}))
