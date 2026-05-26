import { z } from 'zod'

export const ScoutingEntrySchema = z.object({
  offline_id: z.string(),
  event_id: z.string().min(1, 'Event required'),
  match_id: z.string().min(1, 'Match required'),
  team_number: z.number().int().min(1).max(99999),
  alliance: z.enum(['red', 'blue']),
  scout_id: z.string(),
  scout_name: z.string().optional(),
  // Auto
  auto_mobility: z.boolean().default(false),
  auto_pieces_scored: z.number().int().min(0).default(0),
  auto_misses: z.number().int().min(0).default(0),
  auto_path_notes: z.string().optional(),
  // Teleop
  teleop_pieces_scored: z.number().int().min(0).default(0),
  teleop_misses: z.number().int().min(0).default(0),
  cycle_count: z.number().int().min(0).default(0),
  avg_cycle_speed: z.number().optional(),
  intake_speed: z.number().int().min(1).max(5).default(3),
  scoring_location: z.string().optional(),
  defense_played: z.boolean().default(false),
  defense_effectiveness: z.number().int().min(1).max(5).optional(),
  defense_resistance: z.number().int().min(1).max(5).optional(),
  // Traversal
  feeding_capability: z.boolean().default(false),
  bump_traversal: z.boolean().default(false),
  trench_traversal: z.boolean().default(false),
  obstacle_capability: z.string().optional(),
  // Endgame
  climb_level: z.number().int().min(0).max(3).default(0),
  climb_speed: z.number().int().min(1).max(5).optional(),
  park_success: z.boolean().default(false),
  climb_consistency: z.number().int().min(1).max(5).optional(),
  // Driver
  driver_smoothness: z.number().int().min(1).max(5).optional(),
  driver_awareness: z.number().int().min(1).max(5).optional(),
  driver_recovery: z.number().int().min(1).max(5).optional(),
  driver_pressure: z.number().int().min(1).max(5).optional(),
  // Reliability
  breakdown: z.boolean().default(false),
  brownout: z.boolean().default(false),
  disconnect: z.boolean().default(false),
  penalty_count: z.number().int().min(0).default(0),
  foul_severity: z.string().optional(),
  // Notes
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  recommended_pick: z.boolean().default(false),
})

export type ScoutingEntryFormData = z.infer<typeof ScoutingEntrySchema>

export const PitScoutingSchema = z.object({
  event_id: z.string().min(1),
  team_number: z.number().int().min(1).max(99999),
  scout_id: z.string(),
  drivetrain: z.string().optional(),
  weight_lbs: z.number().optional(),
  width_in: z.number().optional(),
  length_in: z.number().optional(),
  programming_language: z.string().optional(),
  vision_system: z.string().optional(),
  auto_routines: z.array(z.string()).default([]),
  preferred_role: z.string().optional(),
  max_game_pieces: z.number().int().optional(),
  climb_mechanism: z.string().optional(),
  repair_concerns: z.string().optional(),
  battery_condition: z.string().optional(),
  spare_parts: z.boolean().default(false),
  notes: z.string().optional(),
  photo_urls: z.array(z.string()).default([]),
})

export type PitScoutingFormData = z.infer<typeof PitScoutingSchema>

export const SCOUTING_TAGS = [
  'fast-cycles',
  'defense-bot',
  'unreliable',
  'great-auto',
  'recommended-pick',
  'consistent-climber',
  'floor-pickup',
  'good-driver',
  'camera-issues',
  'mechanical-issues',
] as const
