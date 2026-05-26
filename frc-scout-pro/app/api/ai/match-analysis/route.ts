// ─── Match Analysis Route ──────────────────────────────────────────────────
// POST /api/ai/match-analysis
//
// Generates post-match strategic insights using a local rule engine —
// no API key required, works offline, instant response.
//
// The engine analyzes real match numbers (margins, EPA differentials, cycle
// rates, climb success, breakdown flags) and produces 4–5 FRC-specific
// drive-coach bullets that read like expert analysis.
//
// Input body: { matchLabel, ourTeam, alliance, ourScore, opponentScore,
//               won, ourStats, partners, opponents, notes }
// ──────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'

interface TeamInfo {
  team: number
  epa: number | null
  nickname: string | null
}

interface OurStats {
  auto: number
  teleop: number
  climb: number
  cycleCount: number
  breakdown: boolean
  disconnect: boolean
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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
  const { matchLabel, ourTeam, alliance, ourScore, opponentScore, won, ourStats, partners, opponents, notes } = body
  const bullets: string[] = []

  // ── 1. Result assessment ─────────────────────────────────────────────────
  if (won === true && ourScore != null && opponentScore != null) {
    const margin = ourScore - opponentScore
    if (margin >= 40) {
      bullets.push(`Dominant win by ${margin} points — alliance clicked on all phases. Carry this momentum.`)
    } else if (margin >= 15) {
      bullets.push(`Solid ${margin}-point win — consistent execution throughout. Minor polish will make this a great alliance pick.`)
    } else {
      bullets.push(`Close win by ${margin} — every point was critical. That focus is exactly what alliance selection scouts.`)
    }
  } else if (won === false && ourScore != null && opponentScore != null) {
    const margin = opponentScore - ourScore
    if (margin >= 40) {
      bullets.push(`${margin}-point deficit — opponents had a significant EPA edge. Focus on execution, not outcome.`)
    } else if (margin >= 15) {
      bullets.push(`Lost by ${margin} — a stronger auto or clean endgame would close this gap. Addressable before next match.`)
    } else {
      bullets.push(`Narrow ${margin}-point loss — this was the definition of a winnable match. Identify the one phase that stalled.`)
    }
  } else if (won === null) {
    const partnerEPASum = partners.reduce((s, p) => s + (p.epa ?? 0), 0)
    const oppEPASum = opponents.reduce((s, o) => s + (o.epa ?? 0), 0)
    const edge = partnerEPASum - oppEPASum
    if (edge > 20) {
      bullets.push(`Alliance has a +${edge.toFixed(0)} EPA advantage — strong win probability. Execute cleanly and let the numbers work.`)
    } else if (edge < -20) {
      bullets.push(`Facing a +${Math.abs(edge).toFixed(0)} EPA opponent advantage — you'll need a clean auto and reliable endgame to compete.`)
    } else {
      bullets.push(`Evenly matched alliance — this match is decided by execution, not EPA. Minimize mistakes.`)
    }
  }

  // ── 2. Auto assessment ───────────────────────────────────────────────────
  if (ourStats) {
    const auto = ourStats.auto
    if (auto === 0) {
      bullets.push(`Auto: zero pieces scored — if this was a miss, fixing the routine is the highest-value improvement available.`)
    } else if (auto >= 4) {
      bullets.push(`Excellent auto: ${auto} pieces — top-tier auto output. Protect this routine; don't change what's working.`)
    } else if (auto === 3) {
      bullets.push(`Good auto: ${auto} pieces scored. Explore whether a 4th piece is repeatable without risking the 3.`)
    } else {
      bullets.push(`Auto: ${auto} piece${auto !== 1 ? 's' : ''} scored — there's room to grow here. Review path reliability in pit.`)
    }
  }

  // ── 3. Teleop / cycle assessment ─────────────────────────────────────────
  if (ourStats) {
    const teleop = ourStats.teleop
    const cycles = ourStats.cycleCount

    if (teleop >= 10) {
      bullets.push(`High-output teleop: ${teleop} pieces in ${cycles > 0 ? `${cycles} cycles` : 'the period'} — elite cycle rate. Maintain intake consistency.`)
    } else if (teleop >= 6) {
      const cycleNote = cycles > 0 ? ` (${cycles} cycles)` : ''
      bullets.push(`Solid teleop: ${teleop} pieces${cycleNote}. Consistent, repeatable output — exactly what alliance partners need.`)
    } else if (teleop >= 3) {
      bullets.push(`Moderate teleop: ${teleop} pieces. Identify whether cycle time, intake reliability, or traffic is the bottleneck.`)
    } else {
      bullets.push(`Low teleop output at ${teleop} pieces — prioritize diagnosing the root cause before next match.`)
    }
  }

  // ── 4. Reliability / endgame ─────────────────────────────────────────────
  if (ourStats?.breakdown) {
    bullets.push(`⚠️ Breakdown flagged — pit crew needs to inspect and confirm root cause before next queue call. Don't skip this.`)
  } else if (ourStats?.disconnect) {
    bullets.push(`⚠️ Communication disconnect — check radio, ethernet, and breaker connections immediately. Radio reboots cost matches.`)
  } else if (ourStats) {
    const climb = ourStats.climb
    if (climb >= 3) {
      bullets.push(`Endgame secured at L${climb} — reliable climb points protect match outcomes. Keep the timing tight.`)
    } else if (climb === 2) {
      bullets.push(`L2 climb — solid points. Assess whether L3 is achievable with consistent attempt timing.`)
    } else if (climb === 1) {
      bullets.push(`L1 climb only — low-hanging points left on the table. Review climb sequence; higher level is worth pursuing.`)
    } else {
      bullets.push(`No climb recorded — verify whether time ran out or there was a mechanical issue. Endgame points are critical.`)
    }
  }

  // ── 5. Alliance context / strategic note ─────────────────────────────────
  const partnerEPAs = partners.filter((p) => p.epa != null).map((p) => p.epa as number)
  const opponentEPAs = opponents.filter((o) => o.epa != null).map((o) => o.epa as number)
  const avgPartnerEPA = partnerEPAs.length ? partnerEPAs.reduce((a, b) => a + b, 0) / partnerEPAs.length : null
  const totalOppEPA = opponentEPAs.reduce((a, b) => a + b, 0)
  const strongestOpp = opponents.reduce<TeamInfo | null>((best, o) => (o.epa ?? 0) > (best?.epa ?? 0) ? o : best, null)
  const weakestPartner = partners.reduce<TeamInfo | null>((low, p) => (p.epa ?? 99) < (low?.epa ?? 99) ? p : low, null)

  if (ourStats?.breakdown || ourStats?.disconnect) {
    // Already flagged an issue — add a morale/process note instead
    bullets.push(`Despite the ${ourStats.breakdown ? 'breakdown' : 'disconnect'}, gather data from this match — the scouting entries will flag patterns for future opponents.`)
  } else if (won === false && strongestOpp && (strongestOpp.epa ?? 0) > 45) {
    bullets.push(`Team ${strongestOpp.team} (EPA ${strongestOpp.epa?.toFixed(1)}) drove your loss — flag them for alliance selection targeting.`)
  } else if (won === true && weakestPartner && avgPartnerEPA !== null && avgPartnerEPA < 20) {
    bullets.push(`Won despite a low-EPA partner — that speaks to our robot's carry capacity. Strong signal for alliance selection.`)
  } else if (won === true && totalOppEPA > 90) {
    bullets.push(`Beat a combined EPA ${totalOppEPA.toFixed(0)} opponent alliance — scouts watching alliance selection will notice this.`)
  } else if (won === false && totalOppEPA < 70 && ourScore != null) {
    bullets.push(`Lost to a lower-EPA alliance (${totalOppEPA.toFixed(0)} combined) — a fixable result. This must not happen again.`)
  } else if (notes.length > 0) {
    bullets.push(`Scout note: "${notes[0].slice(0, 100)}" — review this with the drive coach before next match.`)
  } else {
    // Generic strategic filler only if nothing more specific applies
    const fillers = [
      `Alliance performance was within expected range. Focus on refining your weakest phase before playoffs.`,
      `No major surprises this match. Keep scouting opponents — EPA trends shift quickly across qualifications.`,
      `Mechanical health looks good this match. Maintain pit inspection schedule between every match.`,
    ]
    bullets.push(pick(fillers))
  }

  return bullets.slice(0, 5).filter((b) => b.length > 0)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const bullets = analyzeMatch(body)

  return NextResponse.json({
    bullets,
    analysis: bullets.map((b) => `• ${b}`).join('\n'),
    source: 'local-engine',
  })
}
