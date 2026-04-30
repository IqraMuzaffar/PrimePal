# S03 — Bilingual Scaffolding in Missions

**Priority:** HIGH
**Status:** TODO
**Depends on:** S02 (task variety — hint system applies to new task types too)

## What Exists

- Bilingual chatbot already handles Minglish/Urdu code-switching (`backend/app/agents/chatbot.py`)
- RAG pipeline returns SNC curriculum content that includes Urdu context
- Announcements support bilingual fields (`title_ur`, `body_ur`)
- Chat agent understands Roman Urdu + English mix
- Mission generator receives grade-level RAG context

## What Needs to Be Built

### 1. Hint Button on Mission Tasks

- Every Reading and Writing task should feature a subtle **"Hint" button** (small, non-distracting)
- Tapping "Hint" reveals the **Urdu translation** of the difficult English vocabulary word(s) in that question
- Hint usage should be logged in `student_interactions` (add `hint_used: boolean` field)
- Using a hint does NOT reduce points (to lower affective filter / anxiety)

### 2. Guided Translation Tasks

- Writing pillar includes a "Guided Translation" task type (see S02)
- Display an Urdu sentence → student constructs the English equivalent from a word bank
- This is the primary bilingual task type — merges language learning with translation practice

### 3. Mission Generator Bilingual Output

- The LLM prompt for mission generation must output an `urdu_hint` field per question
- Example: `{ "question": "The cat is ___ the table.", "options": ["on", "in", "under"], "urdu_hint": "بلی میز کے ___ ہے" }`
- Hint text should be grade-appropriate (Grade 1 gets simpler Urdu, Grade 5 gets more complex)

### 4. Chatbot Bilingual Enhancement

- Already exists but needs refinement per client spec:
  - Must accept **Urdu script** (not just Roman Urdu) — verify the translation pipeline handles both
  - Response language must match the **student's grade level** — Grade 1 gets very simple English with more Urdu support, Grade 5 gets more English
  - Non-academic question guardrail must pivot gently: e.g., "I love learning about Action Verbs! Do you want to practice some?"

## Engineering Notes

- Urdu hints can be generated alongside questions in the same LLM call — no separate API call needed
- Consider caching hints with the mission (they're part of the same Redis cache entry)
- Font consideration: Urdu script needs `Noto Nastaliq Urdu` or similar font in frontend CSS

## Files to Touch

- `backend/app/agents/mission_generator.py` — add `urdu_hint` to output schema
- `frontend/src/app/student/missions/[pillar]/page.tsx` — add Hint button UI
- `frontend/src/app/student/chat/page.tsx` — verify Urdu script input works
- `backend/app/agents/chatbot.py` — grade-aware response complexity
- `supabase/migrations/` — add `hint_used` boolean to `student_interactions`
- `frontend/globals.css` or Tailwind config — Urdu font import
