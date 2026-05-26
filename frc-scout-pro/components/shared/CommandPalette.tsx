'use client'

// ─── Command Palette ────────────────────────────────────────────────────────
// Keyboard-accessible search overlay. Opens with Cmd+K (or Ctrl+K).
// Searches teams by number/name from the active event.
// Also surfaces quick navigation shortcuts.
//
// Keyboard shortcuts:
//   Cmd/Ctrl+K  → open
//   Escape      → close
//   ↑ / ↓       → navigate results
//   Enter       → activate highlighted result
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import {
  Search, LayoutDashboard, Calendar, ClipboardList, Users,
  BarChart3, Handshake, Target, Settings, X, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Result {
  id: string
  label: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const QUICK_LINKS: Result[] = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'nav-scout', label: 'Match Scout', icon: ClipboardList, href: '/scout/match' },
  { id: 'nav-teams', label: 'Teams', icon: Users, href: '/teams' },
  { id: 'nav-schedule', label: 'Schedule', icon: Calendar, href: '/schedule' },
  { id: 'nav-analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { id: 'nav-alliance', label: 'Alliance Selection', icon: Handshake, href: '/alliance' },
  { id: 'nav-strategy', label: 'Strategy Center', icon: Target, href: '/strategy' },
  { id: 'nav-settings', label: 'Settings', icon: Settings, href: '/settings' },
]

export function CommandPalette() {
  const router = useRouter()
  const searchOpen = useUIStore((s) => s.searchOpen)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const activeEvent = useEventStore((s) => s.activeEvent)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Open on Cmd+K or Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setSearchOpen])

  // Focus input when opened
  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  const { data: teams = [] } = useQuery({
    queryKey: ['palette-teams', activeEvent?.id],
    enabled: !!activeEvent,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_teams')
        .select('team_number, nickname, ranking')
        .eq('event_id', activeEvent!.id)
        .order('ranking', { ascending: true, nullsFirst: false })
        .limit(100)
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const teamResults: Result[] = teams
    .filter((t: Record<string, unknown>) => {
      if (!query) return false
      const q = query.toLowerCase()
      return (
        String(t.team_number).includes(q) ||
        ((t.nickname as string) ?? '').toLowerCase().includes(q)
      )
    })
    .slice(0, 6)
    .map((t: Record<string, unknown>) => ({
      id: `team-${t.team_number}`,
      label: `Team ${t.team_number}`,
      sub: (t.nickname as string) ?? undefined,
      icon: Users,
      href: `/teams/${t.team_number}`,
    }))

  const navResults = QUICK_LINKS.filter((l) =>
    !query || l.label.toLowerCase().includes(query.toLowerCase())
  )

  const results: Result[] = query
    ? [...teamResults, ...navResults.slice(0, 4)]
    : navResults

  const close = useCallback(() => {
    setSearchOpen(false)
    setQuery('')
  }, [setSearchOpen])

  function activate(result: Result) {
    router.push(result.href)
    close()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) { activate(results[cursor]) }
  }

  if (!searchOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-lg bg-[#0d0d18] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            placeholder="Search teams, navigate…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-600 outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); setCursor(0) }} className="text-slate-600 hover:text-slate-400">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="shrink-0 flex items-center px-1.5 py-0.5 rounded border border-white/[0.08] text-[10px] text-[#4a4a65]">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="text-slate-600 text-sm text-center py-6">No results for "{query}"</p>
          )}

          {/* Team section header */}
          {teamResults.length > 0 && (
            <p className="px-4 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">Teams</p>
          )}

          {teamResults.map((r, i) => (
            <button
              key={r.id}
              onClick={() => activate(r)}
              onMouseEnter={() => setCursor(i)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                cursor === i ? 'bg-purple-600/15 text-white' : 'text-slate-300 hover:bg-white/[0.04]'
              )}
            >
              <r.icon className={cn('h-4 w-4 shrink-0', cursor === i ? 'text-purple-400' : 'text-slate-600')} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold">{r.label}</span>
                {r.sub && <span className="text-xs text-slate-500 ml-2">{r.sub}</span>}
              </div>
              <ArrowRight className={cn('h-3.5 w-3.5 shrink-0', cursor === i ? 'text-purple-400 opacity-100' : 'opacity-0')} />
            </button>
          ))}

          {/* Nav section */}
          {navResults.length > 0 && (
            <p className={cn(
              'px-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600',
              teamResults.length > 0 ? 'pt-3' : 'pt-1'
            )}>
              Navigate
            </p>
          )}

          {navResults.slice(0, query ? 4 : 8).map((r, i) => {
            const idx = teamResults.length + i
            return (
              <button
                key={r.id}
                onClick={() => activate(r)}
                onMouseEnter={() => setCursor(idx)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  cursor === idx ? 'bg-purple-600/15 text-white' : 'text-slate-300 hover:bg-white/[0.04]'
                )}
              >
                <r.icon className={cn('h-4 w-4 shrink-0', cursor === idx ? 'text-purple-400' : 'text-slate-600')} />
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                <ArrowRight className={cn('h-3.5 w-3.5 shrink-0', cursor === idx ? 'text-purple-400 opacity-100' : 'opacity-0')} />
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-3 text-[10px] text-slate-600">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
