'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#05050c]">

      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.12] blur-[80px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #7c3aed, transparent)' }} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-[0.07] blur-[60px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-[0.05] blur-[50px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-[380px] relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 font-black text-xl text-white relative"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4338ca)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
            418
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#05050c]" />
          </div>
          <h1 className="text-[22px] font-black text-white tracking-tight">FRC Scout Pro</h1>
          <p className="text-slate-500 text-[13px] mt-0.5 font-medium">Team 418 · Purple Haze</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 space-y-5"
          style={{ boxShadow: '0 0 0 1px rgba(124,58,237,0.1), 0 20px 60px rgba(0,0,0,0.5)' }}>

          <div>
            <h2 className="text-white font-bold text-[15px]">Welcome back</h2>
            <p className="text-slate-500 text-[12px] mt-0.5">Sign in to your scout account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  className="pl-9 h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:ring-purple-500/20 text-[13px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9 h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:ring-purple-500/20 text-[13px]"
                />
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
              {loading ? 'Signing in…' : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-[12px] text-slate-600">
            No account?{' '}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-6">
          FRC Scout Pro · Season {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
