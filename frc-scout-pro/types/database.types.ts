export type UserRole = 'admin' | 'lead' | 'scout' | 'viewer'
export type TeamRole = 'drive_team' | 'pit_crew' | 'scout' | 'strategist' | 'general'
export type Alliance = 'red' | 'blue'
export type CompLevel = 'qm' | 'ef' | 'qf' | 'sf' | 'f'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  team_number: number | null
  team_role: TeamRole | null  // physical role on the FRC team
  created_at: string
}

export interface Event {
  id: string
  name: string
  short_name: string | null
  event_type: number | null
  start_date: string | null
  end_date: string | null
  city: string | null
  state_prov: string | null
  year: number | null
  week: number | null
  raw_data: Record<string, unknown> | null
  synced_at: string
}

export interface EventTeam {
  event_id: string
  team_number: number
  nickname: string | null
  city: string | null
  state_prov: string | null
  epa_mean: number | null
  epa_sd: number | null
  ranking: number | null
  wins: number
  losses: number
  ties: number
  raw_tba: Record<string, unknown> | null
  raw_statbotics: Record<string, unknown> | null
  updated_at: string
}

export interface Match {
  id: string
  event_id: string
  comp_level: string
  match_number: number
  set_number: number
  scheduled_time: string | null
  actual_time: string | null
  red_teams: number[]
  blue_teams: number[]
  red_score: number | null
  blue_score: number | null
  winner: string | null
  red_win_prob: number | null
  predicted_red: number | null
  predicted_blue: number | null
  raw_data: Record<string, unknown> | null
  synced_at: string
}

export interface ScoutingEntry {
  id: string
  event_id: string
  match_id: string
  team_number: number
  alliance: Alliance
  scout_id: string
  scout_name: string | null
  auto_mobility: boolean
  auto_pieces_scored: number
  auto_misses: number
  auto_path_notes: string | null
  teleop_pieces_scored: number
  teleop_misses: number
  cycle_count: number
  avg_cycle_speed: number | null
  intake_speed: number
  scoring_location: string | null
  defense_played: boolean
  defense_effectiveness: number | null
  defense_resistance: number | null
  feeding_capability: boolean
  bump_traversal: boolean
  trench_traversal: boolean
  obstacle_capability: string | null
  climb_level: number
  climb_speed: number | null
  park_success: boolean
  climb_consistency: number | null
  driver_smoothness: number | null
  driver_awareness: number | null
  driver_recovery: number | null
  driver_pressure: number | null
  breakdown: boolean
  brownout: boolean
  disconnect: boolean
  penalty_count: number
  foul_severity: string | null
  notes: string | null
  tags: string[] | null
  recommended_pick: boolean
  submitted_at: string
  synced: boolean
  offline_id: string | null
}

export interface PitScouting {
  id: string
  event_id: string
  team_number: number
  scout_id: string
  drivetrain: string | null
  weight_lbs: number | null
  width_in: number | null
  length_in: number | null
  programming_language: string | null
  vision_system: string | null
  auto_routines: string[] | null
  preferred_role: string | null
  max_game_pieces: number | null
  climb_mechanism: string | null
  repair_concerns: string | null
  battery_condition: string | null
  spare_parts: boolean
  notes: string | null
  photo_urls: string[] | null
  submitted_at: string
}

export interface Picklist {
  id: string
  event_id: string
  name: string
  created_by: string
  rankings: PicklistEntry[]
  created_at: string
  updated_at: string
}

export interface PicklistEntry {
  team_number: number
  rank: number
  notes: string
  favorited: boolean
  blacklisted: boolean
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  type: string | null
  read: boolean
  created_at: string
}

export interface ScoutAssignment {
  id: string
  event_id: string
  match_id: string
  scout_id: string
  team_number: number | null
  alliance: string | null
  completed: boolean
  assigned_at: string
}
