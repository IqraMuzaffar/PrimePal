# Evaluator Endpoints

**Module:** `backend/app/api/v1/endpoints/evaluator.py`
**Prefix:** `/api/v1/evaluator`
**Auth:** Teacher (GoTrue JWT)

## Endpoints

### GET `/evaluator/report/student/{student_id}`
Per-student performance report across all four pillars.
Returns interaction history, accuracy rates, and AI-generated insights.

### GET `/evaluator/report/classroom/{classroom_id}`
Classroom-wide analytics aggregating all students.
Returns per-student summaries, class averages, pillar-level breakdowns.

### GET `/evaluator/report/teacher`
Full teacher dashboard data across all their classrooms.
Returns classroom summaries with aggregated stats.

## Data Source
All reports are built from the `student_interactions` table, which logs every student-AI interaction with:
- `student_id`, `classroom_id`
- `interaction_type` (mission, chat, spelling-bee, story-time, speaking)
- `pillar` (reading, writing, listening, speaking)
- `correct` (boolean), `score`
- `prompt`, `response`, `created_at`
