# Data Flow & Request Lifecycles

This document traces the component chain for every major request type in PrimePal.

---

## 1. Curriculum Upload (Teacher)

Full pipeline: PDF -> extract -> chunk -> embed -> store in pgvector.

```mermaid
sequenceDiagram
    participant T as Teacher Frontend
    participant E as POST /curriculum/upload
    participant I as ingestion.py
    participant EM as embedder.py
    participant ST as Supabase Storage
    participant PG as pgvector (snc_knowledge_base)

    T->>E: multipart/form-data {file.pdf, grade_level, book_title}
    E->>E: Validate (.pdf only, grade 1-6)
    E->>E: Write to temp file (PyPDFLoader reads from disk)
    E->>ST: Upload raw PDF to snc-textbooks/{grade}/{filename} (non-fatal)
    E->>E: PyPDFLoader(tmp_path).load()
    E->>I: chunk_documents(documents, grade_level, book_title)
    I->>I: RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
    I->>I: clean_snc_text() per chunk
    I->>I: Tag metadata {grade_level, book_title, chunk_id}
    I-->>E: list[{content, metadata}]
    E->>E: Delete temp file (finally block)
    E->>EM: embed_and_store_chunks(chunks, supabase_admin)
    EM->>EM: HuggingFaceEmbeddings.aembed_documents(texts)
    EM->>PG: INSERT INTO snc_knowledge_base {content, metadata, embedding}
    EM-->>E: embedded_count
    E->>E: _log_upload() -> snc_uploads table (non-fatal)
    E-->>T: {status, total_chunks, embedded_count, sample_chunk}
```

**Key files**: `backend/app/api/v1/endpoints/curriculum.py`, `backend/app/agents/curriculum_agent/ingestion.py`, `backend/app/agents/curriculum_agent/embedder.py`

**Also**: `POST /curriculum/embed` -- standalone endpoint for re-embedding pre-processed chunks without PDF upload.

**Also**: `GET /curriculum/uploads` -- returns upload history for the current teacher, optionally filtered by grade_level.

---

## 2. Bilingual Chat (Student)

RAG pipeline: translate -> embed -> retrieve -> generate bilingual response.

```mermaid
sequenceDiagram
    participant S as Student Frontend
    participant C as POST /chat
    participant CB as chatbot.py
    participant OAI as OpenAI API
    participant PG as pgvector
    participant LOG as interaction_logger.py

    S->>C: {message: "Noun kya hota hai?"} + Student JWT
    C->>C: Resolve grade_level from JWT.classroom_id -> classrooms table
    C->>CB: translate_to_english(message)
    CB->>OAI: gpt-4o-mini (temperature=0, translate Roman Urdu -> English)
    CB-->>C: "What is a noun?"
    C->>CB: retrieve_grade_filtered_chunks(translated_query, grade_level)
    CB->>CB: HuggingFaceEmbeddings.aembed_query(query)
    CB->>PG: RPC match_snc_documents(embedding, grade_level_filter, match_count=5)
    PG-->>CB: [SNC content chunks] (grade-filtered before vector math)
    CB-->>C: context_chunks
    C->>CB: get_guardrailed_response(original, translated, grade, chunks)
    CB->>OAI: gpt-4o-mini with_structured_output(TutorResponse)
    CB-->>C: TutorResponse {bilingual_reply, english_reply}
    C->>LOG: BackgroundTask: log_interaction(type="chat", context_used=bool)
    C-->>S: {reply, english_reply, grade_level, context_used, translated_query}
```

**Streaming variant**: `POST /chat/stream` returns SSE events:
- `{"type": "status", "content": "Thinking..."}`
- `{"type": "token", "content": "<token>"}` (repeated)
- `{"type": "done"}`

Uses `stream_guardrailed_response()` and logs interaction via `asyncio.to_thread()` after stream completes.

**Key files**: `backend/app/api/v1/endpoints/chat.py`, `backend/app/agents/tutor_agent/chatbot.py`

---

## 3. Mission Generation (Student)

### Daily Missions (3 questions)

```mermaid
sequenceDiagram
    participant S as Student
    participant M as GET /missions/daily
    participant CB as chatbot.py
    participant MG as mission_generator.py
    participant PG as pgvector
    participant OAI as OpenAI

    S->>M: Student JWT
    M->>M: Resolve grade_level from JWT -> classrooms
    M->>M: Fetch active_topics from classroom_active_topics
    M->>M: Check frustration state (consecutive wrong answers)
    M->>CB: retrieve_grade_filtered_chunks(topic, grade_level)
    CB->>PG: match_snc_documents RPC
    PG-->>CB: context_chunks
    M->>MG: generate_daily_missions(grade, chunks, topics, is_frustrated)
    MG->>OAI: gpt-4o-mini with_structured_output(DailyMissions)
    MG-->>M: DailyMissions {topic, questions[3]}
    M->>M: Strip correct_answer from response (MissionQuestionOut model)
    M-->>S: {topic, questions} (answers structurally absent)
```

### Pillar Missions (10 questions)

```mermaid
sequenceDiagram
    participant S as Student
    participant M as GET /missions?pillar=reading
    participant MG as mission_generator.py
    participant OAI as OpenAI
    participant DB as Supabase

    S->>M: Student JWT + pillar query param
    M->>M: Resolve grade_level, fetch active_topics
    M->>DB: Fetch student_weaknesses from student_interactions (score < 60%, limit 5)
    M->>M: Build performance_profile (overall accuracy, pillar accuracy, weak/strong topics)
    M->>MG: generate_pillar_missions(pillar, grade, topics, student_id, weaknesses, profile)
    MG->>OAI: gpt-4o-mini with_structured_output(PillarMissions), timeout=60s
    MG-->>M: list[dict] (10 questions, normalized and validated)
    M->>M: Strip correct_answer before response
    M-->>S: {pillar, current_week_topic, questions[10], weakness_focus_questions}
```

**Key files**: `backend/app/api/v1/endpoints/missions.py`, `backend/app/agents/tutor_agent/mission_generator.py`

---

## 4. Mission Completion & Points

```mermaid
sequenceDiagram
    participant S as Student
    participant M as POST /missions/complete
    participant DB as Supabase
    participant LOG as interaction_logger.py

    S->>M: {question_correct: true} + Student JWT
    M->>DB: SELECT points FROM students WHERE id = ?
    M->>M: Award 10 pts if correct, 0 if not
    M->>DB: UPDATE students SET points = new_total
    M->>LOG: BackgroundTask: log_interaction(type="mission_mc", correct=bool)
    M-->>S: {points_awarded, new_total}
```

### Batch Interaction Logging (Pillar Games)

```mermaid
sequenceDiagram
    participant S as Student
    participant I as POST /interactions
    participant DB as Supabase

    S->>I: {student_id, classroom_id, pillar, results: [{question_id, is_correct, time_remaining}...]}
    I->>I: For each result: time_spent = 15 - time_remaining
    I->>DB: INSERT INTO student_interactions (one row per question)
    I-->>S: {logged_interactions, correct_count, accuracy}
```

**Key files**: `backend/app/api/v1/endpoints/missions.py`, `backend/app/api/v1/endpoints/interactions.py`

---

## 5. Spelling Bee (Student)

```mermaid
sequenceDiagram
    participant S as Student
    participant SB as GET /spelling-bee/words
    participant SUB as POST /spelling-bee/submit
    participant OAI as OpenAI
    participant DB as Supabase

    S->>SB: Student JWT
    SB->>DB: Fetch classroom grade_level
    SB->>DB: Fetch active topic from classroom_syllabus (status="active")
    Note right of SB: Fallback: classroom_active_topics -> snc_topics
    SB->>OAI: gpt-4o-mini: generate 10 words + emojis for topic/grade
    SB-->>S: {words: [{word, emoji}...10], topic, week_number}

    S->>SUB: {word, student_spelling, correct, attempt_number}
    SUB->>SUB: Points: 10 (1st attempt correct), 5 (2nd attempt correct), 0 (wrong)
    SUB->>DB: UPDATE students.points += points
    SUB->>DB: INSERT student_interactions (type="spelling_bee", score=points)
    SUB->>SUB: update_streak(student_id)
    SUB-->>S: {points_awarded, new_total}
```

**Key file**: `backend/app/api/v1/endpoints/spelling_bee.py`

---

## 6. Story Time (Student)

```mermaid
sequenceDiagram
    participant S as Student
    participant ST as GET /story-time/story
    participant ANS as POST /story-time/answer
    participant OAI as OpenAI
    participant DB as Supabase

    S->>ST: Student JWT
    ST->>DB: Fetch grade_level + active week topic from classroom_syllabus
    ST->>OAI: gpt-4o-mini: generate story (4-6 sentences) + 3 MCQ questions (4 options each)
    ST-->>S: {story_title, story_text, topic, week_number, questions[3]}

    S->>ANS: {question_id, selected_index, correct}
    ANS->>DB: UPDATE students.points (+10 if correct, 0 if wrong)
    ANS->>DB: INSERT student_interactions (type="story_time", pillar="reading")
    ANS-->>S: {points_awarded, new_total}
```

**Key file**: `backend/app/api/v1/endpoints/story_time.py`

---

## 7. Speaking Practice (Student)

### Basic Evaluation (Text Transcript)

```mermaid
sequenceDiagram
    participant S as Student
    participant SP as GET /speaking/prompts
    participant SE as POST /speaking/evaluate
    participant OAI as OpenAI
    participant DB as Supabase

    S->>SP: Student JWT
    SP->>DB: Fetch grade_level + active week topic
    SP->>OAI: gpt-4o-mini: generate 3 speaking prompts with hints
    SP-->>S: {prompts[3], topic, week_number}

    S->>SE: {prompt_id, prompt_text, transcript, attempt_number}
    SE->>SE: Garbled input detection (SequenceMatcher, threshold=0.30, min_chars=3)
    alt Garbled/Empty (attempt < 3)
        SE-->>S: {score: -1, status: "retry", feedback: "Let's try again!"}
    else Garbled/Empty (attempt >= MAX_ATTEMPTS=3)
        SE-->>S: {score: 0, status: "give_up"}
    else Valid Input
        SE->>OAI: gpt-4o-mini: evaluate (score 0-2, encouraging feedback)
        SE->>DB: UPDATE students.points (0=0pts, 1=5pts, 2=10pts)
        SE->>DB: INSERT student_interactions (pillar="speaking")
        SE->>SE: update_streak(student_id)
        SE-->>S: {score, feedback, points_awarded, new_total, status: "final"}
    end
```

### Pro Evaluation (Audio + Word-Level Pronunciation)

```mermaid
sequenceDiagram
    participant S as Student
    participant EP as POST /speaking/evaluate-pro
    participant W as Whisper API
    participant OAI as OpenAI
    participant DB as Supabase

    S->>EP: {prompt_text, audio_file (webm)} + Student JWT
    EP->>W: whisper-1 transcribe (verbose_json, word timestamps, Pakistani accent prompt)
    W-->>EP: {text, words: [{word, start, end}...]}
    EP->>EP: compare_phrases(target_phrase, spoken_words, threshold=0.75)
    EP->>EP: calculate_pronunciation_score() -> 0-100
    EP->>EP: Noise detection (all incorrect + spoken_words exist)
    alt Low score + few words (attempt < MAX)
        EP-->>S: {status: "retry", pronunciation_score, pronunciation_data}
    else Valid
        EP->>OAI: gpt-4o-mini: generate feedback from pronunciation results
        EP->>DB: UPDATE students.points (>=70%: 10pts, >=50%: 5pts, else 0)
        EP->>DB: INSERT student_interactions (pronunciation_data stored as JSON)
        EP->>EP: update_streak(student_id)
        EP-->>S: {score, pronunciation_score, pronunciation_data[{word, status}...], feedback, noise_flagged}
    end
```

**Key file**: `backend/app/api/v1/endpoints/speaking.py`
**Utility**: `backend/app/utils/pronunciation.py` (compare_phrases, calculate_pronunciation_score)

---

## 8. Daily Rewards / Surprise Chest (Student)

```mermaid
sequenceDiagram
    participant S as Student
    participant R as POST /rewards/claim-daily
    participant DB as Supabase

    S->>R: Student JWT
    R->>DB: SELECT points, last_daily_reward_at FROM students
    R->>R: is_today(last_daily_reward_at)? -> 400 "already claimed today"
    R->>R: generate_daily_reward() -> random: 70% +25pts, 20% +50pts, 10% 2x multiplier
    R->>DB: UPDATE students {points: new_total, last_daily_reward_at: now_utc}
    R->>R: check_and_unlock_achievements(student_id) (non-fatal)
    R-->>S: {reward_type, amount, new_total, message, new_achievements}
```

**Anti-cheat**: Server-side UTC timestamp comparison via `is_today()`. Students cannot claim twice in the same calendar day regardless of timezone.

**Other rewards endpoints**:
- `GET /rewards/status` -- check if claimed today
- `GET /rewards/daily-summary` -- today_points, total_points, missions_today (cached 2min)
- `GET /rewards/streak` -- current_streak, longest_streak, last_activity_date

**Key file**: `backend/app/api/v1/endpoints/rewards.py`

---

## 9. NLP Insight Report (Teacher)

```mermaid
sequenceDiagram
    participant T as Teacher Dashboard
    participant E as GET /evaluator/insights/{student_id}
    participant NLP as nlp_evaluator.py
    participant OAI as OpenAI
    participant DB as Supabase

    T->>E: Teacher GoTrue JWT + student_id path param
    E->>DB: Resolve grade_level from student -> classroom
    E->>NLP: evaluate_interactions(student_id, grade_level, supabase_admin)
    NLP->>DB: SELECT last 30 from student_interactions ORDER BY created_at DESC
    NLP->>NLP: Compute: mission_count, correct_count, chat_count, context_used_count
    NLP->>NLP: Sample 10 recent chat messages (original_message)
    NLP->>OAI: gpt-4o-mini with_structured_output(StudentInsightReport)
    NLP-->>E: StudentInsightReport
    E-->>T: {engagement_level, mission_accuracy_pct, strengths, improvements, topics, teacher_note}
```

**Key files**: `backend/app/api/v1/endpoints/evaluator.py`, `backend/app/agents/evaluator_agent/nlp_evaluator.py`

---

## Cross-Cutting Patterns

### Grade-Level Guardrail
Every student-facing endpoint resolves `grade_level` from:
1. Student JWT contains `classroom_id`
2. `classrooms` table lookup returns `grade_level`
3. Grade injected into vector queries (`match_snc_documents` RPC WHERE clause) and LLM prompts

The student never sends or controls the grade -- always server-derived.

### Points System
Points accumulated in `students.points` (server-side integer):
| Activity | Points |
|---|---|
| Mission correct answer | +10 |
| Spelling Bee 1st attempt correct | +10 |
| Spelling Bee 2nd attempt correct | +5 |
| Story Time correct answer | +10 |
| Speaking score 2 (on-topic + good vocab) | +10 |
| Speaking score 1 (partial) | +5 |
| Speaking pronunciation >= 70% | +10 |
| Speaking pronunciation >= 50% | +5 |
| Daily chest (70% chance) | +25 |
| Daily chest (20% chance) | +50 |

### Background Logging
All student activities logged to `student_interactions` via `log_interaction()` as `FastAPI BackgroundTasks`. Synchronous (thread pool), error-swallowing by design. Fields: student_id, classroom_id, grade_level, interaction_type, original_message, translated_message, correct, context_used, pillar, score.

### Streak Tracking
`update_streak(student_id)` called by: spelling bee submit, speaking evaluate. Maintains `current_streak`, `longest_streak`, `last_activity_date` on students table.

### Redis Caching
| Key Pattern | TTL | Purpose |
|---|---|---|
| `teacher_role:{user_id}` | 1 hour | Teacher/admin role lookup |
| `daily_summary:{student_id}` | 2 minutes | Daily score summary |

Cache is best-effort -- operations wrapped in try/except, app continues without caching on Redis failure.
