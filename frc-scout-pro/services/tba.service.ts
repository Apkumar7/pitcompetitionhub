import type { TBAEvent, TBATeam, TBAMatch, TBARankings } from '@/types/tba.types'

const BASE = '/api/tba'

async function fetchTBA<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`TBA fetch failed: ${res.status}`)
  return res.json()
}

export async function getEvent(eventKey: string): Promise<TBAEvent> {
  return fetchTBA(`event/${eventKey}`)
}

export async function getEventsByYear(year: number): Promise<TBAEvent[]> {
  return fetchTBA(`events/${year}`)
}

export async function getEventTeams(eventKey: string): Promise<TBATeam[]> {
  return fetchTBA(`event/${eventKey}/teams`)
}

export async function getEventMatches(eventKey: string): Promise<TBAMatch[]> {
  return fetchTBA(`event/${eventKey}/matches`)
}

export async function getEventRankings(eventKey: string): Promise<TBARankings> {
  return fetchTBA(`event/${eventKey}/rankings`)
}

export async function getTeam(teamNumber: number): Promise<TBATeam> {
  return fetchTBA(`team/frc${teamNumber}`)
}

export async function getTeamEventMatches(teamNumber: number, eventKey: string): Promise<TBAMatch[]> {
  return fetchTBA(`team/frc${teamNumber}/event/${eventKey}/matches`)
}

export async function getTeamEventsForYear(teamNumber: number, year: number): Promise<TBAEvent[]> {
  return fetchTBA(`team/frc${teamNumber}/events/${year}`)
}
