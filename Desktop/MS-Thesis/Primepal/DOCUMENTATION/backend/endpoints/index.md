# Backend API Endpoints Reference

All endpoints are mounted under `/api/v1` via `router.py`. The admin module defines its own `/admin` prefix internally.

## Router Prefixes

| Module         | Prefix           | Tags             |
|----------------|------------------|------------------|
| achievements   | `/achievements`  | achievements     |
| admin          | `/admin`         | admin            |
| announcements  | `/announcements` | announcements    |
| auth           | `/auth`          | auth             |
| classroom      | `/classroom`     | classroom        |
| curriculum     | `/curriculum`    | curriculum       |
| chat           | `/chat`          | chat             |
| topics         | `/topics`        | topics           |
| evaluations    | `/evaluations`   | evaluations      |
| evaluator      | `/evaluator`     | evaluator        |
| missions       | `/missions`      | missions         |
| rewards        | `/rewards`       | rewards          |
| interactions   | `/interactions`  | interactions     |
| spelling_bee   | `/spelling-bee`  | spelling-bee     |
| story_time     | `/story-time`    | story-time       |
| speaking       | `/speaking`      | speaking         |

Note: The `admin` router has `prefix="/admin"` set on the router itself (not in `include_router`), so its full prefix is `/api/v1/admin`.

## Complete Endpoint Table

| Module | Method | Path | Auth | Description |
|--------|--------|------|------|-------------|
| auth | GET | `/api/v1/auth/classroom/{class_code}/avatars` | None | Fetch avatar roster for student login |
| auth | POST | `/api/v1/auth/student/login` | None | Student avatar+PIN login, issue JWT |
| auth | PATCH | `/api/v1/auth/student/profile` | Student JWT | Update avatar style and theme color |
| auth | PATCH | `/api/v1/auth/student/{student_id}/pin` | Teacher GoTrue | Teacher resets student PIN |
| auth | GET | `/api/v1/auth/me` | Teacher GoTrue | Get current teacher profile with role |
| classroom | POST | `/api/v1/classroom/` | Teacher GoTrue | Create classroom |
| classroom | GET | `/api/v1/classroom/` | Teacher GoTrue | List teacher's classrooms |
| classroom | GET | `/api/v1/classroom/{classroom_id}` | Teacher GoTrue | Get classroom + student roster |
| classroom | DELETE | `/api/v1/classroom/{classroom_id}` | Teacher GoTrue | Delete classroom (must be empty) |
| classroom | PATCH | `/api/v1/classroom/{classroom_id}` | Teacher GoTrue | Update classroom settings |
| classroom | POST | `/api/v1/classroom/{classroom_id}/students/bulk` | Teacher GoTrue | Bulk-add students (names only) |
| classroom | POST | `/api/v1/classroom/{classroom_id}/students/bulk-v2` | Teacher GoTrue | Bulk-add students (name+roll+email) |
| classroom | DELETE | `/api/v1/classroom/{classroom_id}/students/{student_id}` | Teacher GoTrue | Remove student |
| classroom | PATCH | `/api/v1/classroom/{classroom_id}/students/{student_id}` | Teacher GoTrue | Update student fields |
| classroom | GET | `/api/v1/classroom/{classroom_id}/active-topics` | Teacher GoTrue | Get active SNC topics |
| classroom | PUT | `/api/v1/classroom/{classroom_id}/active-topics` | Teacher GoTrue | Replace active topic selections |
| classroom | GET | `/api/v1/classroom/{classroom_id}/topics-by-skill` | Teacher GoTrue | Topics grouped by LSRW skill |
| classroom | GET | `/api/v1/classroom/{classroom_id}/syllabus` | Teacher GoTrue | 30-week pacing calendar |
| classroom | PATCH | `/api/v1/classroom/{classroom_id}/syllabus/{week_number}` | Teacher GoTrue | Update week status |
| missions | GET | `/api/v1/missions/daily` | Student JWT | Generate 3 daily mission questions |
| missions | POST | `/api/v1/missions/complete` | Student JWT | Record answer, award points |
| missions | POST | `/api/v1/missions/submit-batch` | Student JWT | Batch-submit queued answers |
| missions | GET | `/api/v1/missions/me` | Student JWT | Student profile + points |
| missions | GET | `/api/v1/missions/pillar` | Student JWT | 10 pillar-specific questions |
| missions | POST | `/api/v1/missions/submit-speaking` | Student JWT | Submit speaking answer (audio) |
| missions | GET | `/api/v1/missions/performance` | Student JWT | Student performance profile |
| missions | GET | `/api/v1/missions/leaderboard` | Student JWT | Class leaderboard by points |
| missions | GET | `/api/v1/missions/weekly-progress` | Student JWT | Weekly 4-pillar progress |
| chat | POST | `/api/v1/chat` | Student JWT | Guardrailed bilingual chat |
| chat | POST | `/api/v1/chat/stream` | Student JWT | Streaming bilingual chat (SSE) |
| curriculum | POST | `/api/v1/curriculum/upload` | Teacher GoTrue | Upload PDF, run RAG pipeline |
| curriculum | POST | `/api/v1/curriculum/embed` | Teacher GoTrue | Embed pre-processed chunks |
| curriculum | GET | `/api/v1/curriculum/uploads` | Teacher GoTrue | Upload history for teacher |
| speaking | GET | `/api/v1/speaking/prompts` | Student JWT | Generate 3 speaking prompts |
| speaking | POST | `/api/v1/speaking/evaluate` | Student JWT | Evaluate spoken response |
| speaking | POST | `/api/v1/speaking/evaluate-pro` | Student JWT | Word-level pronunciation eval |
| spelling_bee | GET | `/api/v1/spelling-bee/words` | Student JWT | Generate 10 spelling words |
| spelling_bee | POST | `/api/v1/spelling-bee/submit` | Student JWT | Record spelling attempt |
| story_time | GET | `/api/v1/story-time/story` | Student JWT | Generate story + 3 questions |
| story_time | POST | `/api/v1/story-time/answer` | Student JWT | Record comprehension answer |
| evaluator | GET | `/api/v1/evaluator/report/student/{student_id}` | Teacher GoTrue | NLP insight report for student |
| evaluator | GET | `/api/v1/evaluator/report/student/{student_id}/detailed` | Teacher GoTrue | Full pillar stats + AI insights |
| evaluator | GET | `/api/v1/evaluator/report/classroom/{classroom_id}` | Teacher GoTrue | Classroom interaction summary |
| evaluator | GET | `/api/v1/evaluator/report/teacher` | Teacher GoTrue | Global teacher analytics |
| evaluator | GET | `/api/v1/evaluator/dashboard-stats` | Teacher GoTrue | Dashboard aggregate stats |
| evaluator | GET | `/api/v1/evaluator/skill-accuracy` | Teacher GoTrue | Per-pillar accuracy breakdown |
| evaluator | GET | `/api/v1/evaluator/students` | Teacher GoTrue | All students with stats |
| evaluator | GET | `/api/v1/evaluator/report/grade/{grade_level}` | Teacher GoTrue | Grade-wise aggregate report |
| evaluator | GET | `/api/v1/evaluator/report/grade/{grade_level}/csv` | Teacher GoTrue | CSV export of grade data |
| evaluator | GET | `/api/v1/evaluator/grade-overview/{grade_level}` | Teacher GoTrue | Grade overview with idle detection |
| evaluator | GET | `/api/v1/evaluator/weekly-trend/{grade_level}` | Teacher GoTrue | Weekly accuracy trend |
| evaluator | POST | `/api/v1/evaluator/teacher-assistant/daily-plan` | Teacher GoTrue | AI daily teaching plan |
| evaluations | GET | `/api/v1/evaluations/status` | Student JWT | Pre/post-test status |
| evaluations | GET | `/api/v1/evaluations/questions` | Student JWT | Evaluation question set |
| evaluations | POST | `/api/v1/evaluations/submit` | Student JWT | Submit evaluation answers |
| evaluations | POST | `/api/v1/evaluations/trigger-post-test` | Admin GoTrue | Unlock post-test for students |
| evaluations | GET | `/api/v1/evaluations/results` | Admin GoTrue | Aggregated evaluation results |
| interactions | POST | `/api/v1/interactions` | Student JWT | Log game results batch |
| rewards | POST | `/api/v1/rewards/claim-daily` | Student JWT | Claim daily reward chest |
| rewards | GET | `/api/v1/rewards/status` | Student JWT | Check daily reward status |
| rewards | GET | `/api/v1/rewards/daily-summary` | Student JWT | Today's score summary |
| rewards | GET | `/api/v1/rewards/streak` | Student JWT | Current and longest streak |
| topics | GET | `/api/v1/topics/` | None | List SNC topics for a grade |
| topics | GET | `/api/v1/topics/grade-selections/{grade_level}` | Teacher GoTrue | Topics with active status |
| topics | PUT | `/api/v1/topics/grade-selections/{grade_level}` | Teacher GoTrue | Bulk update topic selections |
| announcements | POST | `/api/v1/announcements` | Teacher GoTrue | Create bilingual announcement |
| announcements | GET | `/api/v1/announcements` | Teacher GoTrue | List teacher's announcements |
| announcements | GET | `/api/v1/announcements/classroom/{classroom_id}` | Teacher GoTrue | Classroom announcements |
| announcements | GET | `/api/v1/announcements/active/{classroom_id}` | None | Latest active announcement |
| announcements | PATCH | `/api/v1/announcements/{announcement_id}` | Teacher GoTrue | Toggle announcement active status |
| achievements | GET | `/api/v1/achievements/all` | None | List all achievement definitions |
| achievements | GET | `/api/v1/achievements/me` | Student JWT | Student achievements with progress |
| achievements | POST | `/api/v1/achievements/check` | Student JWT | Check and unlock achievements |
| admin | POST | `/api/v1/admin/invite-code` | Admin GoTrue | Create admin invite code |
| admin | POST | `/api/v1/admin/validate-invite-code` | None | Validate invite code |
| admin | POST | `/api/v1/admin/teachers` | None | Create teacher via invite code |
| admin | PUT | `/api/v1/admin/teachers/{teacher_id}` | Admin GoTrue | Edit teacher details |
| admin | DELETE | `/api/v1/admin/teachers/{teacher_id}` | Admin GoTrue | Delete teacher, reassign classrooms |
| admin | GET | `/api/v1/admin/teachers` | Admin GoTrue | List all teachers |
| admin | PUT | `/api/v1/admin/classrooms/{classroom_id}/reassign` | Admin GoTrue | Reassign classroom to teacher |
| admin | GET | `/api/v1/admin/classrooms` | Admin GoTrue | List all classrooms |
| admin | POST | `/api/v1/admin/classrooms` | Admin GoTrue | Create classroom (admin) |
| admin | PUT | `/api/v1/admin/classrooms/{classroom_id}` | Admin GoTrue | Edit classroom |
| admin | DELETE | `/api/v1/admin/classrooms/{classroom_id}` | Admin GoTrue | Delete classroom |
| admin | DELETE | `/api/v1/admin/curriculum/{chunk_id}` | Admin GoTrue | Delete curriculum chunk |
| admin | GET | `/api/v1/admin/curriculum` | Admin GoTrue | List all curriculum chunks |
| admin | POST | `/api/v1/admin/curriculum/upload` | Admin GoTrue | Upload PDF + RAG pipeline |
| admin | GET | `/api/v1/admin/curriculum/books` | Admin GoTrue | List uploaded books |
| admin | GET | `/api/v1/admin/curriculum/books/{book_id}/chunks` | Admin GoTrue | Paginated chunk viewer |
| admin | DELETE | `/api/v1/admin/curriculum/books/{book_id}` | Admin GoTrue | Delete book + all chunks |
| admin | GET | `/api/v1/admin/curriculum/books/{book_id}/status` | Admin GoTrue | Poll upload status |
| admin | GET | `/api/v1/admin/students` | Admin GoTrue | List all students |
| admin | POST | `/api/v1/admin/students` | Admin GoTrue | Create single student |
| admin | PUT | `/api/v1/admin/students/{student_id}` | Admin GoTrue | Edit student |
| admin | DELETE | `/api/v1/admin/students/{student_id}` | Admin GoTrue | Delete student |
| admin | POST | `/api/v1/admin/students/{student_id}/reset-pin` | Admin GoTrue | Reset student PIN |
| admin | GET | `/api/v1/admin/export/students` | Admin GoTrue | Export student roster CSV/JSON |
| admin | GET | `/api/v1/admin/export/interactions` | Admin GoTrue | Export interaction logs CSV/JSON |
| admin | GET | `/api/v1/admin/export/missions` | Admin GoTrue | Export mission history CSV/JSON |
| admin | GET | `/api/v1/admin/export/evaluations` | Admin GoTrue | Export evaluation records CSV/JSON |

## Detailed Endpoint Documentation

Each endpoint module has its own detailed documentation file:

| Module | File |
|--------|------|
| achievements | [achievements.md](achievements.md) |
| admin | [admin.md](admin.md) |
| announcements | [announcements.md](announcements.md) |
| auth | [auth.md](auth.md) |
| chat | [chat.md](chat.md) |
| classroom | [classroom.md](classroom.md) |
| curriculum | [curriculum.md](curriculum.md) |
| evaluations | [evaluations.md](evaluations.md) |
| evaluator | [evaluator.md](evaluator.md) |
| interactions | [interactions.md](interactions.md) |
| missions | [missions.md](missions.md) |
| rewards | [rewards.md](rewards.md) |
| speaking | [speaking.md](speaking.md) |
| spelling_bee | [spelling_bee.md](spelling_bee.md) |
| story_time | [story_time.md](story_time.md) |
| topics | [topics.md](topics.md) |

Note: A `tutor.py` file exists in the endpoints directory but contains only unimplemented stubs (`raise NotImplementedError`). It is not wired into the router and is considered dead code.

## Auth Types

- **None**: Public endpoint, no authentication required.
- **Student JWT**: Custom PyJWT token from `/auth/student/login`. Sent as `Authorization: Bearer <token>`. Decoded by `get_current_student`.
- **Teacher GoTrue**: Supabase GoTrue session token. Decoded by `get_current_teacher`.
- **Admin GoTrue**: Supabase GoTrue session token with `role=admin` in the `teachers` table. Decoded by `get_current_admin`.
