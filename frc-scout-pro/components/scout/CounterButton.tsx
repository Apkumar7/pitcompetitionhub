'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CounterButtonProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
  className?: string
}

export function CounterButton({ value, onChange, min = 0, max = 99, label, className }: CounterButtonProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-slate-400 text-xs font-medium">{label}</span>}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-14 w-14 rounded-l-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <Minus className="h-5 w-5 text-white" />
        </button>
        <div className="h-14 flex-1 min-w-[3rem] bg-slate-800 border-y border-slate-700 flex items-center justify-center">
          <span className="text-white font-bold text-xl tabular-nums">{value}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-14 w-14 rounded-r-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <Plus className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  )
}
