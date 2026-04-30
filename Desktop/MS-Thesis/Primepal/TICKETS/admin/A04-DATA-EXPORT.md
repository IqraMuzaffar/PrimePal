# A04 — Raw Data Export (Researcher's API)

**Priority:** HIGH (thesis data collection)
**Status:** TODO
**Depends on:** A01 (evaluation records must exist to export)

## What Exists

- `student_interactions` table: all Q/A data with pillar, score, correct, timestamp
- `evaluation_records` table: (to be created in A01) — isolated pre/post test data
- `missions_completed` table: mission completion tracking
- Evaluator endpoints return JSON analytics
- No export functionality of any kind

## What Needs to Be Built

### 1. CSV Export Endpoints

Admin-only endpoints for downloading raw data:

| Export | Endpoint | Content |
|--------|----------|---------|
| Evaluation Records | `GET /admin/export/evaluations?format=csv` | All pre/post test responses with student_id, grade, pillar, answers, scores |
| Interaction Logs | `GET /admin/export/interactions?format=csv` | All student_interactions: type, pillar, correct, score, timestamp |
| Usage Logs | `GET /admin/export/usage?format=csv` | Time-on-task, sessions per student, errors per session |
| Student Roster | `GET /admin/export/students?format=csv` | student_id, name, roll_number, grade, classroom, total_points, current_streak |
| Mission History | `GET /admin/export/missions?format=csv` | Mission completions: student, pillar, date, score |

### 2. Filters on Export

All exports should accept optional query params:
- `grade_level` — filter by grade
- `date_from` / `date_to` — date range
- `student_id` — specific student
- `pillar` — specific skill
- `format` — `csv` (default) or `json`

### 3. Usage Logs Table

New table for thesis-relevant usage metrics:

```sql
CREATE TABLE system_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  tasks_completed INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  code_switching_count INTEGER DEFAULT 0,  -- times student used Urdu in chat
  pillar_time_reading_ms INTEGER DEFAULT 0,
  pillar_time_writing_ms INTEGER DEFAULT 0,
  pillar_time_listening_ms INTEGER DEFAULT 0,
  pillar_time_speaking_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Session tracking: log session start on login, update on activity, close on logout/timeout
- Time-on-task: track time spent per pillar per session
- Code-switching frequency: count Urdu/Minglish messages in chat per session

### 4. Admin Export UI

- `/admin/dashboard/export` — new page
- Dropdown: select export type
- Filter controls: grade, date range, student
- "Download CSV" button → triggers browser file download
- "Download JSON" button → alternative format
- Preview first 10 rows before downloading

### 5. Data Format Requirements

CSV must be **clean and machine-readable** for thesis statistical analysis:
- Headers in first row
- ISO 8601 timestamps
- UTF-8 encoding (Urdu text must be preserved)
- One row per record (denormalized — no nested JSON in CSV)
- Include student grade_level in every export row (avoid join requirements for the researcher)

## Engineering Notes

- Use Python's `csv` module or `pandas` for CSV generation (streaming response for large datasets)
- Set response headers: `Content-Disposition: attachment; filename="evaluation_records_2026-04-29.csv"`
- Consider pagination for very large exports (> 10,000 rows)
- The code-switching count can be computed from `student_interactions WHERE interaction_type = 'chat'` by detecting Urdu script or Roman Urdu patterns

## Files to Touch

- `backend/app/endpoints/admin.py` — export endpoints
- `frontend/src/app/admin/dashboard/export/` — new page
- `supabase/migrations/` — `system_usage_logs` table
- `backend/app/endpoints/chat.py` — log code-switching events
- `backend/app/endpoints/missions.py` — log time-on-task per question
