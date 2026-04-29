# Backend Endpoints

All endpoints are mounted under `/api/v1` via `router.py`. Each module is a FastAPI `APIRouter`.

## Endpoint Modules

| Module | Prefix | Auth | Description |
|--------|--------|------|-------------|
| [auth.md](auth.md) | `/auth` | Mixed | Student login (class code + avatar + PIN), avatar listing |
| [classroom.md](classroom.md) | `/classroom` | Teacher | CRUD classrooms, manage student roster, syllabus, active topics |
| [curriculum.md](curriculum.md) | `/curriculum` | Teacher | PDF upload, chunking, embedding pipeline |
| [chat.md](chat.md) | `/chat` | Student | Bilingual RAG-powered chatbot |
| [missions.md](missions.md) | `/missions` | Student | Daily + pillar missions, submission + scoring |
| [spelling_bee.md](spelling_bee.md) | `/spelling-bee` | Student | Word generation, answer evaluation, TTS |
| [story_time.md](story_time.md) | `/story-time` | Student | AI story generation, comprehension questions |
| [speaking.md](speaking.md) | `/speaking` | Student | Prompts, SpeechRecognition eval, Whisper eval |
| [rewards.md](rewards.md) | `/rewards` | Student | Daily chest, reward claiming |
| [evaluator.md](evaluator.md) | `/evaluator` | Teacher | Student/classroom/teacher reports |
| [interactions.md](interactions.md) | `/interactions` | Student | Log student-AI interactions |
| [announcements.md](announcements.md) | `/announcements` | Mixed | Teacher CRUD + student-facing active announcements |
| [topics.md](topics.md) | `/topics` | None | SNC topic listing by grade |
| [admin.md](admin.md) | `/admin` | Admin | Teacher management, invite codes, hierarchy, curriculum audit |

## Router Wiring (router.py)

All routers are included in `api/v1/router.py`. The admin router defines its own `/admin` prefix internally; all others receive their prefix from `router.py`.

## Common Patterns

- Teacher endpoints use `get_current_teacher()` dependency (Supabase GoTrue JWT)
- Student endpoints use `get_current_student()` dependency (custom PyJWT)
- Admin endpoints validate teacher role + admin flag
- LLM-calling endpoints use Redis cache to avoid redundant OpenAI calls
- Points-awarding endpoints follow read-modify-write pattern on `students.points`
