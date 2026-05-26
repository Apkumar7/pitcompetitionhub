-- Run this in the Supabase SQL Editor if you already ran schema.sql
-- Adds columns that the app expects but were missing from the initial schema

-- event_teams: add ranking/record/EPA columns
ALTER TABLE public.event_teams
  ADD COLUMN IF NOT EXISTS wins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ties integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ranking integer,
  ADD COLUMN IF NOT EXISTS epa_mean numeric(8,4),
  ADD COLUMN IF NOT EXISTS epa_sd numeric(8,4),
  ADD COLUMN IF NOT EXISTS raw_statbotics jsonb;

-- matches: add win probability columns
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS red_win_prob numeric(5,4),
  ADD COLUMN IF NOT EXISTS predicted_red integer,
  ADD COLUMN IF NOT EXISTS predicted_blue integer;

-- events: add week + synced_at
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS week integer,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- Allow service role upserts (service role bypasses RLS, but add upsert policies for anon/auth)
CREATE POLICY IF NOT EXISTS "Admins can update events"
  ON public.events FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can delete events"
  ON public.events FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
