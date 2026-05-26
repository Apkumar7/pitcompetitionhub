'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, ClipboardList, Users, BarChart3, Zap, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { TeamRole } from '@/types/database.types'

const DEFAULT_NAV = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Home'     },
  { href: '/schedule',    icon: Calendar,         label: 'Schedule' },
  { href: '/scout/match', icon: ClipboardList,    label: 'Scout'    },
  { href: '/teams',       icon: Users,             label: 'Teams'    },
  { href: '/analytics',  icon: BarChart3,         label: 'Stats'    },
]

const ROLE_NAV: Partial<Record<TeamRole, { href: string; icon: typeof Zap; label: string }>> = {
  drive_team: { href: '/drive-team', icon: Zap,    label: 'Drive'  },
  pit_crew:   { href: '/pit-crew',   icon: Wrench, label: 'Pit'    },
}

export function MobileNav() {
  const pathname = usePathname()
  const [teamRole, setTeamRole] = useState<TeamRole | null>(null)

  // Fetch team role once — drives which icon replaces "Stats" on mobile
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('team_role').eq('id', user.id).single().then(({ data }) => {
        if (data?.team_role) setTeamRole(data.team_role as TeamRole)
      })
    })
  }, [])

  // Replace the last nav item with a role-specific link when applicable
  const roleItem = teamRole ? ROLE_NAV[teamRole] : undefined
  const nav = roleItem
    ? [...DEFAULT_NAV.slice(0, 4), { href: roleItem.href, icon: roleItem.icon, label: roleItem.label }]
    : DEFAULT_NAV

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#07070e]/98 backdrop-blur-xl border-t border-white/[0.06] flex items-center px-2">
      {nav.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 h-full py-2 rounded-xl mx-0.5 transition-all',
              active ? 'bg-white/[0.06]' : ''
            )}
          >
            <Icon className={cn(
              'h-[18px] w-[18px] transition-colors',
              active ? 'text-violet-400' : 'text-[#4a4a65]'
            )} />
            <span className={cn(
              'text-[10px] font-semibold transition-colors',
              active ? 'text-white' : 'text-[#4a4a65]'
            )}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
