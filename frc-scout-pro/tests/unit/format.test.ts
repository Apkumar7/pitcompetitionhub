import { describe, it, expect } from 'vitest'
import {
  formatMatchKey,
  formatCompLevel,
  formatMatchLabel,
  formatEPA,
  formatPercent,
  teamKey,
  teamNumberFromKey,
  formatTime,
  formatDate,
} from '@/utils/format'

describe('formatMatchKey', () => {
  it('parses qual match key', () => {
    expect(formatMatchKey('2025arc_qm5')).toBe('Q5')
  })

  it('parses quarterfinal key', () => {
    expect(formatMatchKey('2025arc_qf1m2')).toBe('QF1m2')
  })

  it('parses final key', () => {
    expect(formatMatchKey('2025arc_f1m1')).toBe('F1m1')
  })

  it('returns raw string when format is unrecognized', () => {
    expect(formatMatchKey('badkey')).toBe('badkey')
  })
})

describe('formatCompLevel', () => {
  it('maps qm to Quals', () => expect(formatCompLevel('qm')).toBe('Quals'))
  it('maps sf to Semifinals', () => expect(formatCompLevel('sf')).toBe('Semifinals'))
  it('maps f to Finals', () => expect(formatCompLevel('f')).toBe('Finals'))
  it('uppercases unknown levels', () => expect(formatCompLevel('xx')).toBe('XX'))
})

describe('formatMatchLabel', () => {
  it('formats qual match', () => expect(formatMatchLabel('qm', 7)).toBe('Q7'))
  it('formats finals with set and match', () => expect(formatMatchLabel('f', 1, 2)).toBe('F2M1'))
  it('formats SF', () => expect(formatMatchLabel('sf', 3, 1)).toBe('Semifinals 1M3'))
})

describe('formatEPA', () => {
  it('formats valid EPA', () => expect(formatEPA(42.567)).toBe('42.6'))
  it('returns dash for null', () => expect(formatEPA(null)).toBe('—'))
  it('returns dash for undefined', () => expect(formatEPA(undefined)).toBe('—'))
  it('formats zero', () => expect(formatEPA(0)).toBe('0.0'))
})

describe('formatPercent', () => {
  it('formats 0.85 as 85%', () => expect(formatPercent(0.85)).toBe('85%'))
  it('formats 1.0 as 100%', () => expect(formatPercent(1)).toBe('100%'))
  it('returns dash for null', () => expect(formatPercent(null)).toBe('—'))
})

describe('teamKey / teamNumberFromKey', () => {
  it('converts team number to key', () => expect(teamKey(418)).toBe('frc418'))
  it('round-trips through both functions', () => {
    const key = teamKey(254)
    expect(teamNumberFromKey(key)).toBe(254)
  })
})

describe('formatTime', () => {
  it('returns TBD for null', () => expect(formatTime(null)).toBe('TBD'))
  it('returns TBD for invalid ISO', () => expect(formatTime('not-a-date')).toBe('TBD'))
})

describe('formatDate', () => {
  it('returns dash for null', () => expect(formatDate(null)).toBe('—'))
  it('formats a valid ISO date', () => {
    // Use midday local to avoid UTC-offset shifting the date across midnight
    const result = formatDate('2025-04-15T12:00:00')
    expect(result).toMatch(/Apr/)
  })
})
