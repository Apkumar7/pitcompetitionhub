import { cn } from '@/lib/utils'

interface TeamAvatarProps {
  teamNumber: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-amber-600', 'bg-red-600', 'bg-pink-600', 'bg-indigo-600',
]

function getColor(teamNumber: number): string {
  return COLORS[teamNumber % COLORS.length]
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function TeamAvatar({ teamNumber, size = 'md', className }: TeamAvatarProps) {
  return (
    <div className={cn(
      'rounded-lg flex items-center justify-center font-bold text-white shrink-0',
      getColor(teamNumber),
      SIZE_MAP[size],
      className
    )}>
      {teamNumber}
    </div>
  )
}
