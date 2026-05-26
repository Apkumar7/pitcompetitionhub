'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, ClipboardList, Microscope, Users, BarChart3,
  Handshake, Target, Settings, Bell, ShieldCheck, LogOut, Wifi, WifiOff,
  AlertTriangle, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import type { Profile } from '@/types/database.types'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-violet-400' },
      { href: '/schedule',  icon: Calendar,         label: 'Schedule',  color: 'text-blue-400' },
    ],
  },
  {
    label: 'Scouting',
    items: [
      { href: '/scout/match', icon: ClipboardList, label: 'Match Scout', color: 'text-sky-400' },
      { href: '/scout/pit',   icon: Microscope,    label: 'Pit Scout',   color: 'text-cyan-400' },
      { href: '/teams',       icon: Users,          label: 'Teams',       color: 'text-teal-400' },
    ],
  },
  {
    label: 'Strategy',
    items: [
      { href: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-emerald-400' },
      { href: '/alliance',  icon: Handshake, label: 'Alliance',  color: 'text-purple-400' },
      { href: '/strategy',  icon: Target,    label: 'Strategy',  color: 'text-fuchsia-400' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/notifications', icon: Bell,     label: 'Notifications', color: 'text-amber-400' },
      { href: '/settings',      icon: Settings, label: 'Settings',      color: 'text-slate-400' },
    ],
  },
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const online = useUIStore((s) => s.onlineStatus)
  const unsyncedCount = useUIStore((s) => s.unsyncedCount)
  const activeEvent = useEventStore((s) => s.activeEvent)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen bg-sidebar border-r border-sidebar-border shrink-0">

      {/* ── Logo ── */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            418
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[13px] leading-none tracking-tight">FRC Scout Pro</p>
            <p className="text-purple-400/70 text-[11px] mt-0.5 tracking-wide uppercase font-medium">Purple Haze</p>
          </div>
        </div>

        {/* Active event chip */}
        {activeEvent && (
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 pulse-dot" />
            <span className="text-purple-300 text-[11px] font-medium truncate">
              {activeEvent.short_name ?? activeEvent.name}
            </span>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label, color }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'text-white bg-white/[0.07]'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                    )}
                  >
                    {/* Active left bar */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #a78bfa, #818cf8)' }}
                      />
                    )}
                    <Icon className={cn('h-[15px] w-[15px] shrink-0 transition-colors', active ? color : 'text-slate-600 group-hover:' + color.replace('text-', 'text-'))} />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight className="h-3 w-3 text-slate-600" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Admin */}
        {profile?.role === 'admin' && (
          <div>
            <div className="space-y-0.5">
              {[{ href: '/admin', icon: ShieldCheck, label: 'Admin Panel', color: 'text-rose-400' }].map(
                ({ href, icon: Icon, label, color }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                        active
                          ? 'text-white bg-white/[0.07]'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-rose-500" />
                      )}
                      <Icon className={cn('h-[15px] w-[15px] shrink-0', active ? color : 'text-slate-600')} />
                      <span className="flex-1">{label}</span>
                    </Link>
                  )
                }
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Online status */}
        <div className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium',
          online ? 'text-emerald-400' : 'text-amber-400'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', online ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400')} />
          {online ? 'Connected' : 'Offline'}
          {unsyncedCount > 0 && (
            <span className="ml-auto flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              {unsyncedCount} unsynced
            </span>
          )}
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed60, #4f46e560)', border: '1px solid #7c3aed40' }}
          >
            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[12px] font-semibold leading-none truncate">{profile?.display_name ?? 'Scout'}</p>
            <p className="text-slate-500 text-[10px] mt-0.5 capitalize">{profile?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1 rounded"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
