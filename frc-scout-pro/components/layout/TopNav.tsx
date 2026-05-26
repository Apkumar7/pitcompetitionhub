'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Calendar, ClipboardList, Microscope, Users, BarChart3,
  Handshake, Target, Settings, ShieldCheck, LogOut, Search,
  RefreshCw, ChevronDown, Menu, X, AlertTriangle, Zap, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { getEventsByYear } from '@/services/tba.service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { CommandPalette } from '@/components/shared/CommandPalette'
import type { TBAEvent } from '@/types/tba.types'
import type { Event, Profile } from '@/types/database.types'
import { toast } from 'sonner'

function buildNav(teamRole: string | null | undefined) {
  const base = [
    {
      label: 'Scout',
      items: [
        { href: '/scout/match', icon: ClipboardList, label: 'Match Scout', desc: 'Record robot performance during matches' },
        { href: '/scout/pit', icon: Microscope, label: 'Pit Scout', desc: 'Inspect and document robots in the pit' },
      ],
    },
    {
      label: 'Intel',
      items: [
        { href: '/teams', icon: Users, label: 'Teams', desc: 'Browse and compare event teams' },
        { href: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Rankings, EPA trends, performance graphs' },
      ],
    },
    {
      label: 'Strategy',
      items: [
        { href: '/schedule', icon: Calendar, label: 'Schedule', desc: 'Match schedule and win predictions' },
        { href: '/alliance', icon: Handshake, label: 'Alliance Selection', desc: 'Build and rank your alliance picklist' },
        { href: '/strategy', icon: Target, label: 'Strategy Center', desc: 'Pre-match tactical breakdown' },
      ],
    },
  ]

  // Inject role-specific items
  if (teamRole === 'drive_team') {
    base[0].items.unshift({ href: '/drive-team', icon: Zap, label: 'Drive Team Hub', desc: 'Post-match analytics and AI analysis' })
  }
  if (teamRole === 'pit_crew') {
    base[0].items.unshift({ href: '/pit-crew', icon: Wrench, label: 'Robot Status', desc: 'Breakdown tracker and reliability monitor' })
  }

  return base
}

interface TopNavProps {
  profile: Profile | null
}

export function TopNav({ profile }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const online = useUIStore((s) => s.onlineStatus)
  const unsyncedCount = useUIStore((s) => s.unsyncedCount)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const { activeEvent, setActiveEvent } = useEventStore()

  const NAV = buildNav(profile?.team_role)

  const currentYear = new Date().getFullYear()
  const { data: events = [] } = useQuery({
    queryKey: ['tba-events', currentYear],
    queryFn: () => getEventsByYear(currentYear),
    staleTime: 10 * 60 * 1000,
  })

  function handleEventChange(eventKey: string) {
    const tbaEvent = events.find((e: TBAEvent) => e.key === eventKey)
    if (!tbaEvent) return
    const mapped: Event = {
      id: tbaEvent.key,
      name: tbaEvent.name,
      short_name: tbaEvent.short_name,
      event_type: tbaEvent.event_type,
      start_date: tbaEvent.start_date,
      end_date: tbaEvent.end_date,
      city: tbaEvent.city,
      state_prov: tbaEvent.state_prov,
      year: tbaEvent.year,
      week: tbaEvent.week ?? null,
      raw_data: null,
      synced_at: new Date().toISOString(),
    }
    setActiveEvent(mapped)
  }

  async function handleSync() {
    if (!activeEvent) { toast.error('Select an event first'); return }
    setSyncing(true)
    try {
      const res = await fetch(`/api/sync/event/${activeEvent.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Sync failed')
      toast.success(`Synced ${json.synced.teams} teams · ${json.synced.matches} matches`)
      queryClient.invalidateQueries()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const groupActive = (items: { href: string }[]) =>
    items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'))

  const itemActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Command palette — rendered at z-[100], outside the header stacking context */}
      <CommandPalette />

      {/* ── Desktop + tablet nav ── */}
      <header className="sticky top-0 z-50 w-full h-[56px] flex items-center gap-1 px-4 lg:px-5 border-b border-white/[0.06] bg-[#07070e]/95 backdrop-blur-xl shrink-0">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 mr-5 shrink-0"
        >
          <div
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
          >
            418
          </div>
          <span className="hidden sm:block text-[14px] font-semibold text-white tracking-tight">
            Scout Pro
          </span>
        </Link>

        {/* ── Desktop nav items ── */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors',
              itemActive('/dashboard')
                ? 'text-white bg-white/[0.08]'
                : 'text-[#6b6b8a] hover:text-white hover:bg-white/[0.05]'
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          {/* Dropdown groups */}
          {NAV.map((group) => {
            const active = groupActive(group.items)
            const open = openMenu === group.label
            return (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(group.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors',
                    active || open
                      ? 'text-white bg-white/[0.08]'
                      : 'text-[#6b6b8a] hover:text-white hover:bg-white/[0.05]'
                  )}
                >
                  {group.label}
                  <ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} />
                </button>

                {/* Dropdown */}
                <div
                  className={cn(
                    'absolute top-[calc(100%-1px)] left-0 pt-2 min-w-[280px]',
                    'transition-all duration-150 origin-top-left',
                    open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.97] pointer-events-none'
                  )}
                >
                  <div className="rounded-xl border border-white/[0.1] bg-[#101020] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="p-1.5">
                      {group.items.map(({ href, icon: Icon, label, desc }) => {
                        const active = itemActive(href)
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setOpenMenu(null)}
                            className={cn(
                              'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
                              active
                                ? 'bg-violet-500/10 text-white'
                                : 'text-[#9090a8] hover:bg-white/[0.05] hover:text-white'
                            )}
                          >
                            <div className={cn(
                              'mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                              active ? 'bg-violet-500/20' : 'bg-white/[0.05]'
                            )}>
                              <Icon className={cn('h-3.5 w-3.5', active ? 'text-violet-400' : 'text-[#5a5a7a]')} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold leading-none mb-1 text-inherit">{label}</p>
                              <p className="text-[11px] text-[#5a5a7a] leading-snug">{desc}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1.5 ml-auto">

          {/* Event selector */}
          <div className="hidden sm:block">
            <Select value={activeEvent?.id ?? ''} onValueChange={(v) => v && handleEventChange(v)}>
              <SelectTrigger className={cn(
                'h-8 w-[190px] text-[12px] border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] transition-colors rounded-lg',
                activeEvent ? 'text-white' : 'text-[#6b6b8a]'
              )}>
                {activeEvent ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span className="truncate text-[12px]">{activeEvent.short_name ?? activeEvent.name}</span>
                  </div>
                ) : (
                  <span>Select event…</span>
                )}
              </SelectTrigger>
              <SelectContent className="bg-[#101020] border-white/[0.1]">
                {events.map((e: TBAEvent) => (
                  <SelectItem key={e.key} value={e.key} className="text-[#9090a8] hover:text-white text-[12px] focus:bg-white/[0.06]">
                    <span className="font-semibold text-white">{e.short_name ?? e.name}</span>
                    <span className="ml-1.5 text-[#5a5a7a] text-[10px]">{e.key}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sync */}
          {activeEvent && (
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Sync from TBA"
              className={cn(
                'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium transition-all',
                syncing
                  ? 'bg-violet-500/15 text-violet-300 cursor-wait'
                  : 'text-[#6b6b8a] hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
              <span className="hidden md:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
            </button>
          )}

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[#6b6b8a] hover:text-white hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-[12px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded border border-white/[0.08] text-[10px] text-[#4a4a65]">⌘K</kbd>
          </button>

          {/* Notifications — real unread count */}
          <NotificationBell />

          {/* Profile dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setOpenMenu('profile')}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button className="flex items-center gap-1.5 h-8 px-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed55, #4338ca55)', border: '1px solid rgba(124,58,237,0.3)' }}
              >
                {profile?.display_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <ChevronDown className="h-3 w-3 text-[#6b6b8a] hidden md:block" />
            </button>

            <div
              className={cn(
                'absolute top-[calc(100%-1px)] right-0 pt-2 w-52',
                'transition-all duration-150 origin-top-right',
                openMenu === 'profile' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.97] pointer-events-none'
              )}
            >
              <div className="rounded-xl border border-white/[0.1] bg-[#101020] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-white">{profile?.display_name ?? 'Scout'}</p>
                    {profile?.team_role && (
                      <span className="text-base leading-none" title={profile.team_role.replace('_', ' ')}>
                        {{'drive_team':'🏎️','pit_crew':'🔧','scout':'📋','strategist':'🎯','general':'👤'}[profile.team_role] ?? ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', online ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400')} />
                    <p className="text-[11px] text-[#5a5a7a] capitalize">
                      {online ? 'Connected' : 'Offline'} · {profile?.role}
                      {profile?.team_number ? ` · #${profile.team_number}` : ''}
                    </p>
                    {unsyncedCount > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-amber-400 text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5" />{unsyncedCount}
                      </span>
                    )}
                  </div>
                  {/* Nudge to set team number if missing */}
                  {!profile?.team_number && (
                    <Link
                      href="/settings"
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
                      onClick={() => setOpenMenu(null)}
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Set your FRC team number
                    </Link>
                  )}
                </div>
                <div className="p-1.5">
                  <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-[#9090a8] hover:bg-white/[0.05] hover:text-white transition-colors" onClick={() => setOpenMenu(null)}>
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-[#9090a8] hover:bg-white/[0.05] hover:text-white transition-colors" onClick={() => setOpenMenu(null)}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-[#6b6b8a] hover:text-white hover:bg-white/[0.06] transition-colors ml-1"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Mobile full-screen menu ── */}
      <div className={cn(
        'lg:hidden fixed inset-0 z-40 bg-[#07070e] transition-all duration-200',
        mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}>
        <div className="pt-[56px] p-4">
          <div className="space-y-0.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-[#9090a8] hover:text-white hover:bg-white/[0.05] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-[#5a5a7a]" />
              Dashboard
            </Link>
            {NAV.map((group) => (
              <div key={group.label}>
                <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#3a3a55]">{group.label}</p>
                {group.items.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-[#9090a8] hover:text-white hover:bg-white/[0.05] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="h-4 w-4 text-[#5a5a7a]" />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div>
              <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#3a3a55]">Account</p>
              <Link href="/settings" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-[#9090a8] hover:text-white hover:bg-white/[0.05] transition-colors" onClick={() => setMobileOpen(false)}>
                <Settings className="h-4 w-4 text-[#5a5a7a]" />
                Settings
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-[#9090a8] hover:text-white hover:bg-white/[0.05] transition-colors" onClick={() => setMobileOpen(false)}>
                  <ShieldCheck className="h-4 w-4 text-[#5a5a7a]" />
                  Admin Panel
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
