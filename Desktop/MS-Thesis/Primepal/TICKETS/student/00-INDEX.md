# Student Tickets — Index

9 tickets covering all client requirements for the student-facing app.

| # | Ticket | Priority | Status | Dependencies |
|---|--------|----------|--------|-------------|
| S01 | [Diagnostic Mission (Cold-Start Pre-Test)](S01-DIAGNOSTIC-MISSION.md) | CRITICAL | TODO | A01 |
| S02 | [Expanded Mission Task Types (LSRW Variety)](S02-MISSION-TASK-VARIETY.md) | HIGH | TODO | — |
| S03 | [Bilingual Scaffolding in Missions](S03-BILINGUAL-SCAFFOLDING.md) | HIGH | TODO | S02 |
| S04 | [Network Grace Protocol](S04-NETWORK-GRACE-PROTOCOL.md) | HIGH | TODO | — |
| S05 | [STT Forgiveness for Speaking](S05-STT-FORGIVENESS.md) | MEDIUM | TODO | Ticket 02 |
| S06 | [Achievements Tab & Badge System](S06-ACHIEVEMENTS-AND-BADGES.md) | MEDIUM | TODO | — |
| S07 | [Daily Streak Engine](S07-DAILY-STREAK-ENGINE.md) | MEDIUM | TODO | — |
| S08 | [Scoring Visibility (Per-Task + Daily + Cumulative)](S08-SCORING-AND-VISIBILITY.md) | HIGH | TODO | S02 |
| S09 | [Adaptive Difficulty Based on Performance](S09-ADAPTIVE-DIFFICULTY.md) | HIGH | TODO | S08 |

## Suggested Build Order

1. **S02** (task variety) — foundation for everything else
2. **S08** (scoring) — depends on S02's difficulty system
3. **S03** (bilingual) — applies to S02's new task types
4. **S04** (network grace) — infrastructure, can be parallel
5. **S09** (adaptive difficulty) — depends on S08
6. **S01** (diagnostic) — depends on A01 schema, but student flow can be built in parallel
7. **S06** (achievements) — independent, medium priority
8. **S07** (streaks) — independent, medium priority
9. **S05** (STT forgiveness) — depends on Whisper bug fix (Ticket 02)

## What Already Exists (Not Ticketed)

These student features are already implemented and do NOT need tickets:
- Student login (class code + avatar + PIN)
- Daily missions (3 Qs/day)
- Pillar missions (10 Qs/pillar) — basic MCQ + fill-blank
- Points system (cumulative, never subtracted)
- Daily chest reward (random bonus)
- Leaderboard (classroom ranking)
- Bilingual chatbot (Minglish + English, RAG-grounded)
- Spelling Bee module (grade-appropriate, 30s timer, +5 pts)
- Story Time (story + comprehension Qs)
- Speaking practice (prompts + Whisper transcription)
