# Mission System Redesign: Hybrid Bank + LLM Architecture

## Problem

Mission generation via LLM (gpt-4o-mini) takes 5-45 seconds per request. Topic validation rejects questions aggressively, causing retries. Students see long loading times or incomplete question sets. Teacher reports include non-mission data, inflating accuracy metrics.

## Solution: 5+5 Hybrid Architecture

Every student request is served by two parallel paths:

1. **Fast path (bank):** Pull 5 pre-generated questions from `question_bank` table (<200ms)
2. **Quality path (LLM):** Generate 5 personalized questions via gpt-4o-mini (~5-10s)
3. **Merge:** Validator combines both sets into exactly 10 questions
4. **Fallback:** If LLM fails, validator fills all 10 from bank

### Flow

```
Student clicks pillar
  |
  +-- [Parallel] Bank: SELECT 5 questions (<200ms)
  |
  +-- [Parallel] LLM: Generate 5 personalized questions (~5-10s)
  |
  +-- Validator: Check counts, task types, fields, topics
  |     - Missing questions? Fill from bank
  |     - Wrong task types? Swap from bank
  |     - Missing fields? Set defaults
  |
  +-- Merge: bank(5) + LLM(5) = 10 questions
  |
  +-- Cache for 1 hour (student-specific)
```

### Fallback Cascade

| Scenario | Result | Latency |
|----------|--------|---------|
| Best: 5 bank + 5 LLM | Full personalization | ~5-8s |
| Okay: 5 bank + 3 LLM + 2 bank fill | Partial personalization | ~8-12s |
| Worst: 10 bank (LLM timeout) | No personalization | <200ms |

Student always gets exactly 10 questions. Always.

## Question Bank

### Schema

```sql
question_bank (
    id UUID PK,
    grade_level INT,
    pillar TEXT CHECK (reading/writing/listening/speaking),
    topic TEXT,
    task_type TEXT,
    difficulty TEXT CHECK (easy/medium/hard),
    question_data JSONB,
    classroom_id UUID,
    times_served INT DEFAULT 0,
    created_at TIMESTAMPTZ
)
```

### Bounds

- **Ceiling:** 30 questions per (grade, pillar, topic) slot
- **Max size:** 5 grades x 4 pillars x 5 topics x 30 = 3,000 rows (~6MB)
- **Lifecycle:** Populated when teacher selects topics, deleted when topics change
- **No unbounded growth:** Bank only populated on teacher action, never from student requests

### Population

Teacher updates topics -> background task:
1. Delete bank rows for topics no longer active
2. For each new topic x pillar: LLM generates 30 questions
3. Validator checks each before storing
4. Takes ~2-3 minutes (parallel across pillars)

### Query Strategy

- Respect task_type distribution (half of PILLAR_TASK_CONFIGS)
- Weight by difficulty based on student weakness
- Prefer least-served questions (reduce repetition)
- Increment times_served atomically on selection

## Validator Node

New module: `backend/app/agents/tutor_agent/question_validator.py`

Six checks on LLM output:
1. **Count:** Exactly N questions (5 for LLM, 10 after merge)
2. **Task types:** Distribution matches PILLAR_TASK_CONFIGS proportionally
3. **Required fields:** Per-task-type field completeness (13 types defined)
4. **Topic alignment:** Reuses existing validate_topic_alignment()
5. **correct_answer:** Non-empty
6. **Option counts:** Exactly 4 items where required

Repair: Fills missing/invalid questions from bank by matching task_type.

## Issues Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| C1 | CRITICAL | Daily mission count not validated | Added len(questions) == 3 check |
| C2 | CRITICAL | Markdown parsing crash | Line-based stripping in markdown_parser.py |
| H1 | HIGH | Task type distribution not validated | Validator checks distribution |
| H2 | HIGH | Final fallback bypasses topics | Fills from bank (topic-validated) instead |
| H3 | HIGH | Weakness detection fragile | Returns structured dicts, not strings |
| H4 | HIGH | Pre-gen no retry on failure | Bank provides durable fallback |
| M1 | MEDIUM | Pillar timeout 45s too generous | Reduced to 20s (only 5 questions) |
| M4 | MEDIUM | 70% pass rate only logged | Validator fills gaps from bank |
| M6 | MEDIUM | Pre-gen missing RAG context | Bank populated with LLM+RAG |
| C2-eval | CRITICAL | Evaluator includes non-mission data | Added mission_% filter to 5 endpoints |
| H-idle | HIGH | Idle detection off-by-one | timedelta(days=2) instead of hours=48 |
| H-trend | HIGH | Timestamp parsing fragile | Handles Z, +00:00, and naive formats |

## New Files

- `backend/app/agents/tutor_agent/question_validator.py` — Validator + repair + merge
- `backend/app/utils/question_bank.py` — Bank population, query, management
- `backend/app/utils/markdown_parser.py` — Safe markdown code block stripping
- `supabase/migrations/037_question_bank.sql` — Table, indexes, RPC

## Modified Files

- `mission_generator.py` — Generates 5 instead of 10, structured weaknesses
- `missions.py` — Hybrid bank+LLM endpoint, daily count validation
- `pregenerate_missions.py` — Populates bank alongside cache
- `evaluator.py` — Mission-only filters, idle fix, trend fix
- `spelling_bee.py`, `story_time.py`, `speaking.py` — Markdown parser
- `classroom.py` — Bank population on topic update
