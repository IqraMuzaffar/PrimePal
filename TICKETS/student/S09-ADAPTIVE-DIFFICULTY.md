# S09 — Adaptive Difficulty Based on Past Performance

**Priority:** HIGH
**Status:** TODO
**Depends on:** S08 (difficulty-based scoring must exist first)

## What Exists

- Pillar missions have **weakness-based weighting** — if a student is weak at a pillar, that pillar gets more questions in daily missions
- Mission generator receives grade + topic context from RAG
- `student_interactions` logs every Q/A with pillar, correctness, and score
- Confidence Builder mode exists (reduced complexity when student is frustrated)
- Affective filter / sentiment columns exist in DB (migration 023)

## What Needs to Be Built

### 1. Per-Topic Performance Tracking

Currently weakness is tracked at the **pillar level** (Reading vs Writing). The client wants **topic-level** tracking:

- After each mission, aggregate: which **topics** did the student struggle with?
- New table or view: `student_topic_performance`
  ```
  student_id, topic_name, pillar, total_attempts, correct_count, 
  accuracy_pct, last_attempted_at, trend (improving/declining/stable)
  ```
- Update after every mission completion

### 2. Adaptive Mission Generation

The mission generator prompt must include performance history:

- **Weak topics**: "Student scored 30% on 'Prepositions' last week — include 2-3 preposition questions"
- **Strong topics**: "Student scored 95% on 'Colors' — increase difficulty to Hard for color questions"
- **New topics**: introduced at medium difficulty by default
- **Mix ratio**: ~40% weak topic reinforcement, ~40% current week topics, ~20% new/strong topics at higher difficulty

### 3. Weekly Progression Logic

- Week N weakness data informs Week N+1 mission generation
- If a student was weak at "Nouns" in Week 1, Week 2 missions include Nouns alongside new Week 2 topics
- As accuracy improves past 70% on a weak topic, gradually reduce its frequency and increase difficulty
- This maps directly to the thesis requirement: measurable improvement over the 3-week study

### 4. Difficulty Escalation Rules

Per topic per student:
- Accuracy < 40% → serve Easy questions (5-10 pts), include bilingual hints by default
- Accuracy 40-70% → serve Medium questions (10-15 pts)
- Accuracy > 70% → serve Hard questions (15-20 pts)
- Accuracy > 90% → consider the topic "mastered" — minimal repetition, max difficulty

### 5. Backend Implementation

- New utility: `get_student_performance_profile(student_id)` → returns topic-level accuracy map
- Inject this profile into the mission generator's system prompt
- Cache the performance profile (refresh every 24 hours or on mission completion)

## Engineering Notes

- Performance profile computation: aggregate from `student_interactions` grouped by topic + pillar
- Topic identification: the mission generator must tag each question with its topic (from `snc_topics`)
- Don't over-complicate the adaptive algorithm — simple accuracy thresholds are sufficient for a 3-week study
- The affective filter / sentiment tracking (migration 023) can feed into this: if student sentiment is low, bias toward easier questions regardless of accuracy

## Files to Touch

- `supabase/migrations/` — `student_topic_performance` materialized view or table
- `backend/app/agents/mission_generator.py` — inject performance profile into prompt
- `backend/app/endpoints/missions.py` — compute + pass performance data
- `backend/app/` — new utility `performance_profile.py`
