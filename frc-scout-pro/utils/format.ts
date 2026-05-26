import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { CompLevel } from '@/types/database.types'

export function formatMatchKey(matchId: string): string {
  const parts = matchId.split('_')
  if (parts.length < 2) return matchId
  const level = parts[1]
  if (level.startsWith('qm')) return `Q${level.slice(2)}`
  if (level.startsWith('qf')) return `QF${level.slice(2)}`
  if (level.startsWith('sf')) return `SF${level.slice(2)}`
  if (level.startsWith('f')) return `F${level.slice(1)}`
  return level.toUpperCase()
}

export function formatCompLevel(level: string): string {
  const map: Record<string, string> = {
    qm: 'Quals',
    ef: 'Elim',
    qf: 'Quarterfinals',
    sf: 'Semifinals',
    f: 'Finals',
  }
  return map[level] ?? level.toUpperCase()
}

export function formatMatchLabel(compLevel: string, matchNumber: number, setNumber = 1): string {
  if (compLevel === 'qm') return `Q${matchNumber}`
  if (compLevel === 'f') return `F${setNumber}M${matchNumber}`
  return `${formatCompLevel(compLevel)} ${setNumber}M${matchNumber}`
}

export function formatTime(ts: string | null): string {
  if (!ts) return 'TBD'
  try {
    return format(parseISO(ts), 'h:mm a')
  } catch {
    return 'TBD'
  }
}

export function formatDate(ts: string | null): string {
  if (!ts) return '—'
  try {
    return format(parseISO(ts), 'MMM d')
  } catch {
    return '—'
  }
}

export function timeAgo(ts: string): string {
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true })
  } catch {
    return ts
  }
}

export function formatEPA(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toFixed(1)
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

export function teamKey(teamNumber: number): string {
  return `frc${teamNumber}`
}

export function teamNumberFromKey(key: string): number {
  return parseInt(key.replace('frc', ''), 10)
}
