import { cn } from '@/lib/utils'
import { EPABadge } from './EPABadge'
import { formatMatchLabel, formatTime } from '@/utils/format'
import type { Match } from '@/types/database.types'

interface MatchCardProps {
  match: Match
  teamEPAs?: Record<number, number>
  ourTeam?: number
  className?: string
  onClick?: () => void
}

export function MatchCard({ match, teamEPAs, ourTeam, className, onClick }: MatchCardProps) {
  const label = formatMatchLabel(match.comp_level, match.match_number, match.set_number)
  const time = formatTime(match.scheduled_time ?? match.actual_time)
  const isPlayed = match.red_score != null

  const ourAlliance = ourTeam
    ? match.red_teams.includes(ourTeam) ? 'red'
    : match.blue_teams.includes(ourTeam) ? 'blue'
    : null
    : null

  return (
    <div
      className={cn(
        'rounded-lg border bg-slate-900 border-slate-800 p-3 transition-colors',
        onClick && 'cursor-pointer hover:border-slate-600',
        ourAlliance === 'red' && 'border-l-2 border-l-red-500',
        ourAlliance === 'blue' && 'border-l-2 border-l-blue-500',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-semibold text-sm">{label}</span>
        <span className="text-slate-400 text-xs">{time}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Red alliance */}
        <div className={cn(
          'rounded p-2 space-y-1',
          isPlayed && match.winner === 'red' ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-500/10'
        )}>
          <p className="text-red-400 text-[10px] font-bold uppercase tracking-wide">Red</p>
          {match.red_teams.map((t) => (
            <div key={t} className="flex items-center justify-between">
              <span className={cn(
                'text-xs font-medium',
                ourTeam === t ? 'text-white font-bold' : 'text-slate-300'
              )}>
                {t}
              </span>
              {teamEPAs && <EPABadge value={teamEPAs[t]} />}
            </div>
          ))}
          {isPlayed && (
            <p className="text-red-300 font-bold text-sm tabular-nums">{match.red_score}</p>
          )}
        </div>

        {/* Blue alliance */}
        <div className={cn(
          'rounded p-2 space-y-1',
          isPlayed && match.winner === 'blue' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-500/10'
        )}>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wide">Blue</p>
          {match.blue_teams.map((t) => (
            <div key={t} className="flex items-center justify-between">
              <span className={cn(
                'text-xs font-medium',
                ourTeam === t ? 'text-white font-bold' : 'text-slate-300'
              )}>
                {t}
              </span>
              {teamEPAs && <EPABadge value={teamEPAs[t]} />}
            </div>
          ))}
          {isPlayed && (
            <p className="text-blue-300 font-bold text-sm tabular-nums">{match.blue_score}</p>
          )}
        </div>
      </div>

      {match.red_win_prob != null && !isPlayed && (
        <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-blue-500"
            style={{
              background: `linear-gradient(to right, #ef4444 ${(match.red_win_prob * 100).toFixed(0)}%, #3b82f6 ${(match.red_win_prob * 100).toFixed(0)}%)`
            }}
          />
        </div>
      )}
    </div>
  )
}
