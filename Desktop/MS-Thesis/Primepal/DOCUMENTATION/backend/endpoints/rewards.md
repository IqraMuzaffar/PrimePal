# Rewards Endpoints

**Module:** `backend/app/api/v1/endpoints/rewards.py`
**Prefix:** `/api/v1/rewards`
**Auth:** Student (custom PyJWT)

## Endpoints

### GET `/rewards/daily-chest`
Check if the student has a daily chest available (one per 24h).

### POST `/rewards/daily-chest/claim`
Claim the daily chest reward. Awards random points within a range.
Anti-cheat: server-side validation ensures only one claim per 24-hour window.

## Features
- Interactive chest animation on the frontend (DailyChestModal component)
- Points awarded via the same read-modify-write pattern as other endpoints
