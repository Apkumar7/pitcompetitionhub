PROJECT OVERVIEW

You are building a production-grade FRC competition operations platform for Team 418 Purple Haze.

This is NOT a demo.

It must function as a real competition tool used during live FRC events.

CORE PRINCIPLES

You MUST follow these rules:

1. Reliability > Features

If something is unstable, simplify it.

2. Offline-first is mandatory

Scouting MUST work without internet.

3. Speed is critical

Every interaction should feel instant.

4. Mobile-first scouting UI

Tablets are the primary input device.

5. Data correctness > UI polish

Never sacrifice correctness for visuals.

AUTHENTICATION RULES
Users MUST log in before accessing any data
Every user MUST have a teamNumber
Data access is scoped by teamNumber unless admin
Roles must be enforced server-side
USER MODEL

Must include:

id
name
email
role
teamNumber
createdAt
lastLogin
STARRED TEAMS SYSTEM

Users can:

star teams
unstar teams
view starred teams list

Rules:

starred teams are per-user
must persist across sessions
must sync with backend
DATA SCOPING RULES
Scouts can only edit scouting entries
Strategists can view analytics + scouting
Admins can modify everything
Viewers are read-only
OFFLINE MODE RULES
All scouting forms must work offline
Data must queue locally
Sync must retry automatically
Conflicts must be resolved by latest timestamp
API RULES

When calling external APIs:

Always cache responses
Never spam Statbotics or TBA
Implement retry with exponential backoff
REQUIRED FEATURES

You must implement:

Dashboard
schedule
match predictions
EPA overview
alerts
Scouting
match scouting
pit scouting
offline mode
autosave
Teams
team profiles
stats
charts
starred teams
Strategy
alliance selection
picklist generator
synergy scoring
Analytics
rankings
performance graphs
match insights
STARRED TEAMS RULES
must be accessible everywhere
must be filterable
must be highlighted in alliance selection
must appear in sidebar
TESTING REQUIREMENTS (MANDATORY)

You MUST write tests for:

Unit Tests
auth flow
scouting system
starred teams
API integrations
permissions
E2E Tests (Playwright)
full login → scouting → sync flow
offline mode test
alliance selection workflow
Performance Tests
dashboard load time < 2 seconds
scouting form < 300ms response
DATABASE RULES

Must include:

users
teams
matches
scouting_entries
pit_scouting
starred_teams
audit_logs
notifications

All tables must:

have indexes
enforce foreign keys
support RLS (row-level security)
UI RULES
dark mode default
purple accent theme (Team 418 branding)
esports dashboard aesthetic
large touch targets
minimal typing required
fast transitions only
CODE QUALITY RULES
strict TypeScript only
reusable components only
no duplicated API calls
clean architecture required
feature-based folder structure
all forms validated with Zod
PERFORMANCE RULES
must support 100+ concurrent users
must use caching everywhere possible
must avoid unnecessary re-renders
must lazy-load heavy pages
SUCCESS CRITERIA

The system is successful ONLY if:

scouts can use it during a real FRC match without lag
offline mode works reliably
alliance selection improves decision-making speed
starred teams improve strategy workflows
match predictions are visible and usable in real time
FINAL NOTE

This system should feel like:

a professional F1 pit wall dashboard
a competitive esports analytics platform
a real-time decision engine

NOT:

a school project
a basic CRUD app
a static website
