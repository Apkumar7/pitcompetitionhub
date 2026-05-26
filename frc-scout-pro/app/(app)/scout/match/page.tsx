import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { MatchScoutForm } from '@/components/scout/MatchScoutForm'

export const metadata = { title: 'Match Scouting | FRC Scout Pro' }

export default function MatchScoutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">Match Scouting</h1>
        <p className="text-slate-400 text-sm">Data saves automatically offline</p>
      </div>
      <Suspense fallback={<Skeleton className="h-screen bg-slate-800" />}>
        <MatchScoutForm />
      </Suspense>
    </div>
  )
}
