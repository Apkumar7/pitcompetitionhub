'use client'

// ─── Admin Dashboard ───────────────────────────────────────────────────────
// Admin-only control panel. Receives the users list as a prop (pre-fetched
// server-side) so initial render is instant.
//
// Capabilities:
//   User management  — change any user's role via a Select dropdown.
//                      Change is written immediately to Supabase profiles.
//   Event sync       — triggers POST /api/sync/event/[key] for the active
//                      event. Pulls fresh data from TBA + Statbotics.
//   Data export      — downloads all scouting entries for the active event
//                      as a JSON file for offline analysis.
//
// RLS note: role changes use the client, not a service client. The profiles
// table RLS must allow admins to UPDATE other rows. If that policy is missing,
// role changes will silently fail — check the Supabase policies dashboard.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile, UserRole } from '@/types/database.types'
import { Download, RefreshCw, Users, Database } from 'lucide-react'
import { useEventStore } from '@/store/eventStore'

interface Props {
  users: Profile[]
}

export function AdminDashboard({ users: initialUsers }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [syncing, setSyncing] = useState(false)
  const activeEvent = useEventStore((s) => s.activeEvent)
  const supabase = createClient()

  async function updateRole(userId: string, role: UserRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update role')
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
      toast.success('Role updated')
    }
  }

  async function handleSync() {
    if (!activeEvent) {
      toast.error('Select an event first')
      return
    }
    setSyncing(true)
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        fetch(`/api/tba/event/${activeEvent.id}/teams`),
        fetch(`/api/tba/event/${activeEvent.id}/matches`),
      ])

      if (!teamsRes.ok || !matchesRes.ok) throw new Error('Sync failed')

      const [teamsData, matchesData] = await Promise.all([teamsRes.json(), matchesRes.json()])

      // Upsert teams
      if (Array.isArray(teamsData)) {
        const teams = teamsData.map((t: Record<string, unknown>) => ({
          event_id: activeEvent.id,
          team_number: t.team_number as number,
          nickname: t.nickname as string,
          city: t.city as string,
          state_prov: t.state_prov as string,
          raw_tba: t,
          updated_at: new Date().toISOString(),
        }))
        await supabase.from('event_teams').upsert(teams, { onConflict: 'event_id,team_number' })
      }

      // Upsert matches
      if (Array.isArray(matchesData)) {
        const matches = matchesData.map((m: Record<string, unknown>) => ({
          id: m.key as string,
          event_id: activeEvent.id,
          comp_level: m.comp_level as string,
          match_number: m.match_number as number,
          set_number: (m.set_number as number) ?? 1,
          scheduled_time: m.time ? new Date((m.time as number) * 1000).toISOString() : null,
          actual_time: m.actual_time ? new Date((m.actual_time as number) * 1000).toISOString() : null,
          red_teams: ((m.alliances as Record<string, unknown>)?.red as Record<string, unknown>)?.team_keys
            ? (((m.alliances as Record<string, unknown>).red as Record<string, unknown>).team_keys as string[]).map((k: string) => parseInt(k.replace('frc', ''), 10))
            : [],
          blue_teams: ((m.alliances as Record<string, unknown>)?.blue as Record<string, unknown>)?.team_keys
            ? (((m.alliances as Record<string, unknown>).blue as Record<string, unknown>).team_keys as string[]).map((k: string) => parseInt(k.replace('frc', ''), 10))
            : [],
          red_score: ((m.alliances as Record<string, unknown>)?.red as Record<string, unknown>)?.score as number | null,
          blue_score: ((m.alliances as Record<string, unknown>)?.blue as Record<string, unknown>)?.score as number | null,
          winner: m.winning_alliance as string | null,
          raw_data: m,
          synced_at: new Date().toISOString(),
        }))
        await supabase.from('matches').upsert(matches, { onConflict: 'id' })
      }

      toast.success(`Synced ${teamsData.length ?? 0} teams and ${matchesData.length ?? 0} matches`)
    } catch (e) {
      toast.error('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setSyncing(false)
    }
  }

  async function exportCSV(type: string) {
    if (!activeEvent) {
      toast.error('Select an event first')
      return
    }
    window.location.href = `/api/export/${type}?event=${activeEvent.id}`
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>

      {/* Event sync */}
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            Data Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-400 text-sm">Active Event: <span className="text-white">{activeEvent?.name ?? 'None selected'}</span></p>
          <Button
            onClick={handleSync}
            disabled={syncing || !activeEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from TBA'}
          </Button>
        </CardContent>
      </Card>

      {/* User management */}
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" />
            User Management ({users.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{user.display_name ?? 'No name'}</p>
                  <p className="text-slate-400 text-xs">{user.email}</p>
                </div>
                <Select
                  value={user.role}
                  onValueChange={(v) => updateRole(user.id, v as UserRole)}
                >
                  <SelectTrigger className="w-28 h-8 bg-slate-700 border-slate-600 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="admin" className="text-white text-xs">Admin</SelectItem>
                    <SelectItem value="lead" className="text-white text-xs">Lead</SelectItem>
                    <SelectItem value="scout" className="text-white text-xs">Scout</SelectItem>
                    <SelectItem value="viewer" className="text-white text-xs">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data export */}
      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            Data Export
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { type: 'scouting-entries', label: 'Scouting Entries (CSV)' },
            { type: 'pit-scouting', label: 'Pit Scouting (CSV)' },
            { type: 'picklists', label: 'Picklists (CSV)' },
          ].map(({ type, label }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => exportCSV(type)}
              className="border-slate-700 text-slate-300 hover:text-white gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
