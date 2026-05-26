import type { StatboticsTeamEvent, StatboticsMatch, StatboticsTeamYear } from '@/types/statbotics.types'

const BASE = '/api/statbotics'

async function fetchSB<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`Statbotics fetch failed: ${res.status}`)
  return res.json()
}

export async function getTeamEvent(teamNumber: number, eventKey: string): Promise<StatboticsTeamEvent> {
  return fetchSB(`team_event/${teamNumber}/${eventKey}`)
}

export async function getEventTeamEPAs(eventKey: string): Promise<StatboticsTeamEvent[]> {
  return fetchSB(`team_events?event=${eventKey}&limit=100`)
}

export async function getMatchPrediction(matchKey: string): Promise<StatboticsMatch> {
  return fetchSB(`match/${matchKey}`)
}

export async function getEventMatches(eventKey: string): Promise<StatboticsMatch[]> {
  return fetchSB(`matches?event=${eventKey}&limit=200`)
}

export async function getTeamYear(teamNumber: number, year: number): Promise<StatboticsTeamYear> {
  return fetchSB(`team_year/${teamNumber}/${year}`)
}
