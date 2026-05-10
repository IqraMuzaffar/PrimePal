# Evaluator Endpoints

**Module:** `backend/app/api/v1/endpoints/evaluator.py`
**Prefix:** `/api/v1/evaluator`
**Auth:** Teacher GoTrue JWT (`get_current_teacher`) for all endpoints
**Features:** NLP Insight Generator (Feature 9), Teacher Dashboard (Feature 10), Grade Reports, Weekly Trends, AI Teaching Assistant

## Overview

The teacher-facing analytics and reporting module. Provides student insight reports (AI-powered), classroom summaries, grade-level aggregations, CSV exports, idle student detection, weekly trends, and AI-generated daily teaching plans. Admin users bypass classroom ownership checks.

---

## GET `/api/v1/evaluator/report/student/{student_id}`

Generate an AI-powered NLP insight report for a specific student.

**Path Parameters:** `student_id` (string)

**Response:** `StudentInsightReport` (from `nlp_evaluator`)
- engagement_level, strengths, areas_for_improvement, recommended_topics, teacher_note

**Business Logic:** Fetches last 30 interactions, computes engagement stats, generates qualitative LLM insights via `evaluate_interactions()`. Verifies teacher owns the student's classroom.

**DB Tables:** `students`, `classrooms`, `student_interactions`

**Errors:** 404 (student/classroom not found), 403 (access denied)

---

## GET `/api/v1/evaluator/report/student/{student_id}/detailed`

Full student report card with pillar stats, trends, daily scores, and AI narrative.

**Path Parameters:** `student_id` (string)

**Query Parameters:**
- `date_from` (string, optional) -- ISO date YYYY-MM-DD
- `date_to` (string, optional) -- ISO date YYYY-MM-DD
- `pillar` (string, optional) -- reading/writing/listening/speaking

**Response:** `StudentDetailedReport`
```json
{
  "student_id": "uuid",
  "student_name": "Ali",
  "roll_number": "001",
  "avatar_url": "...",
  "classroom_name": "Grade 3A",
  "grade_level": 3,
  "total_points": 500,
  "total_questions": 120,
  "overall_accuracy_pct": 72,
  "pillar_stats": [{ "pillar": "reading", "total": 30, "correct": 22, "accuracy_pct": 73 }],
  "date_range": { "from": "2024-01-01", "to": "2024-01-31" },
  "trend": "improving",
  "daily_scores": [{ "date": "2024-01-15", "correct": 5, "total": 7 }],
  "engagement_level": "high",
  "strengths": ["Reading comprehension"],
  "areas_for_improvement": ["Writing fluency"],
  "recommended_topics": ["Sentence construction"],
  "teacher_note": "Ali shows consistent improvement..."
}
```

**Trend calculation:** Compare first-half vs second-half accuracy. >5% improvement = "improving", <-5% = "declining", else "stable".

**DB Tables:** `students`, `classrooms`, `student_interactions`

---

## GET `/api/v1/evaluator/report/classroom/{classroom_id}`

Classroom-level interaction summary. No LLM call -- pure DB aggregation.

**Path Parameters:** `classroom_id` (string)

**Response:** `ClassroomReportResponse`
```json
{
  "classroom_id": "uuid",
  "grade_level": 3,
  "students": [
    { "student_id": "uuid", "student_name": "Ali", "avatar_url": "...", "roll_number": "001", "email": null, "total_interactions": 45, "mission_accuracy_pct": 72 }
  ]
}
```

**Business Logic:** Batch-fetches all interactions for classroom students, computes accuracy from `mission_mc`/`mission_fill` interaction types.

**DB Tables:** `classrooms`, `students`, `student_interactions`

---

## GET `/api/v1/evaluator/report/teacher`

Global teacher analytics: all classrooms with per-student stats. Used by the global analytics page (By Student / By Grade / By Section views).

**Query Parameters:**
- `grade_level` (int, optional)

**Response:**
```json
{
  "classrooms": [
    {
      "classroom_id": "uuid",
      "class_name": "Grade 3A",
      "grade_level": 3,
      "students": [{ "student_id": "...", "student_name": "...", "total_interactions": 45, "mission_accuracy_pct": 72 }]
    }
  ]
}
```

**DB Tables:** `classrooms`, `students`, `student_interactions`

---

## GET `/api/v1/evaluator/dashboard-stats`

Aggregate statistics for the teacher's dashboard.

**Query Parameters:**
- `grade_level` (int, optional)
- `pillar` (string, optional)

**Response:** `DashboardStatsResponse`
```json
{
  "total_students": 150,
  "total_interactions": 5000,
  "avg_accuracy": 72.5,
  "active_this_week": 120
}
```

**DB Tables:** `classrooms`, `students`, `student_interactions`

---

## GET `/api/v1/evaluator/skill-accuracy`

Per-skill accuracy breakdown with active-today count.

**Query Parameters:**
- `grade_level` (int, optional)

**Response:** `SkillAccuracyResponse`
```json
{ "reading": 75.2, "writing": 62.1, "listening": 70.0, "speaking": 68.5, "active_today": 42 }
```

---

## GET `/api/v1/evaluator/students`

All students across teacher's classrooms with aggregated stats. Supports search by name/roll number.

**Query Parameters:**
- `grade_level` (int, optional)
- `pillar` (string, optional) -- compute accuracy from this pillar only
- `search` (string, optional) -- filter by name or roll number

**Response:** `StudentsListResponse`
```json
{
  "students": [
    {
      "student_id": "uuid", "student_name": "Ali", "roll_number": "001",
      "classroom_id": "uuid", "classroom_name": "Grade 3A", "grade_level": 3,
      "total_points": 500, "total_interactions": 120, "mission_accuracy_pct": 72,
      "active_this_week": true
    }
  ],
  "total_count": 150
}
```

---

## GET `/api/v1/evaluator/report/grade/{grade_level}`

Grade-wise aggregate report with per-pillar accuracy, quartiles, proficiency distribution, and AI summary.

**Path Parameters:** `grade_level` (int)

**Query Parameters:**
- `date_from` (string, optional)
- `date_to` (string, optional)

**Response:** `GradeReportResponse`
```json
{
  "grade_level": 3,
  "total_students": 75,
  "total_interactions": 2500,
  "overall_accuracy_pct": 68.5,
  "pillar_accuracy": { "reading": 72.5, "writing": 58.1, "listening": 70.0, "speaking": 65.0 },
  "top_weak_topics": ["writing", "speaking"],
  "top_strong_topics": ["reading", "listening"],
  "quartiles": { "top_25": 19, "middle_50": 38, "bottom_25": 18 },
  "student_count_by_proficiency": { "proficient": 45, "developing": 22, "struggling": 8 },
  "ai_summary": "Grade 3 students show strong reading skills..."
}
```

**Proficiency thresholds:** >70% = proficient, 40-70% = developing, <40% = struggling

---

## GET `/api/v1/evaluator/report/grade/{grade_level}/csv`

CSV export of grade-level student performance data.

**Response:** Streaming CSV download (`text/csv`) with columns: student_name, roll_number, total_interactions, reading_accuracy, writing_accuracy, listening_accuracy, speaking_accuracy, overall_accuracy

---

## GET `/api/v1/evaluator/grade-overview/{grade_level}`

Grade-level overview with idle student detection (48+ hours without activity).

**Response:** `GradeOverviewResponse`
```json
{
  "grade_level": 3,
  "total_students": 75,
  "active_today": 42,
  "idle_students": 8,
  "avg_accuracy": 68.5,
  "pillar_accuracy": { "reading": 72.5, ... },
  "weak_pillars": ["writing"],
  "strong_pillars": ["reading"],
  "idle_student_list": [{ "student_id": "uuid", "student_name": "Ali", "last_activity_date": "2024-01-10" }]
}
```

**DB Tables:** `classrooms`, `students` (with `last_activity_date`, `current_streak`), `student_interactions`

---

## GET `/api/v1/evaluator/weekly-trend/{grade_level}`

Weekly accuracy trend data for a grade level.

**Query Parameters:**
- `pillar` (string, optional)
- `weeks` (int, default 4, range 1-12)

**Response:** `WeeklyTrendResponse`
```json
{
  "grade_level": 3,
  "pillar": null,
  "weeks": [
    { "week_label": "Apr 21-27", "accuracy": 72.5, "interactions": 150 }
  ]
}
```

---

## POST `/api/v1/evaluator/teacher-assistant/daily-plan`

AI-generated daily teaching plan for a specific grade level.

**Request Body:** `DailyPlanRequest`
```json
{ "grade_level": 3 }
```

**Response:** `TeacherDailyPlan`
```json
{
  "summary": "Focus on writing skills today...",
  "focus_areas": [{ "topic": "Sentence construction", "pillar": "writing", "reason": "Below 50% accuracy" }],
  "suggested_activities": [{ "title": "Story Writing", "description": "...", "target_pillar": "writing", "estimated_minutes": 15 }],
  "student_groups": [{ "group_name": "Needs extra help", "student_names": ["Ali", "Sara"], "recommendation": "..." }],
  "snc_references": ["Grade 3 Unit 5: Writing"],
  "generated_at": "2024-01-15T10:00:00Z"
}
```

**Business Logic:**
1. Check cache (6-hour TTL, keyed by teacher+grade+date)
2. Fetch classrooms, students, last 7 days interactions
3. Compute per-pillar and per-student accuracy
4. Group students: struggling (<50%), on-track (50-80%), advanced (>80%), inactive
5. RAG retrieval for SNC curriculum context
6. Generate plan via gpt-4o-mini with structured output

**DB Tables:** `classrooms`, `students`, `student_interactions`, `snc_knowledge_base` (via RAG)

**Errors:** 404 (no classrooms/students), 502 (LLM failure)
