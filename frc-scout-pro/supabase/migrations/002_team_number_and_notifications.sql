-- ─── Migration 002: Team Number + Notification Type Column ───────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Changes:
--   1. Add team_number to profiles (nullable — existing users won't break)
--   2. Add type column to notifications (used to filter/display icon by type)
-- ──────────────────────────────────────────────────────────────────────────

-- 1. FRC team number on each user profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_number integer;

-- 2. Notification type (welcome | sync | scouting | info | alert)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';
