# T03 — Report Generation (Individual + Grade-Wise)

**Priority:** HIGH
**Status:** TODO
**Depends on:** S08 (scoring visibility), S09 (adaptive difficulty — performance data)

## What Exists

- Per-student report: `/teacher/students/[id]/report` — LLM-powered NLP insight (strengths/weaknesses)
- Evaluator endpoint: `GET /evaluator/report/student/{id}` — returns text-based analysis
- Classroom aggregation in evaluator: per-classroom accuracy stats
- Bulk reports page stub: `/teacher/reports` — UI exists but PDF export not implemented
- `student_interactions` table has all raw data: pillar, score, correct, created_at

## What Needs to Be Built

### 1. Individual Student Report — Enhanced

Current report is text-only. Enhance with structured data:

- **Per-skill scores**: Reading X%, Writing Y%, Listening Z%, Speaking W%
- **Per-skill trend**: improving / declining / stable (compare week-over-week)
- **Date-stamped session history**: each day's scores listed with dates
- **Strengths**: top 3 topics by accuracy
- **Weaknesses**: bottom 3 topics by accuracy
- **Recommendations**: LLM-generated suggestions for improvement (keep existing NLP evaluator)

### 2. Grade-Wise Aggregate Report

New report type: aggregate all students in a grade:

- **Skill distribution**: "80% of Grade 1 students are proficient in Reading, 50% struggle with Speaking"
- **Topic heatmap**: which topics have highest/lowest accuracy across the grade
- **Quartile breakdown**: top 25%, middle 50%, bottom 25% per skill
- **Trend over time**: week-over-week grade-level accuracy per skill

Backend: `GET /evaluator/report/grade/{grade_level}` → aggregated stats + LLM summary

### 3. PDF Export

- Both individual and grade-wise reports must be downloadable as PDF
- Use a server-side PDF library (e.g., `reportlab` or `weasyprint` in Python, or client-side `html2pdf`)
- PDF should include:
  - PrimePal header/branding
  - Student/grade info
  - Score tables
  - Strengths/weaknesses
  - Date range of data
- Endpoint: `GET /evaluator/report/student/{id}/pdf` and `GET /evaluator/report/grade/{grade_level}/pdf`

### 4. Report Filters

- Date range filter (default: last 7 days, options: today, this week, all time)
- Skill filter: show only Reading / Writing / Listening / Speaking
- Export format: PDF or CSV

### 5. Teacher Dashboard Report View

- `/teacher/reports` page should list:
  - Quick links to grade-wise reports
  - Student search for individual reports
  - Recent reports generated
  - Export buttons

## Engineering Notes

- Grade-wise aggregation is SQL-heavy — consider a materialized view or nightly aggregation job
- PDF generation on the server avoids browser compatibility issues
- Keep LLM-generated text in reports but add structured data tables alongside
- The `student_interactions` table is the single source of truth for all scoring data

## Files to Touch

- `backend/app/endpoints/evaluator.py` — grade-wise report, PDF generation, date/skill filters
- `backend/app/agents/nlp_evaluator.py` — enhanced individual report, grade-wise summary
- `frontend/src/app/teacher/reports/page.tsx` — full report UI with filters + export
- `frontend/src/app/teacher/students/[id]/report/page.tsx` — enhanced individual report view
- `backend/requirements.txt` — add PDF generation library
