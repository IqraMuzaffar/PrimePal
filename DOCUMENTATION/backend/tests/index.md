# Backend Tests

**Directory:** `backend/tests/`

pytest + httpx async test suite covering authentication, classrooms, chat, missions, evaluator, curriculum ingestion, interactions, topics, and analytics.

## How to Run

```bash
cd backend
pytest                       # Run all tests
pytest -v                    # Verbose output
pytest tests/test_auth.py    # Run a single test file
pytest -k "test_chat"        # Run tests matching a pattern
```

## Test Infrastructure

### `conftest.py`

Sets environment variables BEFORE any app code is imported (required because pydantic-settings reads them at import time):

```python
os.environ.setdefault("STUDENT_JWT_SECRET", "test-student-secret-key-for-pytest")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
```

**Fixtures:**
- `client` -- Async `httpx.AsyncClient` wired to the FastAPI app via `ASGITransport` (no real network calls)
- `auth_headers` -- `{"Authorization": "Bearer test-token"}` for convenience

### Testing Patterns

- **No real API calls.** All Supabase, OpenAI, and LLM calls are mocked using `unittest.mock.MagicMock` and `AsyncMock`.
- **Dependency overrides.** Auth dependencies (`get_current_student`, `get_current_teacher`) are overridden via `app.dependency_overrides[dep] = lambda: mock_payload` so tests bypass real authentication.
- **Supabase mock pattern.** The Supabase chained query interface (`.table().select().eq().execute()`) is mocked by building nested `MagicMock` objects with configured return values.

## Test Files

### `test_auth.py` -- Authentication (Feature 1)

**Covers:** Student login, classroom avatars, JWT utilities, profile customization, secret PIN

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestGetClassroomAvatars` | 4 | `GET /auth/classroom/{code}/avatars` -- valid code, 404, empty list, case sensitivity |
| `TestStudentLogin` | 5 | `POST /auth/student/login` -- valid login, JWT claims, 404, 403, 422 |
| `TestJWTUtils` | 5 | `create_student_token`, `decode_student_token` (valid, expired, tampered, wrong role) |
| `TestGetAvatarsReturnsCustomizationFields` | 1 | Avatar response includes `avatar_style` and `theme_color` |
| `TestPatchStudentProfile` | 4 | `PATCH /auth/student/profile` -- valid update, invalid style, invalid color, auth required |
| `TestStudentLoginPIN` | 4 | PIN verification: correct PIN, wrong PIN, missing PIN, non-4-digit PIN |
| `TestTeacherPINReset` | 3 | `PATCH /auth/student/{id}/pin` -- teacher reset, invalid format, wrong teacher |

### `test_chat.py` -- Bilingual AI Chatbot (Features 5 + 7)

**Covers:** Chat endpoint, grade guardrail, RAG retrieval, LLM response, translation pipeline

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestChatEndpoint` | 6 | `POST /chat` -- happy path, no context, grade echo, 404, empty message, no auth |
| `TestGradeGuardrail` | 2 | **Critical:** Grade 3 student asking advanced questions still gets Grade 3 filter; grade not overridable via request body |
| `TestRetrieveGradeFilteredChunks` | 3 | Unit: RPC called with correct grade filter, empty data handling, grade bleed prevention |
| `TestGetGuardrailedResponse` | 3 | Unit: TutorResponse shape, empty context fallback, both messages in payload |
| `TestFeature7Translation` | 5 | Translation called before retrieval, translated query used for search, bilingual response, translated_query in response |

### `test_classroom.py` -- Classroom Manager (Feature 2)

**Covers:** Classroom CRUD, bulk student operations

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestCreateClassroom` | 2 | `POST /classroom/` -- 201 response, auth required |
| `TestListClassrooms` | 2 | `GET /classroom/` -- owned classrooms, empty list |
| `TestGetClassroomDetail` | 2 | `GET /classroom/{id}` -- with students, wrong teacher 403 |
| `TestBulkAddStudents` | 2 | `POST /classroom/{id}/students/bulk` -- success, empty name filtering |
| `TestRemoveStudent` | 2 | `DELETE /classroom/{id}/students/{sid}` -- success, not found 404 |

### `test_evaluator.py` -- NLP Insight Generator (Feature 9)

**Covers:** Student reports, classroom reports, evaluate_interactions unit tests

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestStudentReport` | 4 | `GET /evaluator/report/student/{id}` -- happy path, wrong teacher, not found, no auth |
| `TestClassroomReport` | 3 | `GET /evaluator/report/classroom/{id}` -- happy path, wrong teacher, empty classroom |
| `TestEvaluateInteractions` | 2 | Unit: LLM called with correct stats, handles empty interactions |

### `test_ingestion.py` -- SNC Document Ingestion (Feature 3)

**Covers:** PDF upload, text cleaning, chunking

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestUploadSNCTextbook` | 5 | `POST /curriculum/upload` -- valid PDF, metadata tags, .txt rejected, .jpg rejected, all-short-chunks |
| `TestUploadSNCTextbookAuth` | 1 | Upload without auth token returns 403 |
| `TestCleanSNCText` | 3 | Unit: page number removal, SNC header removal, blank line collapse |
| `TestChunkDocuments` | 4 | Unit: splits long text, no mid-word splits, metadata applied, short chunks filtered |

### `test_knowledge_base.py` -- Vector Storage (Feature 4)

**Covers:** Embedding and storage, embed endpoint

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestEmbedAndStoreChunks` | 4 | Unit: OpenAI called, correct records inserted, empty input, correct table |
| `TestEmbedEndpoint` | 3 | `POST /curriculum/embed` -- success, empty chunks rejected, auth required |

### `test_missions.py` -- Gamified Missions (Feature 6)

**Covers:** Daily missions, mission completion, student profile, grade guardrail

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestGetDailyMissions` | 5 | `GET /missions/daily` -- happy path, correct_answer stripped, grade filter, 404, no auth |
| `TestPostCompleteMission` | 3 | `POST /missions/complete` -- correct answer +10pts, wrong answer +0pts, student not found |
| `TestGetStudentProfile` | 3 | `GET /missions/me` -- profile data, not found, customization fields |
| `TestGradeLevelGuardrail` | 1 | **Critical:** Grade 3 student gets Grade 3 missions |
| `TestGenerateDailyMissions` | 2 | Unit: LLM called with context, empty chunks fallback |
| `TestEndToEndMissionFlow` | 3 | E2E: fetch missions -> log results, all 4 pillars, mixed accuracy |

### `test_pillar_missions.py` -- Pillar-based Missions (Feature 3)

**Covers:** Pillar endpoint, all 4 pillars, validation, weakness tracking

| Test Class | Tests | Description |
|------------|-------|-------------|
| `TestGetPillarMissions` | 9 | `GET /missions/pillar` -- reading/writing/listening/speaking happy paths, invalid pillar 400, 404, correct_answer stripped, missing param 422, no auth 403 |
| `TestMissionGeneratorLLMBased` | 6 | Unit: 10 questions per pillar, writing emoji, listening format, speaking format, invalid pillar error, malformed JSON, wrong count, markdown code block extraction |

### `test_interactions.py` -- Interaction Logging (Feature 8)

**Covers:** `POST /interactions` endpoint

| Function | Description |
|----------|-------------|
| `test_log_mission_results_success` | Logs 2 results, verifies response (logged: 2, correct: 1, accuracy: 0.5) |
| `test_log_mission_results_empty_list` | Empty results list returns 400 |
| `test_log_mission_results_all_correct` | 5/5 correct returns accuracy 1.0 |
| `test_log_mission_results_no_token` | Missing auth returns 403 |
| `test_log_mission_results_time_spent_calculation` | Verifies time_spent from time_remaining |

### `test_student_update.py` -- Student Update

**Covers:** `PATCH /classroom/{id}/students/{student_id}`

| Test | Description |
|------|-------------|
| `test_update_student_success` | Updates name, roll_number, email |
| `test_update_student_partial` | Partial update (only roll_number) |
| `test_update_student_wrong_classroom` | Wrong teacher returns 403 |
| `test_update_student_no_fields` | Empty body returns 422 |

### `test_teacher_analytics.py` -- Teacher Analytics

**Covers:** `GET /evaluator/report/teacher`

| Test | Description |
|------|-------------|
| `test_teacher_analytics_returns_all_classrooms` | Returns all teacher's classrooms with student stats |
| `test_teacher_analytics_student_accuracy` | Accuracy correctly computed (2/3 = 67%) |
| `test_teacher_analytics_empty_classrooms` | Empty classrooms list for teacher with none |

### `test_topics.py` -- Topic Management

**Covers:** Topic listing, active topic selection

| Function | Description |
|----------|-------------|
| `test_get_topics_returns_list_for_valid_grade` | `GET /topics?grade_level=1` returns topic list |
| `test_get_topics_invalid_grade_raises_400` | Grade 9 (out of range) returns 400 |
| `test_get_active_topics_returns_all_when_no_selection` | No saved selections returns all topics for grade |
| `test_put_active_topics_replaces_selection` | PUT replaces old selections with new ones |

### `test_upload_history.py` -- Upload History

**Covers:** Upload logging and history retrieval

| Function | Description |
|----------|-------------|
| `test_upload_logs_to_snc_uploads` | Verifies `_log_upload()` inserts into `snc_uploads` table |
| `test_get_uploads_returns_teacher_history` | `GET /curriculum/uploads` returns rows for current teacher |

## Test Count Summary

| File | Test Count |
|------|-----------|
| `test_auth.py` | ~26 |
| `test_chat.py` | ~19 |
| `test_classroom.py` | ~10 |
| `test_evaluator.py` | ~9 |
| `test_ingestion.py` | ~9 |
| `test_knowledge_base.py` | ~7 |
| `test_missions.py` | ~17 |
| `test_pillar_missions.py` | ~15 |
| `test_interactions.py` | ~5 |
| `test_student_update.py` | ~4 |
| `test_teacher_analytics.py` | ~3 |
| `test_topics.py` | ~4 |
| `test_upload_history.py` | ~2 |
| **Total** | **~130** |
