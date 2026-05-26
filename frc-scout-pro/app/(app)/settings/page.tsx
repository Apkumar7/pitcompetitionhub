'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useScoutingStore } from '@/store/scoutingStore'
import { Hash } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const { scoutName, setScoutName } = useScoutingStore()
  const [displayName, setDisplayName] = useState('')
  const [teamNumber, setTeamNumber] = useState('')
  const [teamRole, setTeamRole] = useState('')
  const [saving, setSaving] = useState(false)

  const ROLE_OPTIONS = [
    { value: 'drive_team',  label: 'Drive Team',    emoji: '🏎️' },
    { value: 'pit_crew',    label: 'Pit Crew',       emoji: '🔧' },
    { value: 'scout',       label: 'Scout',          emoji: '📋' },
    { value: 'strategist',  label: 'Strategist',     emoji: '🎯' },
    { value: 'general',     label: 'General Member', emoji: '👤' },
  ]

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('display_name, team_number, team_role').eq('id', user.id).single().then(({ data }) => {
          if (data?.display_name) {
            setDisplayName(data.display_name)
            setScoutName(data.display_name)
          }
          if (data?.team_number) setTeamNumber(String(data.team_number))
          if (data?.team_role) setTeamRole(data.team_role)
        })
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const teamNum = parseInt(teamNumber, 10) || null

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, team_number: teamNum, team_role: teamRole || null })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to save')
    } else {
      setScoutName(displayName)
      toast.success('Settings saved')
    }
    setSaving(false)
  }

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-400 text-sm mb-1 block">Display Name / Scout Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-slate-800 border-slate-700 text-white h-11"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-sm mb-1 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              FRC Team Number
              {!teamNumber && (
                <span className="ml-auto text-amber-400 text-xs font-normal">Required for full access</span>
              )}
            </Label>
            <Input
              type="number"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              placeholder="e.g. 418"
              min={1}
              max={99999}
              className="bg-slate-800 border-slate-700 text-white h-11"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-sm mb-2 block">Your Role on the Team</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTeamRole(opt.value)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                    teamRole === opt.value
                      ? 'border-purple-500/60 bg-purple-500/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="text-sm font-medium flex-1">{opt.label}</span>
                  {teamRole === opt.value && <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={save}
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#0d0d18] border-white/[0.08]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">App Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Team</span>
            <span className="text-white">418 Purple Haze</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Version</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Platform</span>
            <span className="text-white">FRC Scout Pro</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
