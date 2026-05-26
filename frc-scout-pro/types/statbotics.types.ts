export interface StatboticsTeamEvent {
  team: number
  event: string
  epa: {
    start: number
    pre_elim: number | null
    mean: number
    sd: number
    breakdown: {
      auto_points: EPAComponent
      teleop_points: EPAComponent
      endgame_points: EPAComponent
      total_points: EPAComponent
    }
  }
  record: {
    wins: number
    losses: number
    ties: number
    count: number
  }
  rank: number | null
  rp_1_rate: number | null
  rp_2_rate: number | null
  status: string
  first_event: boolean
}

export interface EPAComponent {
  mean: number
  sd: number
}

export interface StatboticsMatch {
  key: string
  event: string
  comp_level: string
  match_number: number
  set_number: number
  status: string
  epa: {
    red: MatchEPA
    blue: MatchEPA
    winner: string
    loser: string
  }
  pred: {
    red_win_prob: number
    red_score: number
    blue_score: number
  }
  result: {
    winner: string
    red_score: number
    blue_score: number
  } | null
}

export interface MatchEPA {
  total_points: { mean: number; sd: number }
  breakdown: Record<string, { mean: number; sd: number }>
}

export interface StatboticsTeamYear {
  team: number
  year: number
  epa: {
    mean: number
    sd: number
    norm: number
    breakdown: {
      auto_points: EPAComponent
      teleop_points: EPAComponent
      endgame_points: EPAComponent
      total_points: EPAComponent
    }
  }
  record: {
    wins: number
    losses: number
    ties: number
  }
  rank: number | null
  percentile: number | null
}
