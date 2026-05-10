# API Reference

Complete endpoint listing for the PrimePal API. All endpoints are prefixed with `/api/v1` unless otherwise noted.

The FastAPI backend auto-generates interactive API docs:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## Authentication Types

| Type | Mechanism | Used By |
|------|-----------|---------|
| **None** | No authentication required | Public endpoints |
| **Student JWT** | Custom PyJWT token in `Authorization: Bearer <token>`. Obtained via `/auth/student/login`. Stored in localStorage as `primepal_student_token`. | Student-facing endpoints |
| **Teacher (Supabase)** | Supabase GoTrue JWT in `Authorization: Bearer <token>`. Obtained via Supabase Auth email/password flow. | Teacher-facing endpoints |
| **Admin** | Same as Teacher auth, but the teacher record must have `role = "admin"` in the `teachers` table. | Admin-only endpoints |

---

## Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check. Returns 200 if backend is running. Not under `/api/v1` prefix. |

---

## Auth (`/api/v1/auth`)

Student visual login flow and teacher profile management.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/auth/classroom/{class_code}/avatars` | None | -- | `List[AvatarResponse]` | Fetch student roster (id, name, avatar) for a classroom's visual login grid. Case-insensitive class code lookup. |
| POST | `/auth/student/login` | None | `StudentLoginRequest` `{student_id, class_code, secret_pin}` | `TokenResponse` `{access_token, token_type}` | Validate student avatar selection + 4-digit PIN, issue signed JWT containing student_id and classroom_id. |
| PATCH | `/auth/student/profile` | Student JWT | `UpdateProfileRequest` `{avatar_style?, theme_color?}` | `UpdateProfileResponse` `{avatar_style, theme_color}` | Update authenticated student's avatar style and/or theme color. At least one field required. |
| PATCH | `/auth/student/{student_id}/pin` | Teacher | `ResetPinRequest` `{secret_pin}` | `ResetPinResponse` `{student_id, secret_pin}` | Teacher resets a student's 4-digit PIN. Verifies the student belongs to one of the teacher's classrooms. Requires `student:update` permission. |
| GET | `/auth/me` | Teacher | -- | `TeacherProfileResponse` `{id, email, full_name, role}` | Get the authenticated teacher's profile including role (teacher/admin). |

---

## Admin (`/api/v1/admin`)

All admin endpoints require admin-level authentication unless noted as public.

### Invite Codes

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/admin/invite-code` | Admin | `AdminInviteRequest` `{email, expires_in_days?}` | `{code, email, expires_at}` | Create an invite code for a new admin. Default expiry: 7 days. Logged in admin_audit_log. |
| POST | `/admin/validate-invite-code` | None | Query param: `code` | `{valid, email}` | Validate an invite code before signup. Public endpoint. |

### Teacher Management

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/admin/teachers` | None | `TeacherCreateRequest` `{email, full_name, password, invite_code}` | `{id, email, full_name, role}` | Create a new admin account via invite code. Public endpoint (protected by invite code). Creates Supabase Auth user + teachers row with role="admin". |
| GET | `/admin/teachers` | Admin | -- | `List[teacher]` | List all teachers. |
| PUT | `/admin/teachers/{teacher_id}` | Admin | `TeacherEditRequest` `{full_name?, email?}` | Updated teacher object | Edit teacher details. |
| DELETE | `/admin/teachers/{teacher_id}` | Admin | `TeacherDeleteRequest` `{reassign_classrooms_to}` | `{deleted, classrooms_reassigned}` | Delete a teacher and reassign all their classrooms to another teacher. |

### Classroom Management

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/admin/classrooms` | Admin | -- | `List[classroom]` | List all classrooms with joined teacher name. |
| POST | `/admin/classrooms` | Admin | `ClassroomCreateRequest` `{class_name, grade_level, teacher_id, section?}` | Created classroom object | Create a new classroom with auto-generated 6-char class code. |
| PUT | `/admin/classrooms/{classroom_id}` | Admin | `ClassroomEditRequest` `{class_name?, grade_level?, section?}` | Updated classroom object | Edit classroom details. |
| DELETE | `/admin/classrooms/{classroom_id}` | Admin | -- | `{deleted}` | Delete a classroom. Returns 409 if students still exist in it. |
| PUT | `/admin/classrooms/{classroom_id}/reassign` | Admin | `ClassroomReassignRequest` `{teacher_id}` | Updated classroom object | Reassign a classroom to a different teacher. |

### Student Management

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/admin/students` | Admin | Query: `q?`, `grade_level?`, `classroom_id?` | `List[student]` | List all students with optional search (name/roll number) and filters. |
| POST | `/admin/students` | Admin | `StudentCreateRequest` `{student_name, classroom_id, roll_number?, email?}` | Created student object | Create a single student with auto-generated 4-digit PIN. |
| PUT | `/admin/students/{student_id}` | Admin | `StudentEditRequest` `{student_name?, roll_number?, email?, classroom_id?}` | Updated student object | Edit student details. Changing classroom_id transfers the student. |
| DELETE | `/admin/students/{student_id}` | Admin | -- | `{deleted}` | Delete a student. |
| POST | `/admin/students/{student_id}/reset-pin` | Admin | -- | `{new_pin}` | Reset a student's PIN to a new random 4-digit code. |

### Curriculum Management

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/admin/curriculum` | Admin | -- | `List[chunk]` | List all curriculum chunks from snc_knowledge_base. |
| DELETE | `/admin/curriculum/{chunk_id}` | Admin | -- | `{deleted}` | Delete a curriculum chunk from the knowledge base. |
| POST | `/admin/curriculum/upload` | Admin | Form: `file` (PDF), `grade_level`, `book_title` | `{id, status, book_title, grade_level, filename, total_chunks, embedded_count}` | Upload a PDF textbook and run the full RAG pipeline (extract, chunk, embed). Creates snc_uploads record with status tracking. |
| GET | `/admin/curriculum/books` | Admin | -- | `List[upload]` | List all uploaded books from snc_uploads, ordered by grade then date. |
| GET | `/admin/curriculum/books/{book_id}/chunks` | Admin | Query: `page?`, `page_size?` | `{chunks, total, page, page_size, total_pages}` | Paginated chunk viewer for a specific book. |
| GET | `/admin/curriculum/books/{book_id}/status` | Admin | -- | `{id, status, error_message, total_chunks, updated_at}` | Poll upload/processing status for a specific book. |
| DELETE | `/admin/curriculum/books/{book_id}` | Admin | -- | `{deleted, book_title}` | Delete a book and all its chunks from the knowledge base. |

### Data Export

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/admin/export/students` | Admin | Query: `grade_level?`, `format?` (csv/json) | CSV download or JSON array | Export student roster with points, streak, classroom info. |
| GET | `/admin/export/interactions` | Admin | Query: `grade_level?`, `date_from?`, `date_to?`, `student_id?`, `pillar?`, `format?` | CSV download or JSON array | Export interaction logs. Limit: 50,000 rows. |
| GET | `/admin/export/missions` | Admin | Query: `grade_level?`, `date_from?`, `date_to?`, `student_id?`, `pillar?`, `format?` | CSV download or JSON array | Export mission completion history (mission_mc, mission_fill types). Limit: 50,000 rows. |
| GET | `/admin/export/evaluations` | Admin | Query: `grade_level?`, `evaluation_type?`, `student_id?`, `format?` | CSV download or JSON array | Export pre/post-test evaluation records. Returns empty if tables do not exist yet. |

---

## Classroom (`/api/v1/classroom`)

Classroom management, student roster, topic selection, and syllabus pacing calendar.

### Classroom CRUD

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/classroom/` | Teacher | `ClassroomCreate` `{grade_level, section, class_name?}` | `ClassroomResponse` | Create a classroom. Auto-generates memorable class code and 30-week syllabus. Validates no duplicate grade+section. Requires `classroom:create` permission. |
| GET | `/classroom/` | Teacher | -- | `List[ClassroomResponse]` | List teacher's classrooms (admin sees all), newest first. |
| GET | `/classroom/{classroom_id}` | Teacher | -- | `ClassroomDetail` (classroom + students) | Get classroom details plus full student roster including PINs. |
| PATCH | `/classroom/{classroom_id}` | Teacher | `ClassroomUpdate` `{class_name?}` | `ClassroomResponse` | Update classroom settings. Requires `classroom:update` permission. |
| DELETE | `/classroom/{classroom_id}` | Teacher | -- | 204 No Content | Delete a classroom. Must have 0 students. Requires `classroom:delete` permission. |

### Student Roster

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/classroom/{classroom_id}/students/bulk` | Teacher | `StudentBulkCreate` `{names: List[str]}` | `{added}` | Bulk-create student profiles with randomly assigned avatars. Names only. Requires `student:create` permission. |
| POST | `/classroom/{classroom_id}/students/bulk-v2` | Teacher | `StudentBulkCreateV2` `{students: List[{student_name, roll_number?, email?}]}` | `{added}` | Bulk-create student profiles with name, roll number, and email. Requires `student:create` permission. |
| DELETE | `/classroom/{classroom_id}/students/{student_id}` | Teacher | -- | 204 No Content | Remove a student. Requires `student:delete` permission. |
| PATCH | `/classroom/{classroom_id}/students/{student_id}` | Teacher | `StudentUpdate` `{student_name?, roll_number?, email?}` | `StudentResponse` | Update student identity fields. Requires `student:update` permission. |

### Active Topics

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/classroom/{classroom_id}/active-topics` | Teacher | -- | `List[SncTopicOut]` | Get active SNC topics for this classroom. If none saved, returns all topics for the grade (default all active). |
| PUT | `/classroom/{classroom_id}/active-topics` | Teacher | `ActiveTopicsUpdate` `{topic_ids: List[int]}` | `{active_count}` | Replace all active topic selections. Send empty array to reset to default. Requires `topic:select` permission. |
| GET | `/classroom/{classroom_id}/topics-by-skill` | Teacher | -- | `TopicsBySkillResponse` `{grade_level, skills: List[{skill, topics}]}` | Topics organized by LSRW skills for the classroom's grade with global active status. |

### Syllabus (Pacing Calendar)

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/classroom/{classroom_id}/syllabus` | Teacher | -- | `{weeks: List[SyllabusWeekResponse]}` | Get the 30-week pacing calendar for a classroom. |
| PATCH | `/classroom/{classroom_id}/syllabus/{week_number}` | Teacher | `UpdateWeekStatusRequest` `{status: "locked"|"active"|"completed"}` | `{ok}` | Update the status of a specific week. Requires `syllabus:update` permission. |

---

## Chat (`/api/v1/chat`)

Guardrailed bilingual AI tutor.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/chat` | Student JWT | `ChatRequest` `{message}` (1-1000 chars) | `ChatResponse` `{reply, english_reply, grade_level, context_used, translated_query}` | Send a message to the AI tutor. Grade level resolved server-side from classroom. Returns bilingual (Minglish) and pure English replies. Logs interaction in background. |
| POST | `/chat/stream` | Student JWT | `ChatRequest` `{message}` | SSE stream: `{type: "status"/"token"/"done", content?}` | Streaming version of chat. Returns Server-Sent Events with token-by-token output. |

---

## Missions (`/api/v1/missions`)

Gamified learning missions with adaptive difficulty.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/missions/daily` | Student JWT | Query: `is_frustrated?` (bool, default false) | `DailyMissionsResponse` `{grade_level, topic, questions}` | Generate 3 daily questions. Grade resolved from classroom. If is_frustrated=true, generates "Confidence Builder" questions. Cached 1h. `correct_answer` is stripped from response. |
| POST | `/missions/complete` | Student JWT | `CompleteRequest` `{question_correct, question_type?, task_type?, pillar?, points_value?, answer_data?, submitted_at?}` | `CompleteResponse` `{points_awarded, new_total, current_streak}` | Record answer, award points (10 per correct by default). Includes idempotency check via submitted_at timestamp. Updates streak. Checks achievements in background. |
| POST | `/missions/submit-batch` | Student JWT | `BatchSubmitRequest` `{answers: List[CompleteRequest]}` | `BatchSubmitResponse` `{processed, skipped, new_total}` | Batch-submit queued answers (for offline queue flush). Same idempotency logic as /complete. |
| GET | `/missions/me` | Student JWT | -- | `StudentProfileResponse` `{student_id, student_name, avatar_url, points, missions_completed, avatar_style, theme_color}` | Fetch student profile and cumulative points. Cached 5min. |
| GET | `/missions/pillar` | Student JWT | Query: `pillar` (required), `is_frustrated?` | `PillarMissionsResponse` `{pillar, active_topics_summary, questions, weakness_focus_questions}` | Generate 10 questions for a specific pillar (reading/writing/listening/speaking). Weighted by student weaknesses and teacher-configured topics. Cached 1h. |
| POST | `/missions/submit-speaking` | Student JWT | Form: `audio_file`, `expected_text`, `pillar?`, `attempt_number?` | `SpeakingSubmissionResponse` `{is_correct, similarity_score, transcription, points_awarded, new_total, status}` | Submit speaking answer via Whisper transcription. Compares transcript similarity. Status: "final", "retry" (garbled input, can retry), or "give_up" (max attempts reached). |
| GET | `/missions/performance` | Student JWT | -- | `PerformanceResponse` `{overall_accuracy, pillar_accuracy, weak_topics, strong_topics, difficulty_recommendation}` | Student performance profile for adaptive difficulty display. |
| GET | `/missions/leaderboard` | Student JWT | -- | `LeaderboardResponse` `{entries, current_student_rank, total_students}` | Class leaderboard ranked by points. Scoped to student's classroom. Cached 10min. |
| GET | `/missions/weekly-progress` | Student JWT | -- | `WeeklyProgressResponse` `{week_topic, pillars: List[{pillar, done, target, pct}]}` | Weekly 4-pillar progress tracking. Rolling 7-day window. Target: 10 per pillar. Cached 5min. |

---

## Curriculum (`/api/v1/curriculum`)

SNC document ingestion and RAG pipeline.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/curriculum/upload` | Teacher | Form: `file` (PDF only), `grade_level` (1-6), `book_title` | `{status, message, total_chunks, embedded_count, sample_chunk}` | Full pipeline: PDF upload, text extraction, chunking, embedding, and storage in pgvector. Also uploads raw PDF to Supabase Storage. Requires `curriculum:upload` permission. |
| POST | `/curriculum/embed` | Teacher | `EmbedRequest` `{chunks: List[{content, metadata}]}` | `{status, message, embedded_count}` | Standalone embedding: accepts pre-processed chunks and stores them. Requires `curriculum:upload` permission. |
| GET | `/curriculum/uploads` | Teacher | Query: `grade_level?` | `List[upload]` | Upload history for the current teacher, newest first. |

---

## Topics (`/api/v1/topics`)

SNC topic reference data and grade-level topic management.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/topics/` | None | Query: `grade_level` (required, 1-5) | `List[SncTopicOut]` | List all predefined SNC English topics for a grade level. Public reference data. |
| GET | `/topics/grade-selections/{grade_level}` | Teacher | -- | `GradeSelectionsResponse` `{grade_level, topics: List[{topic_id, topic_name, skill, is_active}]}` | List topics for a grade with their active/inactive status. Defaults to active if no selection exists. |
| PUT | `/topics/grade-selections/{grade_level}` | Teacher | `GradeSelectionsUpdate` `{selections: List[{topic_id, is_active}]}` | `GradeSelectionsResponse` | Bulk update active status for a grade's topics. Requires `topic:manage_grade` permission. |

---

## Evaluations (`/api/v1/evaluations`)

Pre/post-test evaluation system (isolated from gamification).

### Student Endpoints

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/evaluations/status` | Student JWT | -- | `EvaluationStatusOut` `{needs_pre_test, needs_post_test, pre_completed, post_completed}` | Check whether the student needs to take a pre- or post-test. |
| GET | `/evaluations/questions` | Student JWT | Query: `type` ("pre" or "post") | `List[question]` | Get ordered question set for the student's grade and evaluation type. `correct_answer` is excluded. |
| POST | `/evaluations/submit` | Student JWT | `SubmitBody` `{evaluation_type, answers: List[{question_id, student_answer, time_taken_ms?, likert_value?}]}` | `SubmitOut` `{total_questions, correct_count, completed}` | Submit all answers for an evaluation. Grades answers server-side. Updates evaluation_status. Returns 400 if already completed. |

### Admin Endpoints

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/evaluations/trigger-post-test` | Admin | `TriggerPostTestBody` `{scope: "global"|"grade"|"classroom", target_id?}` | `TriggerPostTestOut` `{students_unlocked}` | Unlock the post-test for students by scope. |
| GET | `/evaluations/results` | Admin | Query: `grade_level?`, `evaluation_type?`, `student_id?` | `ResultsOut` `{results: List[StudentResult]}` | Aggregated evaluation results: total, correct count, psychometric average per student per evaluation type. |

---

## Evaluator (`/api/v1/evaluator`)

Teacher analytics, NLP insight reports, and dashboard data.

### Student Reports

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/evaluator/report/student/{student_id}` | Teacher | -- | `StudentInsightReport` | AI-powered NLP insight report for a student (last 30 interactions). LLM-generated engagement level, strengths, areas for improvement, and teacher note. |
| GET | `/evaluator/report/student/{student_id}/detailed` | Teacher | Query: `date_from?`, `date_to?`, `pillar?` | `StudentDetailedReport` | Full student report: identity, per-pillar stats, daily scores, trend (improving/declining/stable), and AI narrative. |

### Classroom and Teacher Reports

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/evaluator/report/classroom/{classroom_id}` | Teacher | -- | `ClassroomReportResponse` `{classroom_id, grade_level, students}` | Summary roster: each student with total_interactions and mission_accuracy_pct. Pure DB aggregation (no LLM). |
| GET | `/evaluator/report/teacher` | Teacher | Query: `grade_level?` | `{classrooms: List[...]}` | All classrooms with per-student interaction stats. Used by global analytics page. |

### Dashboard Statistics

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/evaluator/dashboard-stats` | Teacher | Query: `grade_level?`, `pillar?` | `DashboardStatsResponse` `{total_students, total_interactions, avg_accuracy, active_this_week}` | Aggregate dashboard statistics. |
| GET | `/evaluator/skill-accuracy` | Teacher | Query: `grade_level?` | `SkillAccuracyResponse` `{reading, writing, listening, speaking, active_today}` | Per-skill accuracy breakdown and count of students active today. |
| GET | `/evaluator/students` | Teacher | Query: `grade_level?`, `pillar?`, `search?` | `StudentsListResponse` `{students, total_count}` | All students across teacher's classrooms with aggregated stats: points, interactions, accuracy, active_this_week. |

### Grade-Level Analytics

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/evaluator/report/grade/{grade_level}` | Teacher | Query: `date_from?`, `date_to?` | `GradeReportResponse` | Grade-wise aggregate report with per-pillar accuracy, quartiles, proficiency distribution, and AI-generated summary. |
| GET | `/evaluator/report/grade/{grade_level}/csv` | Teacher | -- | CSV download | Export grade-level student performance as CSV with per-pillar accuracy. |
| GET | `/evaluator/grade-overview/{grade_level}` | Teacher | -- | `GradeOverviewResponse` | Grade overview with active/idle student counts, per-pillar accuracy, weak/strong pillars, and idle student list (no activity in 48h). |
| GET | `/evaluator/weekly-trend/{grade_level}` | Teacher | Query: `pillar?`, `weeks?` (1-12, default 4) | `WeeklyTrendResponse` | Weekly accuracy trend data points with week labels, accuracy %, and interaction counts. |

### Teacher AI Assistant

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/evaluator/teacher-assistant/daily-plan` | Teacher | `DailyPlanRequest` `{grade_level}` | `TeacherDailyPlan` `{summary, focus_areas, suggested_activities, student_groups, snc_references, generated_at}` | AI-generated daily teaching plan using student performance data + SNC curriculum RAG. Cached 6h per teacher per grade per day. |

---

## Interactions (`/api/v1/interactions`)

Student interaction logging for analytics.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/interactions` | Student JWT | `LogInteractionsRequest` `{pillar, results: List[{question_id, is_correct, time_remaining}]}` | `LogInteractionsResponse` `{logged_interactions, correct_count, accuracy, pillar, is_frustrated, frustration_reason}` | Log game results to student_interactions table. Includes frustration detection: triggers if 3 consecutive wrong answers or avg time > 12s. |

---

## Announcements (`/api/v1/announcements`)

Bilingual announcement board with scope support.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/announcements` | Teacher | `AnnouncementCreate` `{message_en, scope, classroom_id?, target_grade_level?}` | `AnnouncementResponse` (201) | Create bilingual announcement. English text auto-translated to Urdu via GPT-4o-mini. Scopes: "classroom" (requires classroom_id), "grade_level" (requires target_grade_level 1-5), "school_wide". |
| GET | `/announcements` | Teacher | -- | `AnnouncementsList` `{announcements, total_count}` | List all announcements by the teacher (active and inactive), newest first. |
| GET | `/announcements/classroom/{classroom_id}` | Teacher | -- | `AnnouncementsList` | Announcements for a specific classroom including grade-level and school-wide ones. Teacher must own the classroom. |
| GET | `/announcements/active/{classroom_id}` | None | -- | `AnnouncementResponse` or `null` | Latest active announcement for a student's classroom. Public endpoint for student dashboard. |
| PATCH | `/announcements/{announcement_id}` | Teacher | `AnnouncementUpdate` `{is_active}` | `AnnouncementResponse` | Toggle announcement active/inactive status. Only the creator can update. |

---

## Achievements (`/api/v1/achievements`)

Badge and achievement system.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/achievements/all` | None | -- | `AllAchievementsResponse` `{achievements}` | List all achievement definitions (no auth required). |
| GET | `/achievements/me` | Student JWT | -- | `AchievementListResponse` `{achievements}` | Student's achievements with current progress and unlock status. |
| POST | `/achievements/check` | Student JWT | `CheckRequest` `{student_id}` | `CheckResponse` `{new_achievements}` | Check and unlock newly earned achievements. Student can only check their own. |

---

## Rewards (`/api/v1/rewards`)

Daily reward chest and scoring visibility.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| POST | `/rewards/claim-daily` | Student JWT | -- | `DailyRewardResponse` `{reward_type, amount, new_total, message, new_achievements}` | Claim daily reward. Server-side anti-cheat (UTC day check). Rewards: 70% +25 stars, 20% +50 stars, 10% 2x multiplier. Returns 400 if already claimed today. |
| GET | `/rewards/status` | Student JWT | -- | `RewardStatusResponse` `{has_claimed_today, last_claimed_at}` | Check if daily reward has been claimed today. |
| GET | `/rewards/daily-summary` | Student JWT | -- | `DailySummaryResponse` `{today_points, total_points, missions_today}` | Daily score summary. Cached 2min. |
| GET | `/rewards/streak` | Student JWT | -- | `StreakResponse` `{current_streak, longest_streak, last_activity_date}` | Current and longest streak (consecutive days with activity). |

---

## Spelling Bee (`/api/v1/spelling-bee`)

Word spelling practice.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/spelling-bee/words` | Student JWT | -- | `SpellingWordsResponse` `{words: List[{word, emoji}], topic, week_number}` | Generate 10 spelling words from the active week's syllabus topic via LLM. |
| POST | `/spelling-bee/submit` | Student JWT | `SpellingSubmitRequest` `{word, student_spelling, correct, attempt_number}` | `SpellingSubmitResponse` `{points_awarded, new_total}` | Record spelling attempt. Points: 10 (1st attempt correct), 5 (2nd attempt correct), 0 (incorrect). Updates streak. |

---

## Story Time (`/api/v1/story-time`)

Reading comprehension stories.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/story-time/story` | Student JWT | -- | `StoryResponse` `{story_title, story_text, topic, week_number, questions: List[{id, question, options, correct_index}]}` | Generate a short story (4-6 sentences) and 3 comprehension questions based on the active week's topic via LLM. |
| POST | `/story-time/answer` | Student JWT | `AnswerRequest` `{question_id, selected_index, correct}` | `AnswerResponse` `{points_awarded, new_total}` | Record comprehension answer. 10 points per correct answer. Logged with pillar="reading". |

---

## Speaking (`/api/v1/speaking`)

Voice-based speaking practice with pronunciation feedback.

| Method | Path | Auth | Request Body | Response | Description |
|--------|------|------|-------------|----------|-------------|
| GET | `/speaking/prompts` | Student JWT | -- | `PromptsResponse` `{prompts: List[{id, prompt, hint}], topic, week_number}` | Generate 3 speaking prompts for the active week topic via LLM. |
| POST | `/speaking/evaluate` | Student JWT | `EvaluateRequest` `{prompt_id, prompt_text, transcript, attempt_number?}` | `EvaluateFeedback` `{score, feedback, points_awarded, new_total, status}` | Evaluate spoken response transcript. Score 0-2 mapped to 0/5/10 points. Includes garbled input detection with retry/give_up status. |
| POST | `/speaking/evaluate-pro` | Student JWT | Form: `audio_file` (upload), `prompt_id`, `prompt_text`, `attempt_number?` | `EvaluatePronunciationFeedback` `{score, feedback, pronunciation_score, pronunciation_data, points_awarded, new_total, status, noise_flagged}` | Word-level pronunciation evaluation via Whisper with detailed per-word assessment (correct/incorrect/omitted). |

---

## Endpoint Count Summary

| Domain | Endpoint Count |
|--------|---------------|
| Health | 1 |
| Auth | 5 |
| Admin | 28 |
| Classroom | 14 |
| Chat | 2 |
| Missions | 10 |
| Curriculum | 3 |
| Topics | 3 |
| Evaluations | 5 |
| Evaluator | 13 |
| Interactions | 1 |
| Announcements | 5 |
| Achievements | 3 |
| Rewards | 4 |
| Spelling Bee | 2 |
| Story Time | 2 |
| Speaking | 3 |
| **Total** | **104** |
