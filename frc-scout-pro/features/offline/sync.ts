'use client'

import { createClient } from '@/lib/supabase/client'
import { getSyncQueue, removeSyncQueueItem, markEntrySynced, getUnsyncedEntries } from './db'
import { useUIStore } from '@/store/uiStore'

let isSyncing = false

export async function processSyncQueue() {
  if (isSyncing) return
  isSyncing = true

  const supabase = createClient()
  const queue = await getSyncQueue()

  for (const item of queue) {
    try {
      if (item.type === 'scouting_entry') {
        const { error } = await supabase.from('scouting_entries').upsert(item.data as Parameters<typeof supabase.from>[0])
        if (!error && item.id != null) {
          await removeSyncQueueItem(item.id)
          if (item.data.offline_id) {
            await markEntrySynced(item.data.offline_id as string)
          }
        }
      }
    } catch {
      // Network failure — leave in queue for retry
    }
  }

  const unsynced = await getUnsyncedEntries()
  useUIStore.getState().setUnsyncedCount(unsynced.length)

  isSyncing = false
}

export function setupOnlineListener() {
  if (typeof window === 'undefined') return

  window.addEventListener('online', () => {
    useUIStore.getState().setOnlineStatus(true)
    processSyncQueue()
  })

  window.addEventListener('offline', () => {
    useUIStore.getState().setOnlineStatus(false)
  })

  useUIStore.getState().setOnlineStatus(navigator.onLine)
}
