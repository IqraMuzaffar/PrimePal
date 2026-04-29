# Ticket 05: Security Hardening

**Priority:** 5
**Status:** TODO
**Impact:** Budget drain, DoS vectors, data exposure

## Rate Limiting

- [ ] No rate limiting on any endpoint — LLM endpoints (`/chat`, `/missions/daily`, `/missions/pillar`, `/spelling-bee/words`, `/story-time/story`, `/speaking/prompts`, `/speaking/evaluate`, `/speaking/evaluate-pro`, `/announcements`) cost real OpenAI money
- **Fix:** Add FastAPI rate limiting middleware (e.g., `slowapi`)

## File Upload Limits

- [ ] `backend/app/api/v1/endpoints/curriculum.py:62-91` — PDF upload, no size limit
- [ ] `backend/app/api/v1/endpoints/speaking.py:338-396` — audio upload, no size limit
- **Fix:** Add max file size check before `await file.read()`

## Points Race Condition

- [ ] `backend/app/api/v1/endpoints/missions.py:271-307` — read-modify-write
- [ ] `backend/app/api/v1/endpoints/rewards.py:120-153` — read-modify-write
- [ ] `backend/app/api/v1/endpoints/spelling_bee.py:208-233` — read-modify-write
- [ ] `backend/app/api/v1/endpoints/story_time.py:199-225` — read-modify-write
- [ ] `backend/app/api/v1/endpoints/speaking.py:277-299` — read-modify-write
- **Fix:** Use atomic SQL `points = points + N` or row-level locking

## Unauthenticated Endpoints Exposing Data

- [ ] `backend/app/api/v1/endpoints/auth.py:98-133` — `GET /auth/classroom/{class_code}/avatars` returns children's names without auth
- [ ] `backend/app/api/v1/endpoints/announcements.py:402-463` — `GET /announcements/active/{classroom_id}` exposes teacher_id without auth

## Answer Leaking

- [ ] `backend/app/api/v1/endpoints/story_time.py:29-39,171` — `correct_index` sent to client before student answers
- **Fix:** Strip `correct_index` from response, validate server-side

## Plaintext PINs

- [ ] `backend/app/api/v1/endpoints/auth.py:177,281` — student PINs stored and compared in plaintext

## Admin Error Leaking

- [ ] `backend/app/api/v1/endpoints/admin.py` (lines 63,93,158,195,248,260,304,316,346,358) — `detail=str(e)` exposes internal errors
- **Fix:** Return generic error messages, log details server-side

## Secrets on Disk

- [ ] `backend/.env` — contains live Supabase service role key, OpenAI key, DB password, weak SECRET_KEY
- [ ] `frontend/.env.local` — contains Supabase credentials
- **Fix:** Rotate all secrets before production, ensure Docker build excludes .env files

## JWT Client-Side

- [ ] `frontend/lib/adminAuth.ts:27-29` — JWT decoded with `atob` without signature verification
