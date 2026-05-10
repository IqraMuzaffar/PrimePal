# Ticket 02: Broken Endpoints

**Priority:** 2 (Ship-blocker)
**Status:** TODO
**Impact:** Multiple endpoints return 500 on every request

## Issues

### Backend — Whisper API crash

- [ ] `backend/app/api/v1/endpoints/speaking.py:381-383` — `.get("text", "")` and `.get("words", [])` on OpenAI Pydantic model object
- **Fix:** Change to `transcript_response.text` and `transcript_response.words`

### Backend — Wrong column name

- [ ] `backend/app/api/v1/endpoints/evaluator.py:243` — queries `is_correct` but column is `correct`
- [ ] `backend/app/api/v1/endpoints/evaluator.py:257` — accesses `row["is_correct"]` which KeyErrors
- **Fix:** Change `is_correct` to `correct` in both the query and access

### Backend — Stub endpoints that 500

- [ ] `backend/app/api/v1/endpoints/tutor.py:13` — `POST /tutor/quest/generate` raises NotImplementedError
- [ ] `backend/app/api/v1/endpoints/tutor.py:20` — `GET /tutor/quest/{student_id}/current` raises NotImplementedError
- [ ] `backend/app/api/v1/endpoints/tutor.py:26` — `POST /tutor/chat` raises NotImplementedError
- [ ] `backend/app/api/v1/endpoints/tutor.py:32` — `POST /tutor/speech-to-text` raises NotImplementedError
- **Fix:** Remove the tutor router from `router.py` entirely, or implement the endpoints

### Frontend — PIN update sends [object Object]

- [ ] `frontend/app/teacher/students/page.tsx:101` — `body: { secret_pin: pin }` not JSON.stringified
- **Fix:** Use `apiFetch` which handles serialization, or wrap with `JSON.stringify()`
