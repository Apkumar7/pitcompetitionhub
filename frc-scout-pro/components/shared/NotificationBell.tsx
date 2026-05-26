'use client'

// ─── Notification Bell ─────────────────────────────────────────────────────
// Displays a bell icon with an unread count badge. Polls every 60 seconds
// so scouts see new notifications (sync alerts, welcome messages, etc.)
// without requiring a page reload.
// ──────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const supabase = createClient()

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      return count ?? 0
    },
    // Refresh every minute so scouts see new notifications without reloading
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  return (
    <Link href="/notifications">
      <button className="relative flex items-center justify-center h-8 w-8 rounded-lg text-[#6b6b8a] hover:text-white hover:bg-white/[0.06] transition-colors">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold border border-[#07070e]',
            unreadCount > 9 ? 'w-4 h-4 text-[9px]' : 'w-3.5 h-3.5 text-[9px]'
          )}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </Link>
  )
}
