'use client'

import { useEffect, useState } from 'react'
import { getUnsyncedEntries } from './db'
import { useUIStore } from '@/store/uiStore'

export function useOfflineStorage() {
  const [count, setCount] = useState(0)
  const unsyncedCount = useUIStore((s) => s.unsyncedCount)

  useEffect(() => {
    async function load() {
      const entries = await getUnsyncedEntries()
      const c = entries.length
      setCount(c)
      useUIStore.getState().setUnsyncedCount(c)
    }
    load()
  }, [unsyncedCount])

  return { unsyncedCount: count }
}
