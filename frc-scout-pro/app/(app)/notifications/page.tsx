'use client'

// ─── Notifications Page ────────────────────────────────────────────────────
// Displays all notifications for the current user, newest first.
// Notifications are created by:
//   • Welcome notification on signup
//   • Broadcast after event sync (new match/team data)
//   • Per-entry notification when a scouting form is submitted
//
// Unread notifications appear with a purple tint.
// "Mark all read" updates all unread rows in one call.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/utils/format'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types/database.types'

export default function NotificationsPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data ?? []) as Notification[]
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      // Also refresh the bell count
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  // Auto-mark all as read when the page is viewed (after a brief delay so the
  // user can see which ones were unread before they disappear)
  useEffect(() => {
    const timer = setTimeout(() => markAllRead.mutate(), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllRead.mutate()}
          className="text-slate-400 hover:text-white gap-1.5"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={cn('border-slate-800', !n.read && 'border-purple-500/30 bg-purple-500/5')}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', !n.read ? 'bg-purple-400' : 'bg-slate-700')} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-slate-400 text-xs mt-0.5">{n.body}</p>}
                  <p className="text-slate-500 text-xs mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
