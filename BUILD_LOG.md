# BUILD LOG — FRC Scout Pro
**Capstone Project: FRC Competition Operations Platform for Team 418 Purple Haze**
**Developer:** Avinash Kumar (`apkumar7`)
**Stack:** Next.js 16, Supabase, TanStack Query, Zustand, Tailwind CSS

---

## Task 1 — TBA + Statbotics API Integration Fix

**Brief:** None of the data-dependent pages (Teams, Analytics, Dashboard) were showing any information after syncing an event. The sync appeared to succeed but EPA values and match predictions were blank everywhere.

**What Claude proposed:**
Rewrite the sync route (`/api/sync/event/[eventKey]/route.ts`) to call both The Blue Alliance and Statbotics in parallel, correctly map EPA from `epa.total_points.mean` and predictions from `pred.red_win_prob`, and use `Math.round()` on float predicted scores before inserting into integer DB columns.

**What I changed before approving:**
Verified the Statbotics v3 endpoint paths myself using `curl` in the terminal before accepting the fix — the API uses path params (`/team_event/418/2025arc`) not query params. Also confirmed the `raw_tba` column name mismatch by reading the existing migration SQL.

**Verification:**
Opened the app, clicked Sync on a 2025 event, checked the Teams page — EPA badges appeared on every team row. Analytics charts populated with EPA scatter and top scorer data. Console showed `{ synced: { teams: 62, teamsWithEPA: 60, matches: 91, matchesWithPredictions: 88 } }`.

**One thing I learned:** Supabase error objects are not JavaScript `Error` instances — calling `String(e)` on them returns `[object Object]`. You have to extract `.message` explicitly. This would have been invisible without reading the raw API response.

---

## Task 2 — Match Scout Form: Team Dropdown from Alliance

**Brief:** The match scouting form had a freetext team number input. Scouts were entering wrong team numbers (typos, wrong match) and the data was silently corrupted. Needed a dropdown that only shows the 3 teams on the selected match/alliance.

**What Claude proposed:**
Replace the team number text input with a two-step selection — first pick the match from a dropdown populated from the DB schedule, then pick the alliance (Red/Blue), then a third dropdown auto-fills with only the 3 teams on that alliance. Auto-advances to the next match after submission.

**What I changed before approving:**
The initial TypeScript signature for `handleMatchSelect` was `(matchId: string)` but the Base UI Select component passes `(value: string | null, eventDetails)`. Changed the parameter type to `string | null` to stop the compile error. Also confirmed the `or()` query filter syntax for Supabase array containment — `red_teams.cs.{418}` is the correct format.

**Verification:**
Opened Match Scout page, selected a match — dropdown showed correct match labels. Switched to Blue alliance — team list changed to the 3 blue robots. Submitted a form — auto-advanced to the next match in the schedule with the same alliance pre-selected.

**One thing I learned:** Supabase's PostgREST array containment filter is `.cs.{value}` (contains) not `.eq.{value}`. This is different from standard SQL `= ANY()` syntax and isn't obvious from the Supabase docs landing page.

---

## Task 3 — Starred Teams System with Optimistic Updates

**Brief:** Scouts needed to mark teams as favorites during the event for quick reference during alliance selection. Stars had to persist across sessions and update instantly without a page reload.

**What Claude proposed:**
Create a `useStarredTeams` hook using TanStack Query with an optimistic update pattern — immediately update the local cache before the Supabase write completes, and roll back if the server call fails. Store stars in a `starred_teams` table scoped by `user_id`. Add starred section pinned to the top of the Teams list page, and a star button on each team profile page.

**What I changed before approving:**
Reviewed the RLS implications — the `starred_teams` table needed a policy allowing users to read/write only their own rows. Confirmed the table already existed from the initial migration. Adjusted the stale time from the default to 5 minutes since stars rarely change mid-event but need to be fresh at page load.

**Verification:**
Starred Team 254 on the Teams page — the star filled amber instantly (optimistic update). Refreshed the page — the star persisted. Opened the Team 254 profile — star button showed filled state. Opened Teams page — 254 appeared in the pinned Starred section above the main list.

**One thing I learned:** TanStack Query's `onMutate` → `onError` rollback pattern is the correct way to do optimistic updates — not `useEffect` watching state. The key is `cancelQueries` before the optimistic write so no in-flight refetch overwrites your local update.

---

## Task 4 — Team Compare Modal with Side-by-Side Stats

**Brief:** During alliance selection, scouts needed to quickly compare two teams head-to-head — EPA, auto/teleop averages, climb rate, reliability, and pit scouting data — without navigating away from the current page.

**What Claude proposed:**
Build a `TeamCompareModal` component that fetches `event_teams`, `scouting_entries`, and `pit_scouting` in parallel for two team numbers, computes averages client-side, and highlights the winning stat in green. Open it from the team profile page pre-seeded with the current team as Team A. Sections: Performance, Reliability, Robot Info, Standings.

**What I changed before approving:**
Added the `initialTeamA` prop to pre-seed Team A when opened from a profile — Claude's initial version opened the modal blank and made the user type both team numbers. Also changed the backdrop click-to-close behavior to use `stopPropagation` on the inner div rather than a separate state variable, which was cleaner.

**Verification:**
Opened Team 4414 profile, clicked Compare — modal opened with 4414 in Team A field. Typed 254 in Team B — stats loaded for both teams. EPA and ranking showed green highlights on the winning values. Clicked outside the modal — it closed without navigating away.

**One thing I learned:** React Query's parallel fetch pattern (`Promise.all` inside `queryFn`) is much cleaner than three separate `useQuery` calls with `enabled` chains. The modal fetches 3 tables per team (6 total) in a single query function with no waterfall.

---

## Task 5 — Real Notification System with Role-Based Broadcasts

**Brief:** The notifications page existed but was always empty — nothing in the app ever created a notification. Needed real triggers: welcome on signup, broadcast after event sync, and breakdown alerts targeted specifically at pit crew members.

**What Claude proposed:**
Create a `/api/notifications/create` route (using the service client to bypass RLS) and a `/api/notifications/broadcast-role` route that targets all users with a specific `team_role`. Wire triggers into: (1) signup → welcome notification for the new user, (2) sync route → broadcast to all users after sync completes, (3) scouting form submission with `breakdown=true` → targeted alert to all `pit_crew` users. Replace the hardcoded red dot in TopNav with a `NotificationBell` component that queries actual unread count and refreshes every 60 seconds.

**What I changed before approving:**
Added the auto-mark-as-read behavior on the notifications page (2-second delay so users can see which ones were unread before they clear). Also made the broadcast-role route gracefully return `{ ok: true, sent: 0 }` rather than an error when no users match the role — this prevents the scouting form from showing an error toast on the first day of competition before any pit crew members have registered.

**Verification:**
Created a new test account — welcome notification appeared immediately in the bell. Ran event sync — a "418 Regional data updated" broadcast appeared for all logged-in users. Submitted a scouting form with breakdown checked — notification appeared in pit crew user's bell within 30 seconds.

**One thing I learned:** Supabase's service role client bypasses RLS entirely, which is what you need for server-side writes that span multiple user rows (like a broadcast). Using the regular client for this would silently succeed on insert but RLS would block the rows from being readable by the target users.

---

## Task 6 — Command Palette (Cmd+K Global Search)

**Brief:** With 60+ teams at an event, navigating to a specific team's profile required going to Teams, scrolling or searching, then clicking. Scouts needed a faster path — type a team number from anywhere in the app and jump directly to their profile.

**What Claude proposed:**
Build a `CommandPalette` component that mounts globally in the TopNav, opens on `Cmd+K` / `Ctrl+K`, searches the active event's `event_teams` by number or nickname, supports keyboard navigation (↑↓ Enter Escape), and also surfaces quick nav links to every page in the app. The `searchOpen` state already existed in `uiStore` and the Search button in the nav already called `setSearchOpen(true)`.

**What I changed before approving:**
The initial implementation re-fetched teams on every keystroke. Changed to use `staleTime: 5 * 60 * 1000` so the team list loads once and filters client-side — critical for tablet use where network latency during a match would make the palette feel broken. Also added the section separator between team results and navigation links so the two categories are visually distinct.

**Verification:**
Pressed Cmd+K from the Dashboard — palette opened. Typed "254" — Team 254 (The Cheesy Poofs) appeared instantly. Pressed Enter — navigated to their team profile. Pressed Cmd+K from Teams page, typed "anal" — Analytics nav link appeared. Pressed Escape — palette closed without side effects.

**One thing I learned:** Global keyboard shortcuts in Next.js need to be registered with `window.addEventListener` in a `useEffect` with a cleanup, not inline `onKeyDown` on a div — the div approach only captures events when that element is focused, which isn't useful for a palette that can be opened from any page.

---

## Task 7 — Physical Team Role System with Personalized Pages

**Brief:** All users saw the same interface regardless of whether they were a driver, pit crew member, or scout. Drive team members needed post-match analytics and pit crew needed a breakdown tracker — completely different tools built for how each role actually uses the app during competition.

**What Claude proposed:**
Add a `team_role` field to profiles (`drive_team | pit_crew | scout | strategist | general`) with a card-based selector in signup and settings. Build `/drive-team` — a post-match hub with scoring history chart, upcoming match win probabilities, and per-match AI analysis. Build `/pit-crew` — a live breakdown tracker with 30-second auto-refresh, all-teams incident log, reliability leaderboard, and instant notifications when breakdowns are scouted. Inject role-specific nav items into TopNav and replace the last MobileNav tab with the user's role-specific page.

**What I changed before approving:**
The initial `MobileNav` received profile as a prop from the layout, which meant it would require a server re-render to update. Switched to a client-side `useEffect` + `useQuery` inside `MobileNav` that fetches the role once on mount — the mobile nav now updates without a full page reload when the user changes their role in Settings. Also replaced the Anthropic API call in the analysis route with a local rule engine (see Task 8) after realizing a paid API was a blocker for immediate use.

**Verification:**
Created an account with role = "Drive Team" — the Scout dropdown in the nav gained a "Drive Team Hub" link at the top. The last icon on the mobile nav bar changed from Stats to a ⚡ Drive icon. Opened Drive Team Hub — scoring history chart showed, "AI Analysis" button generated 4–5 specific bullets from match data. Created a second account with role = "Pit Crew" — Robot Status appeared in nav. Submitted a scouting entry with `breakdown` checked — pit crew user received a notification within 5 seconds.

**One thing I learned:** Physical team roles (drive team, pit crew) are a completely different concept from system permission roles (admin, scout, viewer). Mixing them in one field would have been a design mistake — keeping `role` (permissions) and `team_role` (physical role) as separate columns makes the intent clear and lets each evolve independently.

---

## Task 8 — Local FRC Rule Engine (No-API Match Analysis)

**Brief:** The drive team hub's "AI Analysis" feature was wired to the Anthropic API, which requires paid credentials. Needed an alternative that works immediately with no setup and produces genuinely useful, match-specific insights — not generic advice.

**What Claude proposed:**
Replace the API call with a local TypeScript rule engine that analyzes the actual match numbers: win margin, auto piece count, teleop output, climb level, breakdown flags, partner EPA, opponent EPA total, and scout notes. Generates 4–5 specific bullets using branching logic for each data dimension. Falls back to contextual fillers only when no specific pattern applies.

**What I changed before approving:**
Reviewed the logic branches carefully. The initial version always showed a "result assessment" bullet even for unplayed matches, which made no sense for upcoming match previews. Fixed the unplayed branch to show an EPA differential read instead of a score comparison. Also tightened the teleop thresholds — the original split was at 5/10 pieces which felt wrong for a game where 6–8 is a strong match; adjusted to 3/6/10.

**Verification:**
Clicked "AI Analysis" on a played match (won by 8 points, 0 auto pieces, L2 climb, no breakdown) — got: "Narrow 8-point win, every point was critical" + "Auto: zero pieces scored — fixing this is the highest-value improvement" + "L2 climb — assess whether L3 is achievable" + alliance EPA context. Response was instant (0ms latency vs ~800ms for API). Tested on a loss with a breakdown — got specific breakdown pit crew warning bullet.

**One thing I learned:** For a domain as structured as FRC scoring, a well-designed rule engine with real data inputs produces more *actionable* insights than a general-purpose LLM would — because the rules can be tuned to exactly what a drive coach actually needs to hear, rather than hedged generic output. The "AI" label on the button is less important than the quality of the analysis.

---

---

## Task 9 — Alliance Synergy Scoring + Strategy Fix

**Brief:** The alliance page was computing "best first picks" using a hardcoded EPA of 40 for Team 418 and a naive `ourEPA + partnerEPA` sum. No actual synergy signals were factored in. The Strategy Center's AI Insights button was permanently disabled by a bad `disabled={!process.env.NEXT_PUBLIC_APP_URL}` check.

**What Claude proposed:**
Replace the hardcoded EPA with the actual Team 418 row from the event data. Compute synergy score as: `baseEPA + climbBonus (when partner climb > 80% and ours < 70%) + cycleBonus (> 5 cycles/match) + reliabilityBonus/penalty`. Cap total bonus at ~±15% of base. Fix the strategy page's always-disabled AI Insights button by removing the bogus env-var check.

**What I changed before approving:**
Reviewed the synergy bonus constants — the original climb bonus was 10% which was too aggressive. Capped it at 5% to avoid over-weighting partners who happened to have high climb rates in just a few matches. Also added the reliability penalty (-8%) since an unreliable partner actually reduces effective EPA, which the plain sum model ignored.

**Verification:**
Opened Alliance Selection after syncing 2025arc. Auto-rank sorted teams by composite score. Suggestions panel showed `~X EPA` values that tracked partner climb/reliability, not just raw EPA sum. Strategy Center: clicked AI Insights with a match selected — it called `/api/ai/insights` and returned bullets correctly (was silently failing before due to always-disabled button).

**One thing I learned:** `disabled={!process.env.NEXT_PUBLIC_APP_URL}` always evaluates to `true` on the client because Next.js only exposes `NEXT_PUBLIC_` vars that were set at build time — if the var isn't in `.env.local`, it's `undefined`, and `!undefined === true`. The button was permanently broken and there were zero console errors indicating it.

---

## Task 10 — Unit Test Suite (Vitest)

**Brief:** The CLAUDE.md mandated unit tests for auth, scouting, starred teams, API integrations, and permissions. None existed. Needed a test suite that runs fast (no browser, no DB) and documents the intended behavior of core logic.

**What Claude proposed:**
Install Vitest + `@testing-library/react` + jsdom. Write 78 unit tests across 5 files:
- `format.test.ts` — `formatMatchKey`, `formatMatchLabel`, `formatEPA`, `teamKey`, etc.
- `scouting.schema.test.ts` — Zod validation for `ScoutingEntrySchema` and `PitScoutingSchema`
- `match-analysis.test.ts` — full coverage of the local FRC rule engine (win margins, auto thresholds, climb levels, breakdown flag)
- `permissions.test.ts` — role permission matrix (admin > lead > scout > viewer) including hierarchy transitivity
- `starred-teams.test.ts` — optimistic update logic, sort-with-starred ordering, immutability

**What I changed before approving:**
One test failed initially: `formatDate('2025-04-01T00:00:00Z')` parsed UTC midnight and formatted to local time, which shifted it to March 31 in this timezone. Fixed by using a midday timestamp (`T12:00:00`) without UTC offset so the date stays stable regardless of machine timezone.

**Verification:**
`npm test` → 78/78 passed, 5/5 test files green, 6.0s cold start.

**One thing I learned:** Vitest's `include`/`exclude` config must be set explicitly when e2e tests (Playwright) live in the same `tests/` directory. Without `include: ['tests/unit/**']`, Vitest picks up Playwright's `test.describe()` calls and fails with "Playwright Test did not expect test.describe() to be called here" — a confusing error that looks like a version conflict.

---

## Task 11 — Playwright E2E Test Scaffolding

**Brief:** The CLAUDE.md required E2E tests for the full login → scouting → sync flow, offline mode, and alliance selection workflow. Playwright was already in devDependencies but had no config or test files.

**What Claude proposed:**
Write `playwright.config.ts` pointing at `tests/e2e/`, with `webServer` auto-starting the prod build. Three spec files: `auth.spec.ts` (login page structure, invalid credential error, route protection redirects), `alliance.spec.ts` (page loads, auto-rank, save picklist), `scout-form.spec.ts` (redirect guard, form elements, submit validation). Credential-dependent tests skip automatically when `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` env vars are absent.

**What I changed before approving:**
Kept the E2E tests pragmatic — the route-protection tests (unauthenticated redirect) run in any environment without credentials. The full flow tests skip gracefully when credentials aren't set, so CI never fails just because secrets aren't configured. Also set `workers: 1` to prevent parallel runs that would fight over the same dev server port.

**Verification:**
`npm run test` (Vitest) → 78/78 unit tests pass, e2e files excluded. `npm run test:e2e` is ready and will run the route-protection tests against a running server without credentials.

**One thing I learned:** Vitest and Playwright both use `test` and `describe` — if Vitest picks up a Playwright file, the error is "Playwright Test did not expect test.describe() to be called here" which looks like a Playwright version conflict, not a Vitest config issue. The fix is `include: ['tests/unit/**']` in `vitest.config.ts`.

---

## Summary

| Task | Feature | Files Changed | Status |
|------|---------|---------------|--------|
| 1 | TBA + Statbotics sync fix | `app/api/sync/event/[eventKey]/route.ts` | ✅ |
| 2 | Match scout team dropdown | `components/scout/MatchScoutForm.tsx` | ✅ |
| 3 | Starred teams system | `hooks/useStarredTeams.ts`, `app/(app)/teams/page.tsx`, `[teamNumber]/page.tsx` | ✅ |
| 4 | Team compare modal | `components/teams/TeamCompareModal.tsx` | ✅ |
| 5 | Real notification system | `app/api/notifications/create/route.ts`, `broadcast-role/route.ts`, `components/shared/NotificationBell.tsx` | ✅ |
| 6 | Command palette (Cmd+K) | `components/shared/CommandPalette.tsx`, `components/layout/TopNav.tsx` | ✅ |
| 7 | Physical team role system | `app/(app)/drive-team/page.tsx`, `app/(app)/pit-crew/page.tsx`, `types/database.types.ts` | ✅ |
| 8 | Local FRC rule engine | `app/api/ai/match-analysis/route.ts` | ✅ |
| 9 | Alliance synergy scoring + strategy fix | `app/(app)/alliance/page.tsx`, `app/(app)/strategy/page.tsx` | ✅ |
| 10 | Unit test suite (Vitest) | `tests/unit/*.test.ts`, `vitest.config.ts`, `tests/setup.ts` | ✅ |
| 11 | Playwright E2E scaffolding | `playwright.config.ts`, `tests/e2e/*.spec.ts` | ✅ |

**SQL migrations to run in Supabase before next session:**
```sql
-- From 001_add_missing_columns.sql
ALTER TABLE event_teams ADD COLUMN IF NOT EXISTS epa_mean float8, ...;
-- From 002_team_number_and_notifications.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_number integer;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';
-- From 003_team_role.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_role text
  CHECK (team_role IN ('drive_team', 'pit_crew', 'scout', 'strategist', 'general'));
```
