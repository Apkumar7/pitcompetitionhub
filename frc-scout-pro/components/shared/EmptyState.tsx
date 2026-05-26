import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[260px] gap-3 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-400">{title}</p>
        {description && <p className="text-xs text-slate-600 max-w-xs">{description}</p>}
      </div>
    </div>
  )
}
