# Missions Endpoints

**Module:** `backend/app/api/v1/endpoints/missions.py`
**Prefix:** `/api/v1/missions`
**Auth:** Student (custom PyJWT)

## Endpoints

### GET `/missions/daily`
Generate or retrieve cached daily missions (3 questions across pillars).
Uses Redis cache keyed by student + date. LLM generates questions using RAG-retrieved curriculum context filtered by student's grade level.

### POST `/missions/daily/submit`
Submit answers for daily missions. Evaluates correctness, awards points, logs interactions.
**Body:** `{ answers: [{ question_id, answer }] }`

### GET `/missions/pillar/{pillar}`
Generate pillar-specific missions (reading/writing/listening/speaking).
**Pillars:** `reading`, `writing`, `listening`, `speaking`

### POST `/missions/pillar/{pillar}/submit`
Submit answers for a pillar mission.

### GET `/missions/weekly-progress`
Get 7-day rolling window progress across all four pillars.

### GET `/missions/completed`
Check which missions the student has completed today.

## Points
Each correct answer awards points. The current implementation uses a read-modify-write pattern (see TICKETS/05 for planned atomic fix).
