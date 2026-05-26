import { Suspense } from 'react'
import { UpcomingMatchCard } from '@/components/dashboard/UpcomingMatchCard'
import { RankingWidget } from '@/components/dashboard/RankingWidget'
import { EPATrendWidget } from '@/components/dashboard/EPATrendWidget'
import { MatchCountdown } from '@/components/dashboard/MatchCountdown'
import { ScoutingProgressWidget } from '@/components/dashboard/ScoutingProgressWidget'
import { EventLeaderboard } from '@/components/dashboard/EventLeaderboard'
import { TeamAlertsWidget } from '@/components/dashboard/TeamAlertsWidget'

export const metadata = { title: 'Dashboard — FRC Scout Pro' }

function StatSkeleton() {
  return <div className="h-[88px] rounded-xl shimmer" />
}

function CardSkeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-xl shimmer ${className}`} />
}

export default function DashboardPage() {
  return (
    <div className="min-h-full">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden border-b border-white/[0.05] px-6 py-7">
        {/* Ambient glow */}
        <div
          className="absolute -top-24 -left-12 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a65] mb-1.5">
              Team 418 · Purple Haze
            </p>
            <h1 className="text-[26px] font-black tracking-tight gradient-text leading-none">
              Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              Live · {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-5 lg:p-7 max-w-[1400px] space-y-5">

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Suspense fallback={<StatSkeleton />}><MatchCountdown /></Suspense>
          <Suspense fallback={<StatSkeleton />}><RankingWidget /></Suspense>
          <Suspense fallback={<StatSkeleton />}><ScoutingProgressWidget /></Suspense>
          <Suspense fallback={<StatSkeleton />}><TeamAlertsWidget /></Suspense>
        </div>

        {/* Main row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <Suspense fallback={<CardSkeleton className="h-72" />}>
              <UpcomingMatchCard />
            </Suspense>
          </div>
          <Suspense fallback={<CardSkeleton className="h-72" />}>
            <EventLeaderboard />
          </Suspense>
        </div>

        {/* EPA chart */}
        <Suspense fallback={<CardSkeleton className="h-56" />}>
          <EPATrendWidget />
        </Suspense>
      </div>
    </div>
  )
}
