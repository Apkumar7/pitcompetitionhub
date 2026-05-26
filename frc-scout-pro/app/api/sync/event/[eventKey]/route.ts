// ─── Event Sync Route ──────────────────────────────────────────────────────
// POST /api/sync/event/[eventKey]
//
// Fetches fresh data from two external sources and upserts into Supabase:
//
//   The Blue Alliance (TBA)
//     • event metadata (name, dates, city)
//     • team list + city/state info
//     • match results (scores, alliances, times)
//     • qualification rankings (wins, losses, rank)
//
//   Statbotics
//     • EPA (Expected Points Added) per team — mean and standard deviation
//       Note: EPA lives at epa.total_points.mean / .sd in the v3 response
//     • Match predictions (win probability, predicted scores per alliance)
//       Note: predictions live at pred.red_win_prob / .red_score / .blue_score
//
// Upsert strategy: both sources are merged into the same DB rows so that
// every `event_teams` row has both W/L/rank (from TBA) and EPA (from
// Statbotics). Any team or match missing from Statbotics still syncs from TBA
// (the Statbotics fetches use .catch(() => []) so they're non-fatal).
//
// Auth: uses the Supabase service role key (bypasses RLS) because sync runs
// server-side and must write to tables the client role cannot.
// ──────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const TBA_BASE = 'https://www.thebluealliance.com/api/v3'
const SB_BASE = process.env.STATBOTICS_BASE ?? 'https://api.statbotics.io/v3'

// Helper: fetch from TBA, throw on non-2xx
async function tba<T>(path: string): Promise<T> {
  const res = await fetch(`${TBA_BASE}/${path}`, {
    headers: { 'X-TBA-Auth-Key': process.env.TBA_API_KEY! },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`TBA ${path} → ${res.status}`)
  return res.json()
}

// Helper: fetch from Statbotics, throw on non-2xx
async function sb<T>(path: string): Promise<T> {
  const res = await fetch(`${SB_BASE}/${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Statbotics ${path} → ${res.status}`)
  return res.json()
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  const { eventKey } = await params
  const supabase = createServiceClient()

  try {
    const [tbaEvent, teams, matches, rankingsResp, sbTeams, sbMatches] = await Promise.all([
      tba<Record<string, unknown>>(`event/${eventKey}`),
      tba<Array<Record<string, unknown>>>(`event/${eventKey}/teams`),
      tba<Array<Record<string, unknown>>>(`event/${eventKey}/matches`),
      tba<{ rankings?: Array<Record<string, unknown>> }>(`event/${eventKey}/rankings`).catch(() => ({ rankings: [] })),
      sb<Array<Record<string, unknown>>>(`team_events?event=${eventKey}&limit=100`).catch(() => []),
      sb<Array<Record<string, unknown>>>(`matches?event=${eventKey}&limit=200`).catch(() => []),
    ])

    // Upsert event
    await supabase.from('events').upsert({
      id: eventKey,
      name: tbaEvent.name as string,
      short_name: (tbaEvent.short_name as string | null) ?? null,
      event_type: tbaEvent.event_type as number,
      city: (tbaEvent.city as string | null) ?? null,
      state_prov: (tbaEvent.state_prov as string | null) ?? null,
      country: (tbaEvent.country as string | null) ?? null,
      start_date: (tbaEvent.start_date as string | null) ?? null,
      end_date: (tbaEvent.end_date as string | null) ?? null,
      year: tbaEvent.year as number,
      week: (tbaEvent.week as number | null) ?? null,
      raw_tba: tbaEvent,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Build rankings lookup: teamKey → { wins, losses, ties, rank }
    const rankMap: Record<string, { wins: number; losses: number; ties: number; rank: number }> = {}
    for (const r of rankingsResp.rankings ?? []) {
      const rec = r.record as { wins: number; losses: number; ties: number } | null
      rankMap[r.team_key as string] = {
        wins: rec?.wins ?? 0,
        losses: rec?.losses ?? 0,
        ties: rec?.ties ?? 0,
        rank: r.rank as number,
      }
    }

    // Build Statbotics EPA lookup: team number → { epa_mean, epa_sd, raw }
    const epaMap: Record<number, { epa_mean: number; epa_sd: number; raw: Record<string, unknown> }> = {}
    for (const te of sbTeams) {
      const epa = te.epa as Record<string, unknown> | undefined
      const totalPoints = epa?.total_points as { mean: number; sd: number } | undefined
      if (totalPoints != null) {
        epaMap[te.team as number] = {
          epa_mean: totalPoints.mean,
          epa_sd: totalPoints.sd,
          raw: te,
        }
      }
    }

    // Upsert event_teams with TBA + Statbotics EPA data
    const teamRows = teams.map((t) => {
      const num = t.team_number as number
      const r = rankMap[`frc${num}`]
      const epa = epaMap[num]
      return {
        event_id: eventKey,
        team_number: num,
        nickname: (t.nickname as string | null) ?? null,
        city: (t.city as string | null) ?? null,
        state_prov: (t.state_prov as string | null) ?? null,
        country: (t.country as string | null) ?? null,
        wins: r?.wins ?? 0,
        losses: r?.losses ?? 0,
        ties: r?.ties ?? 0,
        ranking: r?.rank ?? null,
        epa_mean: epa?.epa_mean ?? null,
        epa_sd: epa?.epa_sd ?? null,
        raw_tba: t,
        raw_statbotics: epa?.raw ?? null,
        updated_at: new Date().toISOString(),
      }
    })

    if (teamRows.length > 0) {
      const { error: teamsErr } = await supabase
        .from('event_teams')
        .upsert(teamRows, { onConflict: 'event_id,team_number' })
      if (teamsErr) throw teamsErr
    }

    // Build Statbotics match predictions lookup: match key → { red_win_prob, predicted_red, predicted_blue }
    const predMap: Record<string, { red_win_prob: number; predicted_red: number; predicted_blue: number }> = {}
    for (const sm of sbMatches) {
      const pred = sm.pred as { red_win_prob: number; red_score: number; blue_score: number } | undefined
      if (pred != null) {
        predMap[sm.key as string] = {
          red_win_prob: pred.red_win_prob,
          predicted_red: Math.round(pred.red_score),
          predicted_blue: Math.round(pred.blue_score),
        }
      }
    }

    // Upsert matches with TBA + Statbotics prediction data
    const matchRows = matches.map((m) => {
      const alliances = m.alliances as {
        red: { score: number; team_keys: string[] }
        blue: { score: number; team_keys: string[] }
      }
      const toNums = (keys: string[]) =>
        keys.filter((k) => !k.includes('surrogate') && !k.includes('dq')).map((k) => parseInt(k.replace('frc', ''), 10))

      const redTeams = toNums(alliances.red.team_keys)
      const blueTeams = toNums(alliances.blue.team_keys)
      const redScore = typeof alliances.red.score === 'number' && alliances.red.score >= 0 ? alliances.red.score : null
      const blueScore = typeof alliances.blue.score === 'number' && alliances.blue.score >= 0 ? alliances.blue.score : null
      const pred = predMap[m.key as string]

      return {
        id: m.key as string,
        event_id: eventKey,
        comp_level: m.comp_level as string,
        match_number: m.match_number as number,
        set_number: (m.set_number as number) ?? 1,
        scheduled_time: m.time ? new Date((m.time as number) * 1000).toISOString() : null,
        actual_time: m.actual_time ? new Date((m.actual_time as number) * 1000).toISOString() : null,
        red_teams: redTeams,
        blue_teams: blueTeams,
        red_score: redScore,
        blue_score: blueScore,
        winner: (m.winning_alliance as string | null) ?? null,
        red_win_prob: pred?.red_win_prob ?? null,
        predicted_red: pred?.predicted_red ?? null,
        predicted_blue: pred?.predicted_blue ?? null,
        raw_data: m,
        synced_at: new Date().toISOString(),
      }
    })

    if (matchRows.length > 0) {
      const { error: matchesErr } = await supabase
        .from('matches')
        .upsert(matchRows, { onConflict: 'id' })
      if (matchesErr) throw matchesErr
    }

    // Broadcast notification to all users that event data was refreshed
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await fetch(`${baseUrl}/api/notifications/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${(tbaEvent.short_name as string) ?? eventKey} data updated`,
        body: `${teamRows.length} teams · ${matchRows.length} matches · ${Object.keys(predMap).length} predictions synced.`,
        type: 'sync',
      }),
    }).catch(() => {}) // non-fatal if notification fails

    return NextResponse.json({
      ok: true,
      synced: {
        teams: teamRows.length,
        teamsWithEPA: Object.keys(epaMap).length,
        matches: matchRows.length,
        matchesWithPredictions: Object.keys(predMap).length,
      },
    })
  } catch (e) {
    console.error('[sync] error:', e)
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
        ? String((e as { message: unknown }).message)
        : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
