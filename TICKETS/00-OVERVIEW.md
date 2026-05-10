# PrimePal — Ticket Tracker

## Pre-Ship Audit (Infrastructure)

**Audit Date:** 2026-04-29
**Total Issues:** 81 (22 Critical, 29 Warning, 30 Info)

| # | Ticket | Status | Issues |
|---|--------|--------|--------|
| 1 | [01-HARDCODED-URLS-AND-CORS.md](01-HARDCODED-URLS-AND-CORS.md) | PARTIAL — frontend URLs done, backend CORS/Redis needs discussion | 7 critical |
| 2 | [02-BROKEN-ENDPOINTS.md](02-BROKEN-ENDPOINTS.md) | DONE | 4 critical |
| 3 | [03-MOCK-DATA-REMOVAL.md](03-MOCK-DATA-REMOVAL.md) | TODO — needs discussion | 3 critical |
| 4 | [04-DEAD-CODE-CLEANUP.md](04-DEAD-CODE-CLEANUP.md) | DONE | 30+ items |
| 5 | [05-SECURITY-HARDENING.md](05-SECURITY-HARDENING.md) | TODO — needs discussion | 10 items |
| 6 | [06-FRONTEND-BUGS.md](06-FRONTEND-BUGS.md) | DONE | 5 items |
| 7 | [07-OPTIMIZATION.md](07-OPTIMIZATION.md) | DONE | 8 items |
| 8 | [08-DEPRECATIONS-AND-CONSISTENCY.md](08-DEPRECATIONS-AND-CONSISTENCY.md) | DONE | 14 items |

---

## Client Requirements (Feature Tickets)

**Source:** Client requirements document (2026-04-29)
**Total Feature Tickets:** 19 (9 Student + 5 Teacher + 5 Admin)

### Student Features → [student/00-INDEX.md](student/00-INDEX.md)

| # | Ticket | Priority | Status |
|---|--------|----------|--------|
| S01 | [Diagnostic Mission (Cold-Start Pre-Test)](student/S01-DIAGNOSTIC-MISSION.md) | CRITICAL | TODO |
| S02 | [Expanded Mission Task Types (LSRW Variety)](student/S02-MISSION-TASK-VARIETY.md) | HIGH | TODO |
| S03 | [Bilingual Scaffolding in Missions](student/S03-BILINGUAL-SCAFFOLDING.md) | HIGH | TODO |
| S04 | [Network Grace Protocol](student/S04-NETWORK-GRACE-PROTOCOL.md) | HIGH | TODO |
| S05 | [STT Forgiveness for Speaking](student/S05-STT-FORGIVENESS.md) | MEDIUM | TODO |
| S06 | [Achievements Tab & Badge System](student/S06-ACHIEVEMENTS-AND-BADGES.md) | MEDIUM | TODO |
| S07 | [Daily Streak Engine](student/S07-DAILY-STREAK-ENGINE.md) | MEDIUM | TODO |
| S08 | [Scoring Visibility (Per-Task + Daily + Cumulative)](student/S08-SCORING-AND-VISIBILITY.md) | HIGH | TODO |
| S09 | [Adaptive Difficulty Based on Performance](student/S09-ADAPTIVE-DIFFICULTY.md) | HIGH | TODO |

### Teacher Features → [teacher/00-INDEX.md](teacher/00-INDEX.md)

| # | Ticket | Priority | Status |
|---|--------|----------|--------|
| T01 | [Shared Account & Unified Dashboard](teacher/T01-SHARED-ACCOUNT-AND-UNIFIED-DASHBOARD.md) | CRITICAL | TODO |
| T02 | [Topic Selection for Task Generation](teacher/T02-TOPIC-SELECTION-FOR-ASSESSMENT.md) | HIGH | TODO |
| T03 | [Report Generation (Individual + Grade-Wise)](teacher/T03-REPORT-GENERATION.md) | HIGH | TODO |
| T04 | [Grade-Level Overview & Class Statistics](teacher/T04-GRADE-OVERVIEW-AND-CLASS-STATISTICS.md) | HIGH | TODO |
| T05 | [Teacher AI Assistant (Guided Recommendations)](teacher/T05-TEACHER-AI-ASSISTANT.md) | MEDIUM | TODO |

### Admin Features → [admin/00-INDEX.md](admin/00-INDEX.md)

| # | Ticket | Priority | Status |
|---|--------|----------|--------|
| A01 | [Pre/Post-Test Evaluation System](admin/A01-PRE-POST-TEST-EVALUATION.md) | CRITICAL | TODO |
| A02 | [Global Entity Management (CRUD)](admin/A02-CRUD-OPERATIONS.md) | HIGH | TODO |
| A03 | [Gradebook Upload & RAG Pipeline Management](admin/A03-GRADEBOOK-UPLOAD-AND-RAG.md) | HIGH | TODO |
| A04 | [Raw Data Export (Researcher's API)](admin/A04-DATA-EXPORT.md) | HIGH | TODO |
| A05 | [Admin Has All Teacher Features](admin/A05-ADMIN-TEACHER-FEATURE-PARITY.md) | MEDIUM | TODO |

---

## Cross-Cutting Dependency Graph

```
S02 (Task Variety)
 ├── S03 (Bilingual Scaffolding)
 └── S08 (Scoring Visibility)
      └── S09 (Adaptive Difficulty)

A01 (Pre/Post Test) → S01 (Diagnostic Mission)  [A01 creates schema, S01 builds student flow]
A04 (Data Export) ← A01

T01 (Unified Dashboard)
 └── T04 (Grade Overview)  [soft dep: S07 for idle detection]
      └── T05 (AI Assistant)

T03 (Reports) ← S08 + S09

A05 (Admin Parity) ← T01-T05

S05 (STT Forgiveness) ← Ticket 02 (DONE — unblocked)

Independent (can build in parallel):
 - S04 (Network Grace)
 - S06 (Achievements)
 - S07 (Streaks)
 - T02 (Topic Selection)
 - A02 (CRUD Operations)
 - A03 (Gradebook Upload)
```

## Recommended Implementation Phases

### Phase 1 — Foundation (Week 1)
- S02 (task variety), T01 (unified dashboard), A01+S01 (evaluation system), A02 (CRUD)

### Phase 2 — Core Features (Week 2)
- S08 (scoring), S03 (bilingual), T02 (topic selection), T04 (grade overview), A03 (gradebook), S04 (network grace)

### Phase 3 — Intelligence Layer (Week 3)
- S09 (adaptive difficulty), T03 (reports), A04 (data export)

### Phase 4 — Polish (Week 4)
- S06 (achievements), S07 (streaks), S05 (STT forgiveness), T05 (AI assistant), A05 (admin parity)

## How to Use

- Each ticket file lists: what exists, what needs to be built, engineering notes, and files to touch
- Mark items DONE as they are completed
- Update this overview status as tickets progress
- Dependency graph above shows safe parallelization opportunities
