export interface TBAEvent {
  key: string
  name: string
  short_name: string
  event_type: number
  event_type_string: string
  start_date: string
  end_date: string
  city: string
  state_prov: string
  country: string
  year: number
  week: number
  timezone: string
  website: string | null
  location_name: string | null
}

export interface TBATeam {
  key: string
  team_number: number
  nickname: string
  name: string
  city: string
  state_prov: string
  country: string
  rookie_year: number
  website: string | null
}

export interface TBAMatch {
  key: string
  comp_level: string
  match_number: number
  set_number: number
  event_key: string
  time: number | null
  actual_time: number | null
  predicted_time: number | null
  post_result_time: number | null
  alliances: {
    red: TBAAlliance
    blue: TBAAlliance
  }
  winning_alliance: string | null
  score_breakdown: Record<string, unknown> | null
  videos: Array<{ type: string; key: string }>
}

export interface TBAAlliance {
  score: number
  team_keys: string[]
  surrogate_team_keys: string[]
  dq_team_keys: string[]
}

export interface TBARanking {
  rank: number
  team_key: string
  record: {
    wins: number
    losses: number
    ties: number
  }
  qual_average: number | null
  matches_played: number
  sort_orders: number[]
  extra_stats: number[]
}

export interface TBARankings {
  rankings: TBARanking[]
  sort_order_info: Array<{ precision: number; name: string }>
  extra_stats_info: Array<{ precision: number; name: string }>
}
