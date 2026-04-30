# Teacher Tickets — Index

5 tickets covering all client requirements for the teacher-facing dashboard.

| # | Ticket | Priority | Status | Dependencies |
|---|--------|----------|--------|-------------|
| T01 | [Shared Account & Unified Dashboard with Filters](T01-SHARED-ACCOUNT-AND-UNIFIED-DASHBOARD.md) | CRITICAL | TODO | — |
| T02 | [Topic Selection for Task Generation](T02-TOPIC-SELECTION-FOR-ASSESSMENT.md) | HIGH | TODO | — |
| T03 | [Report Generation (Individual + Grade-Wise)](T03-REPORT-GENERATION.md) | HIGH | TODO | S08, S09 |
| T04 | [Grade-Level Overview & Class Statistics](T04-GRADE-OVERVIEW-AND-CLASS-STATISTICS.md) | HIGH | TODO | T01 (soft: S07) |
| T05 | [Teacher AI Assistant (Guided Recommendations)](T05-TEACHER-AI-ASSISTANT.md) | MEDIUM | TODO | T04 |

## Suggested Build Order

1. **T01** (shared account + filters) — foundational for all teacher features
2. **T02** (topic selection) — controls what students are assessed on
3. **T03** (reports) — needs scoring data from S08/S09
4. **T04** (grade overview + charts) — builds on T01 + T03
5. **T05** (AI assistant) — depends on T04's aggregation data

## What Already Exists (Not Ticketed)

These teacher features are already implemented and do NOT need tickets:
- Teacher login/signup (Supabase GoTrue)
- Dashboard with KPI cards (students, interactions, accuracy)
- Classroom creation with auto-generated class codes
- Classroom roster management (add, edit, delete students)
- Bulk student import
- Syllabus management (30-week pacing calendar)
- Per-student NLP insight reports (LLM-powered)
- Per-classroom analytics
- Student search by name
- Bilingual announcements (CRUD)
- Curriculum PDF upload (teacher-level)
