# Admin Tickets — Index

5 tickets covering all client requirements for the admin panel.

| # | Ticket | Priority | Status | Dependencies |
|---|--------|----------|--------|-------------|
| A01 | [Pre/Post-Test Evaluation System](A01-PRE-POST-TEST-EVALUATION.md) | CRITICAL | TODO | None (co-build with S01) |
| A02 | [Global Entity Management (CRUD)](A02-CRUD-OPERATIONS.md) | HIGH | TODO | — |
| A03 | [Gradebook Upload & RAG Pipeline Management](A03-GRADEBOOK-UPLOAD-AND-RAG.md) | HIGH | TODO | — |
| A04 | [Raw Data Export (Researcher's API)](A04-DATA-EXPORT.md) | HIGH | TODO | A01 |
| A05 | [Admin Has All Teacher Features](A05-ADMIN-TEACHER-FEATURE-PARITY.md) | MEDIUM | TODO | T01-T05 |

## Suggested Build Order

1. **A01** (pre/post test) — critical for thesis, shared infra with S01
2. **A02** (CRUD operations) — foundational admin capabilities
3. **A03** (gradebook upload + RAG status) — enhances existing pipeline
4. **A04** (data export) — depends on A01 evaluation data
5. **A05** (teacher feature parity) — depends on teacher tickets being done

## What Already Exists (Not Ticketed)

These admin features are already implemented and do NOT need tickets:
- Admin login (email/password + invite code)
- Teacher listing on staff page
- Invite code creation (7-day expiry)
- Curriculum page stub (needs A03 to complete)
- Hierarchy page stub (needs A02 to complete)
