'use client'

import { useUIStore } from '@/store/uiStore'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const online = useUIStore((s) => s.onlineStatus)
  const unsynced = useUIStore((s) => s.unsyncedCount)

  if (online) return null

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center gap-2 text-sm font-medium">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Offline mode — scouting data saved locally
        {unsynced > 0 && ` (${unsynced} entries pending sync)`}
      </span>
    </div>
  )
}
