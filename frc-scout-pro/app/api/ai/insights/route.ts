import { NextRequest, NextResponse } from 'next/server'

interface ScoutingEntry {
  auto_scored?: number
  auto_missed?: number
  teleop_scored?: number
  teleop_cycles?: number
  teleop_defense?: boolean
  climb_succeeded?: boolean
  climb_level?: string
  breakdown?: boolean
  driver_rating?: number
  notes?: string
}

function generateInsights(matchData: Record<string, unknown>, scoutingNotes: ScoutingEntry[]): string[] {
  const insights: string[] = []
  if (!scoutingNotes || scoutingNotes.length === 0) return ['No scouting data available yet for this team.']

  const n = scoutingNotes.length
  const autoAvg = scoutingNotes.reduce((s, e) => s + (e.auto_scored ?? 0), 0) / n
  const teleopAvg = scoutingNotes.reduce((s, e) => s + (e.teleop_scored ?? 0), 0) / n
  const climbRate = scoutingNotes.filter((e) => e.climb_succeeded).length / n
  const defenseCount = scoutingNotes.filter((e) => e.teleop_defense).length
  const breakdownRate = scoutingNotes.filter((e) => e.breakdown).length / n
  const cycleAvg = scoutingNotes.reduce((s, e) => s + (e.teleop_cycles ?? 0), 0) / n

  if (autoAvg >= 2) insights.push(`Consistent auto scorer — averaging ${autoAvg.toFixed(1)} pieces. Prioritize front-line auto start.`)
  else if (autoAvg < 0.5) insights.push(`Weak auto performance. Plan alliance autos to compensate for this robot.`)

  if (climbRate >= 0.8) insights.push(`Reliable climber (${(climbRate * 100).toFixed(0)}% success rate). Bank on endgame points.`)
  else if (climbRate > 0 && climbRate < 0.5) insights.push(`Inconsistent climber — ${(climbRate * 100).toFixed(0)}% success. Confirm climb plan before alliance selection.`)
  else if (climbRate === 0) insights.push(`Has not successfully climbed. Do not rely on endgame contribution.`)

  if (cycleAvg >= 4) insights.push(`High-output teleop: ${cycleAvg.toFixed(1)} cycles/match. Pair with a feeder-role robot.`)
  else if (cycleAvg <= 1) insights.push(`Low cycle rate. Better suited for defense or a support role this match.`)

  if (defenseCount >= Math.ceil(n * 0.5)) insights.push(`Frequently runs defense (${defenseCount}/${n} matches). Expect disruption if opposing alliance.`)

  if (breakdownRate >= 0.25) insights.push(`High breakdown risk (${(breakdownRate * 100).toFixed(0)}% of matches). Have contingency alliance plan ready.`)

  if (teleopAvg >= 8) insights.push(`Elite teleop scorer — ${teleopAvg.toFixed(1)} pts avg. Top alliance pick priority.`)

  const recentNotes = scoutingNotes.slice(-2).map((e) => e.notes).filter(Boolean)
  if (recentNotes.length > 0) insights.push(`Recent scout note: "${recentNotes[recentNotes.length - 1]}"`)

  return insights.slice(0, 5)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { matchData, scoutingNotes } = body
  const insights = generateInsights(matchData ?? {}, scoutingNotes ?? [])
  return NextResponse.json({ insights })
}
