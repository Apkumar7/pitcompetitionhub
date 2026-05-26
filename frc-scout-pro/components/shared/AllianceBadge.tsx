import { cn } from '@/lib/utils'
import type { Alliance } from '@/types/database.types'

interface AllianceBadgeProps {
  alliance: Alliance
  className?: string
}

export function AllianceBadge({ alliance, className }: AllianceBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border',
      alliance === 'red'
        ? 'bg-red-500/20 text-red-300 border-red-500/30'
        : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      className
    )}>
      {alliance}
    </span>
  )
}
