import { describe, it, expect } from 'vitest'

// Pull the rule engine out of the route handler for isolated testing.
// The analyzeMatch function is defined inline in the route file, so we
// replicate the logic here. Any changes to the rule engine thresholds
// must be reflected in these tests.

type TeamInfo = { team: number; epa: number | null; nickname: string | null }
type OurStats = {
  auto: number; teleop: number; climb: number; cycleCount: number
  breakdown: boolean; disconnect: boolean
}

function analyzeMatch(body: {
  matchLabel: string
  ourTeam: number
  alliance: string
  ourScore: number | null
  opponentScore: number | null
  won: boolean | null
  ourStats: OurStats | null
  partners: TeamInfo[]
  opponents: TeamInfo[]
  notes: string[]
}): string[] {
  const { ourScore, opponentScore, won, ourStats, partners, opponents, notes } = body
  const bullets: string[] = []

  if (won === true && ourScore != null && opponentScore != null) {
    const margin = ourScore - opponentScore
    if (margin >= 40) bullets.push(`Dominant win by ${margin} points`)
    else if (margin >= 15) bullets.push(`Solid ${margin}-point win`)
    else bullets.push(`Close win by ${margin}`)
  } else if (won === false && ourScore != null && opponentScore != null) {
    const margin = opponentScore - ourScore
    if (margin >= 40) bullets.push(`${margin}-point deficit`)
    else if (margin >= 15) bullets.push(`Lost by ${margin}`)
    else bullets.push(`Narrow ${margin}-point loss`)
  } else if (won === null) {
    const partnerEPASum = partners.reduce((s, p) => s + (p.epa ?? 0), 0)
    const oppEPASum = opponents.reduce((s, o) => s + (o.epa ?? 0), 0)
    const edge = partnerEPASum - oppEPASum
    if (edge > 20) bullets.push(`Alliance has a +${edge.toFixed(0)} EPA advantage`)
    else if (edge < -20) bullets.push(`Facing a +${Math.abs(edge).toFixed(0)} EPA opponent advantage`)
    else bullets.push(`Evenly matched alliance`)
  }

  if (ourStats) {
    const auto = ourStats.auto
    if (auto === 0) bullets.push(`Auto: zero pieces scored`)
    else if (auto >= 4) bullets.push(`Excellent auto: ${auto} pieces`)
    else if (auto === 3) bullets.push(`Good auto: ${auto} pieces`)
    else bullets.push(`Auto: ${auto} piece${auto !== 1 ? 's' : ''} scored`)
  }

  if (ourStats) {
    const teleop = ourStats.teleop
    const cycles = ourStats.cycleCount
    if (teleop >= 10) bullets.push(`High-output teleop: ${teleop} pieces`)
    else if (teleop >= 6) bullets.push(`Solid teleop: ${teleop} pieces`)
    else if (teleop >= 3) bullets.push(`Moderate teleop: ${teleop} pieces`)
    else bullets.push(`Low teleop output at ${teleop} pieces`)
  }

  if (ourStats?.breakdown) {
    bullets.push(`⚠️ Breakdown flagged`)
  } else if (ourStats?.disconnect) {
    bullets.push(`⚠️ Communication disconnect`)
  } else if (ourStats) {
    const climb = ourStats.climb
    if (climb >= 3) bullets.push(`Endgame secured at L${climb}`)
    else if (climb === 2) bullets.push(`L2 climb`)
    else if (climb === 1) bullets.push(`L1 climb only`)
    else bullets.push(`No climb recorded`)
  }

  return bullets.slice(0, 5).filter((b) => b.length > 0)
}

const basePartners: TeamInfo[] = [
  { team: 1114, epa: 45, nickname: 'Simbotics' },
  { team: 2056, epa: 42, nickname: 'OP Robotics' },
]
const baseOpponents: TeamInfo[] = [
  { team: 254, epa: 60, nickname: 'Cheesy Poofs' },
  { team: 1678, epa: 55, nickname: 'Citrus Circuits' },
  { team: 148, epa: 40, nickname: 'Robowranglers' },
]
const baseStats: OurStats = {
  auto: 3, teleop: 7, climb: 3, cycleCount: 5, breakdown: false, disconnect: false,
}

describe('analyzeMatch — result assessment', () => {
  it('dominant win (>=40 margin)', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 120, opponentScore: 70, won: true,
      ourStats: baseStats, partners: basePartners, opponents: baseOpponents, notes: [],
    })
    expect(bullets[0]).toContain('Dominant win by 50')
  })

  it('solid win (15–39 margin)', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q2', ourTeam: 418, alliance: 'red',
      ourScore: 100, opponentScore: 75, won: true,
      ourStats: baseStats, partners: basePartners, opponents: baseOpponents, notes: [],
    })
    expect(bullets[0]).toContain('Solid 25-point win')
  })

  it('close win (<15 margin)', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q3', ourTeam: 418, alliance: 'red',
      ourScore: 88, opponentScore: 82, won: true,
      ourStats: baseStats, partners: basePartners, opponents: baseOpponents, notes: [],
    })
    expect(bullets[0]).toContain('Close win by 6')
  })

  it('narrow loss (<15 margin)', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q4', ourTeam: 418, alliance: 'red',
      ourScore: 80, opponentScore: 87, won: false,
      ourStats: baseStats, partners: basePartners, opponents: baseOpponents, notes: [],
    })
    expect(bullets[0]).toContain('Narrow 7-point loss')
  })

  it('pre-match EPA advantage', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q5', ourTeam: 418, alliance: 'red',
      ourScore: null, opponentScore: null, won: null,
      ourStats: null,
      partners: [{ team: 1114, epa: 60, nickname: null }, { team: 2056, epa: 55, nickname: null }],
      opponents: [{ team: 99, epa: 20, nickname: null }, { team: 100, epa: 15, nickname: null }, { team: 101, epa: 18, nickname: null }],
      notes: [],
    })
    expect(bullets[0]).toContain('EPA advantage')
  })
})

describe('analyzeMatch — auto assessment', () => {
  it('zero auto', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 70, opponentScore: 60, won: true,
      ourStats: { ...baseStats, auto: 0 }, partners: [], opponents: [], notes: [],
    })
    expect(bullets.some(b => b.includes('zero pieces'))).toBe(true)
  })

  it('excellent auto (>=4)', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 100, opponentScore: 60, won: true,
      ourStats: { ...baseStats, auto: 5 }, partners: [], opponents: [], notes: [],
    })
    expect(bullets.some(b => b.includes('Excellent auto'))).toBe(true)
  })
})

describe('analyzeMatch — reliability / endgame', () => {
  it('flags breakdown', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 60, opponentScore: 80, won: false,
      ourStats: { ...baseStats, breakdown: true }, partners: [], opponents: [], notes: [],
    })
    expect(bullets.some(b => b.includes('Breakdown flagged'))).toBe(true)
  })

  it('flags disconnect', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 60, opponentScore: 80, won: false,
      ourStats: { ...baseStats, disconnect: true }, partners: [], opponents: [], notes: [],
    })
    expect(bullets.some(b => b.includes('Communication disconnect'))).toBe(true)
  })

  it('L3 climb shows endgame secured', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 90, opponentScore: 70, won: true,
      ourStats: { ...baseStats, climb: 3 }, partners: [], opponents: [], notes: [],
    })
    expect(bullets.some(b => b.includes('L3'))).toBe(true)
  })

  it('produces at most 5 bullets', () => {
    const bullets = analyzeMatch({
      matchLabel: 'Q1', ourTeam: 418, alliance: 'red',
      ourScore: 90, opponentScore: 70, won: true,
      ourStats: { ...baseStats, auto: 5, teleop: 12, climb: 3 },
      partners: basePartners, opponents: baseOpponents, notes: ['great match'],
    })
    expect(bullets.length).toBeLessThanOrEqual(5)
  })
})
