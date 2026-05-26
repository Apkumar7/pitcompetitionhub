'use client'

import { useEffect } from 'react'
import { setupOnlineListener } from '@/features/offline/sync'

export function OnlineStatusSync() {
  useEffect(() => {
    setupOnlineListener()
  }, [])
  return null
}
