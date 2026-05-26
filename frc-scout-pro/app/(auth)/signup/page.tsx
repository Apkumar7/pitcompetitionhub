'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowRight, Lock, Mail, User, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [frcTeamNumber, setFrcTeamNumber] = useState('')
  const [teamRole, setTeamRole] = useState('')
  const [loading, setLoading] = useState(false)

  const ROLE_OPTIONS = [
    { value: 'drive_team',  label: 'Drive Team',     emoji: '🏎️', desc: 'Driver, operator, human player, or coach' },
    { value: 'pit_crew',    label: 'Pit Crew',        emoji: '🔧', desc: 'Robot maintenance and repairs' },
    { value: 'scout',       label: 'Scout',           emoji: '📋', desc: 'Match and pit scouting' },
    { value: 'strategist',  label: 'Strategist',      emoji: '🎯', desc: 'Alliance selection and game strategy' },
    { value: 'general',     label: 'General Member',  emoji: '👤', desc: 'General team support' },
  ]

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })

    if (error) {
      if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('email rate')) {
        toast.error('Too many sign-up attempts. Wait a few minutes, or ask your admin to disable email confirmation in Supabase.')
      } else if (error.message.toLowerCase().includes('already registered')) {
        toast.error('That email is already registered. Try signing in instead.')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      const teamNum = parseInt(frcTeamNumber, 10) || null

      // Create profile row (best-effort — trigger may already handle this)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        display_name: displayName,
        role: 'scout',
        team_number: teamNum,
        team_role: teamRole || 'general',
      })

      // Send a welcome notification to the new user
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user.id,
          title: `Welcome, ${displayName || 'Scout'}!`,
          body: teamNum
            ? `You're set up as a scout for Team ${teamNum}. Select an event to get started.`
            : 'Your account is ready. Set your FRC team number in Settings.',
          type: 'welcome',
        }),
      })

      if (data.session) {
        // Email confirmation disabled — session is live, go straight to dashboard
        toast.success('Account created! Welcome to FRC Scout Pro.')
        router.push('/dashboard')
        router.refresh()
      } else {
        // Email confirmation required — Supabase sent a confirmation email
        toast.success('Check your email to confirm your account, then sign in.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#05050c]">

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.12] blur-[80px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #7c3aed, transparent)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-[0.06] blur-[60px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />

      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-[380px] relative z-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 font-black text-xl text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4338ca)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
            418
          </div>
          <h1 className="text-[22px] font-black text-white tracking-tight">FRC Scout Pro</h1>
          <p className="text-slate-500 text-[13px] mt-0.5 font-medium">Team 418 · Purple Haze</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 space-y-5"
          style={{ boxShadow: '0 0 0 1px rgba(124,58,237,0.1), 0 20px 60px rgba(0,0,0,0.5)' }}>

          <div>
            <h2 className="text-white font-bold text-[15px]">Create account</h2>
            <p className="text-slate-500 text-[12px] mt-0.5">Join the Purple Haze scouting team</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <Input
                  placeholder="Scout Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="pl-9 h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-purple-500/50 text-[13px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">
                FRC Team Number <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <Input
                  type="number"
                  placeholder="e.g. 418"
                  value={frcTeamNumber}
                  onChange={(e) => setFrcTeamNumber(e.target.value)}
                  required
                  min={1}
                  max={99999}
                  className="pl-9 h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-purple-500/50 text-[13px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <Input
                  type="email"
                  placeholder="scout@team418.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-purple-500/50 text-[13px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-purple-500/50 text-[13px]"
                />
              </div>
            </div>

            {/* Team role selector */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">
                Your Role on the Team <span className="text-purple-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTeamRole(opt.value)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                      teamRole === opt.value
                        ? 'border-purple-500/60 bg-purple-500/10 text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:text-white'
                    )}
                  >
                    <span className="text-lg leading-none">{opt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold leading-none">{opt.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                    {teamRole === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-11 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all',
                loading
                  ? 'bg-purple-600/50 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]'
              )}
            >
              {loading ? 'Creating…' : (<>Create account <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="text-center text-[12px] text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-6">FRC Scout Pro · Season {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
