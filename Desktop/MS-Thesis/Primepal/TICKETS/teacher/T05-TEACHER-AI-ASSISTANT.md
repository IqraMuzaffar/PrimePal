# T05 — Teacher AI Assistant (Guided Recommendations)

**Priority:** MEDIUM
**Status:** TODO
**Depends on:** T04 (grade statistics must exist for the AI to reference)

## What Exists

- Evaluator agent (`backend/app/agents/nlp_evaluator.py`) generates per-student insight reports
- LLM-powered analysis: strengths, weaknesses, recommendations
- Chatbot infrastructure exists (student-facing)
- No teacher-facing AI assistant of any kind

## What Needs to Be Built

### 1. Teacher Assistant — Proactive Insights

An AI assistant panel on the teacher dashboard that provides:

- **Daily summary**: "Today, 60% of Grade 1 failed the Nouns speaking test. Grade 2 is on track."
- **Weakness alerts**: "Grade 1 class is struggling with Prepositions across both Reading and Writing pillars"
- **Actionable recommendations**: "Consider spending tomorrow's class on Preposition exercises. Here are suggested activities: [list]"
- **Resource suggestions**: "For Nouns practice, try these SNC textbook pages: [references from RAG]"

### 2. Next-Day Plan Generation

- Teacher can click "Generate tomorrow's plan" for a specific grade
- The AI uses:
  - Grade-level performance data (from T04 endpoints)
  - Weak topics aggregation
  - SNC curriculum context (from RAG pipeline)
- Outputs a structured plan:
  - **Focus areas**: 2-3 topics that need attention
  - **Suggested classroom activities**: mapped to weak skills
  - **Student grouping recommendations**: which students need extra help
  - **Resources**: relevant SNC textbook pages/content

### 3. Implementation Approach

- This is NOT a real-time chatbot — it's a **report-style generation** triggered on demand
- Backend: `POST /evaluator/teacher-assistant/daily-plan` with body `{ grade_level, date }`
- Uses the existing evaluator agent pattern but with a teacher-focused prompt
- Response cached per grade per day (teacher won't regenerate multiple times)

### 4. Frontend UI

- Collapsible panel on the teacher dashboard sidebar or a dedicated `/teacher/assistant` page
- Shows the latest generated plan per grade
- "Refresh insights" button to regenerate
- Plan is formatted in readable sections with bullet points

## Engineering Notes

- Reuse the `nlp_evaluator.py` pattern — this is essentially a grade-level evaluator report targeted at the teacher
- The RAG context is critical: recommendations must reference actual SNC curriculum content, not generic advice
- Cache aggressively — this is an expensive LLM call (grade-level aggregation + RAG + generation)
- The "resources for teacher" angle differentiates this from student-facing features

## Files to Touch

- `backend/app/agents/nlp_evaluator.py` — add teacher assistant prompt + plan generation
- `backend/app/endpoints/evaluator.py` — `POST /evaluator/teacher-assistant/daily-plan`
- `frontend/src/app/teacher/assistant/` — new page (or panel on dashboard)
- `frontend/src/components/teacher/TeacherAssistantPanel.tsx` — new component
