import { describe, it, expect } from 'vitest'
import { ScoutingEntrySchema, PitScoutingSchema } from '@/types/scouting.types'

const baseEntry = {
  offline_id: 'test-offline-123',
  event_id: '2025arc',
  match_id: '2025arc_qm1',
  team_number: 418,
  alliance: 'red' as const,
  scout_id: 'user-abc',
}

describe('ScoutingEntrySchema', () => {
  it('accepts a minimal valid entry with defaults', () => {
    const result = ScoutingEntrySchema.safeParse(baseEntry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.auto_pieces_scored).toBe(0)
      expect(result.data.breakdown).toBe(false)
      expect(result.data.tags).toEqual([])
      expect(result.data.climb_level).toBe(0)
    }
  })

  it('rejects a team number of 0', () => {
    const result = ScoutingEntrySchema.safeParse({ ...baseEntry, team_number: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid alliance value', () => {
    const result = ScoutingEntrySchema.safeParse({ ...baseEntry, alliance: 'green' })
    expect(result.success).toBe(false)
  })

  it('rejects a climb_level out of range', () => {
    const result = ScoutingEntrySchema.safeParse({ ...baseEntry, climb_level: 4 })
    expect(result.success).toBe(false)
  })

  it('rejects a negative auto_pieces_scored', () => {
    const result = ScoutingEntrySchema.safeParse({ ...baseEntry, auto_pieces_scored: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts full entry with all optional fields', () => {
    const full = {
      ...baseEntry,
      auto_mobility: true,
      auto_pieces_scored: 3,
      auto_misses: 1,
      teleop_pieces_scored: 8,
      cycle_count: 6,
      intake_speed: 4,
      climb_level: 3,
      breakdown: false,
      disconnect: false,
      brownout: false,
      penalty_count: 0,
      tags: ['fast-cycles', 'great-auto'],
      recommended_pick: true,
      notes: 'Excellent auto routine',
    }
    const result = ScoutingEntrySchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('rejects intake_speed outside 1–5', () => {
    const result = ScoutingEntrySchema.safeParse({ ...baseEntry, intake_speed: 6 })
    expect(result.success).toBe(false)
  })

  it('rejects missing event_id', () => {
    const { event_id, ...noEvent } = baseEntry
    const result = ScoutingEntrySchema.safeParse(noEvent)
    expect(result.success).toBe(false)
  })
})

describe('PitScoutingSchema', () => {
  const basePit = {
    event_id: '2025arc',
    team_number: 254,
    scout_id: 'user-xyz',
  }

  it('accepts minimal pit scouting entry', () => {
    const result = PitScoutingSchema.safeParse(basePit)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.spare_parts).toBe(false)
      expect(result.data.auto_routines).toEqual([])
    }
  })

  it('rejects team_number > 99999', () => {
    const result = PitScoutingSchema.safeParse({ ...basePit, team_number: 100000 })
    expect(result.success).toBe(false)
  })

  it('accepts weight and dimensions', () => {
    const result = PitScoutingSchema.safeParse({
      ...basePit,
      weight_lbs: 120,
      width_in: 28,
      length_in: 32,
      drivetrain: 'swerve',
      programming_language: 'Java',
    })
    expect(result.success).toBe(true)
  })
})
