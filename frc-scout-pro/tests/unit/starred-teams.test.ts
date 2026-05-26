import { describe, it, expect } from 'vitest'

// Tests for the starred teams data logic (pure functions, no React/Supabase).
// The hook-level optimistic update behavior is tested separately in integration.

function isStarred(starredTeams: number[], teamNumber: number): boolean {
  return starredTeams.includes(teamNumber)
}

function applyOptimisticStar(current: number[], teamNumber: number, wasStarred: boolean): number[] {
  if (wasStarred) {
    return current.filter((t) => t !== teamNumber)
  }
  return [...current, teamNumber]
}

function sortWithStarred(
  teams: { team_number: number; epa_mean: number | null }[],
  starredTeams: number[]
): typeof teams {
  return [...teams].sort((a, b) => {
    const aStarred = starredTeams.includes(a.team_number) ? 1 : 0
    const bStarred = starredTeams.includes(b.team_number) ? 1 : 0
    if (aStarred !== bStarred) return bStarred - aStarred
    return (b.epa_mean ?? 0) - (a.epa_mean ?? 0)
  })
}

const teams = [
  { team_number: 254, epa_mean: 60 },
  { team_number: 418, epa_mean: 30 },
  { team_number: 1678, epa_mean: 55 },
  { team_number: 1114, epa_mean: 45 },
]

describe('isStarred', () => {
  it('returns true when team is in starred list', () => {
    expect(isStarred([254, 418], 418)).toBe(true)
  })

  it('returns false when team is not starred', () => {
    expect(isStarred([254, 418], 1678)).toBe(false)
  })

  it('returns false for empty list', () => {
    expect(isStarred([], 418)).toBe(false)
  })
})

describe('applyOptimisticStar', () => {
  it('adds a team when not previously starred', () => {
    const result = applyOptimisticStar([254], 418, false)
    expect(result).toContain(418)
    expect(result).toContain(254)
  })

  it('removes a team when previously starred', () => {
    const result = applyOptimisticStar([254, 418], 418, true)
    expect(result).not.toContain(418)
    expect(result).toContain(254)
  })

  it('handles starring when list is empty', () => {
    const result = applyOptimisticStar([], 418, false)
    expect(result).toEqual([418])
  })

  it('handles unstarring when only item in list', () => {
    const result = applyOptimisticStar([418], 418, true)
    expect(result).toEqual([])
  })

  it('does not mutate the original array', () => {
    const original = [254, 1678]
    applyOptimisticStar(original, 418, false)
    expect(original).toHaveLength(2)
  })
})

describe('sortWithStarred', () => {
  it('pins starred teams above non-starred', () => {
    const sorted = sortWithStarred(teams, [418])
    expect(sorted[0].team_number).toBe(418)
  })

  it('sorts non-starred teams by EPA descending', () => {
    const sorted = sortWithStarred(teams, [])
    expect(sorted[0].team_number).toBe(254) // highest EPA
    expect(sorted[1].team_number).toBe(1678)
    expect(sorted[2].team_number).toBe(1114)
    expect(sorted[3].team_number).toBe(418)
  })

  it('sorts multiple starred teams by EPA among themselves', () => {
    const sorted = sortWithStarred(teams, [418, 1678])
    // Both starred — 1678 (EPA 55) should come before 418 (EPA 30)
    const starredIdx = sorted.filter(t => [418, 1678].includes(t.team_number)).map(t => t.team_number)
    expect(starredIdx[0]).toBe(1678)
    expect(starredIdx[1]).toBe(418)
  })

  it('does not mutate the original array', () => {
    const original = [...teams]
    sortWithStarred(teams, [254])
    expect(teams[0].team_number).toBe(original[0].team_number)
  })
})
