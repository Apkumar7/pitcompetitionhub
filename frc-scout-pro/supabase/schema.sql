-- ============================================================
-- FRC Scout Pro — Full Database Schema
-- Run this in the Supabase SQL Editor (paste all at once)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  role         text not null default 'scout' check (role in ('admin','lead','strategist','scout','viewer')),
  team_number  integer,
  created_at   timestamptz not null default now(),
  last_login   timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id          text primary key,  -- TBA event key e.g. "2025nyny"
  name        text not null,
  short_name  text,
  event_type  integer,
  city        text,
  state_prov  text,
  country     text,
  start_date  date,
  end_date    date,
  year        integer,
  raw_tba     jsonb,
  created_at  timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "Everyone can read events" on public.events for select using (true);
create policy "Admins can insert events" on public.events for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create index idx_events_year on public.events(year);

-- ============================================================
-- EVENT TEAMS
-- ============================================================
create table public.event_teams (
  id          uuid primary key default uuid_generate_v4(),
  event_id    text not null references public.events(id) on delete cascade,
  team_number integer not null,
  nickname    text,
  city        text,
  state_prov  text,
  country     text,
  raw_tba     jsonb,
  updated_at  timestamptz not null default now(),
  unique (event_id, team_number)
);

alter table public.event_teams enable row level security;
create policy "Everyone can read event_teams" on public.event_teams for select using (true);
create policy "Admins can write event_teams" on public.event_teams for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','lead'))
);

create index idx_event_teams_event on public.event_teams(event_id);
create index idx_event_teams_number on public.event_teams(team_number);

-- ============================================================
-- MATCHES
-- ============================================================
create table public.matches (
  id             text primary key,  -- TBA match key e.g. "2025nyny_qm1"
  event_id       text not null references public.events(id) on delete cascade,
  comp_level     text not null check (comp_level in ('qm','ef','qf','sf','f')),
  match_number   integer not null,
  set_number     integer not null default 1,
  scheduled_time timestamptz,
  actual_time    timestamptz,
  red_teams      integer[] not null default '{}',
  blue_teams     integer[] not null default '{}',
  red_score      integer,
  blue_score     integer,
  winner         text check (winner in ('red','blue','')),
  raw_data       jsonb,
  synced_at      timestamptz not null default now()
);

alter table public.matches enable row level security;
create policy "Everyone can read matches" on public.matches for select using (true);
create policy "Admins can write matches" on public.matches for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','lead'))
);

create index idx_matches_event on public.matches(event_id);
create index idx_matches_comp_level on public.matches(event_id, comp_level, match_number);

-- ============================================================
-- SCOUTING ENTRIES
-- ============================================================
create table public.scouting_entries (
  id               uuid primary key default uuid_generate_v4(),
  offline_id       text not null unique,
  event_id         text not null references public.events(id) on delete cascade,
  match_id         text not null references public.matches(id) on delete cascade,
  team_number      integer not null,
  alliance         text not null check (alliance in ('red','blue')),
  scout_id         uuid references public.profiles(id),
  scout_name       text,

  -- Autonomous
  auto_mobility    boolean not null default false,
  auto_scored      integer not null default 0,
  auto_missed      integer not null default 0,
  auto_path_notes  text,

  -- Teleop
  teleop_scored    integer not null default 0,
  teleop_missed    integer not null default 0,
  teleop_cycles    integer not null default 0,
  teleop_defense   boolean not null default false,
  defense_rating   integer check (defense_rating between 1 and 5),

  -- Endgame
  climb_attempted  boolean not null default false,
  climb_succeeded  boolean not null default false,
  climb_level      text check (climb_level in ('none','low','mid','high','traversal','')),
  climb_time_secs  integer,

  -- Overall
  breakdown        boolean not null default false,
  penalty_cards    integer not null default 0,
  driver_rating    integer check (driver_rating between 1 and 5),
  notes            text,
  tags             text[] not null default '{}',

  synced           boolean not null default false,
  submitted_at     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.scouting_entries enable row level security;

create policy "Scouts can insert own entries"
  on public.scouting_entries for insert
  with check (auth.uid() = scout_id);

create policy "Anyone can read scouting entries"
  on public.scouting_entries for select using (true);

create policy "Scouts can update own entries"
  on public.scouting_entries for update
  using (auth.uid() = scout_id);

create policy "Admins can do anything with entries"
  on public.scouting_entries for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','lead'))
  );

create index idx_scouting_event on public.scouting_entries(event_id);
create index idx_scouting_team on public.scouting_entries(team_number);
create index idx_scouting_match on public.scouting_entries(match_id);
create index idx_scouting_scout on public.scouting_entries(scout_id);
create index idx_scouting_synced on public.scouting_entries(synced);

-- ============================================================
-- PIT SCOUTING
-- ============================================================
create table public.pit_scouting (
  id              uuid primary key default uuid_generate_v4(),
  event_id        text not null references public.events(id) on delete cascade,
  team_number     integer not null,
  scout_id        uuid references public.profiles(id),

  -- Robot info
  drivetrain      text,
  weight_lbs      numeric(6,2),
  height_inches   numeric(6,2),
  auto_programs   integer not null default 0,

  -- Capabilities
  can_score_high  boolean not null default false,
  can_score_mid   boolean not null default false,
  can_score_low   boolean not null default true,
  can_climb       boolean not null default false,
  max_climb_level text,
  can_defense     boolean not null default false,

  -- Qualitative
  driver_exp_years integer,
  overall_rating  integer check (overall_rating between 1 and 5),
  notes           text,
  photo_url       text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (event_id, team_number)
);

alter table public.pit_scouting enable row level security;
create policy "Anyone can read pit scouting" on public.pit_scouting for select using (true);
create policy "Scouts can write pit scouting" on public.pit_scouting for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','lead','scout'))
);

create index idx_pit_event on public.pit_scouting(event_id);
create index idx_pit_team on public.pit_scouting(team_number);

-- ============================================================
-- STARRED TEAMS
-- ============================================================
create table public.starred_teams (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  team_number integer not null,
  event_id    text references public.events(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, team_number)
);

alter table public.starred_teams enable row level security;

create policy "Users can manage their own starred teams"
  on public.starred_teams for all using (auth.uid() = user_id);

create index idx_starred_user on public.starred_teams(user_id);
create index idx_starred_team on public.starred_teams(team_number);

-- ============================================================
-- PICKLISTS
-- ============================================================
create table public.picklists (
  id          uuid primary key default uuid_generate_v4(),
  event_id    text not null references public.events(id) on delete cascade,
  name        text not null,
  created_by  uuid references public.profiles(id),
  team_order  integer[] not null default '{}',
  notes       jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.picklists enable row level security;
create policy "Everyone can read picklists" on public.picklists for select using (true);
create policy "Leads and admins can write picklists" on public.picklists for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','lead','strategist'))
);

create index idx_picklists_event on public.picklists(event_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  type        text not null check (type in ('match_upcoming','sync_complete','new_scouting','alert','system')),
  title       text not null,
  body        text,
  read        boolean not null default false,
  data        jsonb,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "Users can read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Admins can insert notifications" on public.notifications for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','lead'))
);

create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, read);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id),
  action      text not null,
  table_name  text,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
create policy "Admins can read audit logs" on public.audit_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "System can insert audit logs" on public.audit_logs for insert with check (true);

create index idx_audit_user on public.audit_logs(user_id);
create index idx_audit_table on public.audit_logs(table_name);
create index idx_audit_created on public.audit_logs(created_at desc);

-- ============================================================
-- REALTIME: enable for live updates
-- ============================================================
alter publication supabase_realtime add table public.scouting_entries;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.picklists;
