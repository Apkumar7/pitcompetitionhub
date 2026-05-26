-- ─── Migration 003: Physical Team Role ────────────────────────────────────
-- Run in Supabase Dashboard → SQL Editor → New Query
--
-- Adds team_role to profiles so users can identify their physical role
-- on the FRC team. This drives personalized dashboards and notifications.
--
-- Valid values: drive_team | pit_crew | scout | strategist | general
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_role text
  CHECK (team_role IN ('drive_team', 'pit_crew', 'scout', 'strategist', 'general'));
