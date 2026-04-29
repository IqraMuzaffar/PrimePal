# Ticket 08: Deprecations and API Consistency

**Priority:** 8
**Status:** TODO
**Impact:** Deprecation warnings, inconsistent API patterns

## Backend Deprecations

### datetime.utcnow() (Python 3.12+)

- [ ] `backend/app/api/v1/endpoints/missions.py:684`
- [ ] `backend/app/api/v1/endpoints/rewards.py:55,142`
- [ ] `backend/app/api/v1/endpoints/announcements.py:508`
- [ ] `backend/app/models/interaction.py:31`
- **Fix:** Replace with `datetime.now(timezone.utc)`

### @app.on_event deprecated

- [ ] `backend/app/main.py:22,26` — startup/shutdown events
- **Fix:** Use `lifespan` context manager

### Pydantic V1 @validator

- [ ] `backend/app/api/v1/endpoints/announcements.py:34`
- **Fix:** Replace with `@field_validator` + `@classmethod`

### Pydantic V1 .dict()

- [ ] `backend/app/api/v1/endpoints/missions.py:241,376,539,628,721`
- **Fix:** Replace with `.model_dump()`

## Backend API Consistency

### Inconsistent response formats

- [ ] `POST /classroom/{id}/students/bulk` — returns `{"added": int}` with no status annotation
- [ ] `PATCH /classroom/{id}/syllabus/{week}` — returns `{"ok": True}` with no response model
- [ ] `GET /evaluator/report/teacher` — returns untyped dict
- [ ] `GET /admin/teachers` — returns raw `result.data`

### Admin router prefix inconsistency

- [ ] `backend/app/api/v1/endpoints/admin.py:14` — defines its own prefix, unlike all other routers

### Config duplication

- [ ] `backend/app/core/config.py:34` vs `backend/app/core/security.py:17` — both define token expiry independently

### Duplicate SncTopicOut schema

- [ ] `backend/app/api/v1/endpoints/topics.py:15-18` and `classroom.py:383-386` — same model defined twice

## Frontend Type Safety

- [ ] `frontend/app/student/speaking/page.tsx:40` — `(window as any).SpeechRecognition`
- [ ] `frontend/app/admin/login/page.tsx:42,87,110` — `catch (err: any)`
- [ ] `frontend/app/teacher/announcements/page.tsx:116` — `const payload: any`
- [ ] `frontend/components/student/PrimePalAvatar.tsx:89,105,117,132` — framer-motion variants as `any`
- [ ] `frontend/components/student/SpeakingPronunciationFeedback.tsx:70,81` — variants as `any`
- [ ] `frontend/app/teacher/reports/page.tsx:106,124` and `report/page.tsx:131,152` — `(doc as any).lastAutoTable`

## Frontend — os.environ Side Effects

- [ ] `backend/app/agents/tutor_agent/chatbot.py:18-19` — sets env vars at import time
- [ ] `backend/app/agents/curriculum_agent/embedder.py:11-12` — sets env vars at import time
