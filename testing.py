import requests

TBA_BASE = "https://www.thebluealliance.com/api/v3"
HEADERS = {
    "X-TBA-Auth-Key": "yBqDr92gYptagzUrMUjFtX7hvhnRiG6YQ3bdKQYxmjOH3PHLuC560baIkCYe0df4",
    "Accept": "application/json",
}

def get_tba_json(endpoint: str):
    """Helper function to get JSON data from The Blue Alliance API."""
    url = f"{TBA_BASE}{endpoint}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

# # Get a single event
# event = get_tba_json("/event/2025txman")
# print("Single event:", event)

# # Get all events for a year
# events = get_tba_json("/events/2025")
# print("All events for 2025:", events)

# # Get teams at an event
# teams = get_tba_json("/event/2025txman/teams")
# print("Teams at event:", teams)

# # Get matches at an event
# matches = get_tba_json("/event/2025txman/matches")
# print("Matches at event:", matches)

# # Get rankings at an event
# rankings = get_tba_json("/event/2025txman/rankings")
# print("Rankings at event:", rankings)

# Get a team
team = get_tba_json("/team/frc418")
print("Team frc418:", team)

# # Get a team's matches at an event
# team_matches = get_tba_json("/team/frc418/event/2025txman/matches")
# print("Team's matches at event:", team_matches)

# # Get a team's events for a year
# team_events = get_tba_json("/team/frc418/events/2025")
# print("Team's events for 2025:", team_events)
# safe_get(f"{TBA_BASE}/team/frc418/events/2025", headers=HEADERS)

# # Get a team's matches at an event
# team_matches = requests.get(f"{TBA_BASE}/team/frc418/event/2025txman/matches", headers=HEADERS).json()
# print("Team's matches at event:", team_matches)

# # Get a team's events for a year
# team_events = requests.get(f"{TBA_BASE}/team/frc418/events/2025", headers=HEADERS).json()
# print("Team's events for 2025:", team_events)