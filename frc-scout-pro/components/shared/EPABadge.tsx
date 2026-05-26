import { cn } from '@/lib/utils'

interface EPABadgeProps {
  value: number | null | undefined
  className?: string
}

function getEPAColor(value: number): string {
  if (value >= 60) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  if (value >= 45) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  if (value >= 30) return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
}

export function EPABadge({ value, className }: EPABadgeProps) {
  if (value == null) {
    return (
      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs border bg-slate-700/30 text-slate-500 border-slate-700/30', className)}>
        —
      </span>
    )
  }
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border tabular-nums',
      getEPAColor(value),
      className
    )}>
      {value.toFixed(1)}
    </span>
  )
}
