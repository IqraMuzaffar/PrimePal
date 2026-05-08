# Puzzle Palace — Design Spec

**Date:** 2026-05-08
**Replaces:** Spelling Bee module (removed entirely)

## Overview

Puzzle Palace is a new student activity module that replaces the broken Spelling Bee. It presents 5 themed "rooms", each containing 2 questions of a specific task type. Students progress room-by-room through 10 total questions, earning 10 points per correct answer (max 100).

The module reuses existing backend mission generation — no new LLM prompts or endpoints needed beyond a thin wrapper that fetches 2 questions per task type.

## Rooms (Fixed Order)

| Room | Name | Task Type | Pillar | Student Action |
|------|------|-----------|--------|----------------|
| 1 | Fill the Gap | `fill_blank_word_bank` | Reading | Pick the right word from a bank to complete a sentence |
| 2 | Scramble Fix | `sentence_scramble` | Writing | Arrange jumbled words into the correct sentence order |
| 3 | Odd One Out | `odd_one_out` | Reading | Spot the word that doesn't belong in a group |
| 4 | Missing Letter | `missing_letter` | Writing | Fill in the missing letter(s) in a word |
| 5 | True or False | `passage_true_false` | Reading | Read a short passage and decide true or false |

**Pillar mix:** 3 Reading + 2 Writing.

## Flow

1. Student navigates to `/student/puzzle-palace`
2. Backend generates 10 questions (2 per task type) using existing mission generation logic, scoped to the student's grade and active topic
3. Frontend shows a "room map" intro screen (5 rooms, first unlocked)
4. Student enters Room 1, answers 2 questions sequentially
5. After both answers: room result shown (checkmarks/crosses), next room unlocks
6. Repeat for rooms 2–5
7. After Room 5: results screen showing total score (X/100), per-room results, and points awarded
8. Points logged to `student_interactions` table (pillar = task's pillar, 10 pts each)

## Points

- **10 points** per correct answer, flat
- **Max score:** 100 (10 questions x 10 points)
- Points recorded per-question to `student_interactions` with the correct pillar (reading or writing)

## Backend

**No new LLM generation.** The backend endpoint:

1. Accepts `student_id` (from JWT) and resolves `grade_level` + `active_topic`
2. For each of the 5 task types, generates 2 questions using the existing `generate_pillar_missions()` or equivalent logic
3. Returns all 10 questions grouped by room, with `correct_answer` stripped
4. Completion endpoint reuses existing `/missions/complete` pattern — validates answer, awards points, logs interaction

**Endpoint structure:**
- `GET /puzzle-palace/questions` — returns 10 questions in 5 rooms
- `POST /puzzle-palace/complete` — submit answer for a single question (reuses mission completion logic)

**Caching:** 1-hour TTL per student+topic, same as other activities.

## Frontend

**Route:** `/student/puzzle-palace`

**Pages/States:**
1. **Intro screen** — Palace illustration, "5 Rooms to Clear!" heading, Start button
2. **Room screen** — Room name + number (e.g., "Room 1: Fill the Gap"), question card, answer input (varies by task type), Submit button
3. **Room result** — Shows correct/incorrect for both questions, "Next Room" button
4. **Final results** — Score (X/100), room-by-room breakdown, "Back to Home" button

**Task type UIs** — Reuse existing mission task components:
- `fill_blank_word_bank`: sentence with blank + word chips to pick
- `sentence_scramble`: draggable/tappable word tiles to reorder
- `odd_one_out`: 4 word options, pick the odd one
- `missing_letter`: word with underscore(s) + letter options
- `passage_true_false`: passage text + True/False buttons

**Design:** Follows existing student theme — violet/pink palette, Baloo+Nunito fonts, animated cards, consistent with missions page.

## What Gets Removed

- `/student/spelling-bee` route and all components
- `/spelling-bee/` backend endpoint and related code
- Spelling Bee references in student home page, navigation, sidebar
- Spelling Bee cache logic

## What Gets Added

- `/student/puzzle-palace` route + page components
- `GET /puzzle-palace/questions` backend endpoint
- `POST /puzzle-palace/complete` backend endpoint
- Puzzle Palace card on student home page (replacing Spelling Bee card)
- Navigation link in student sidebar/nav

## Out of Scope

- New task types (all 5 exist already)
- Timer/countdown mechanic
- Room bonus points
- Leaderboard
- Multiplayer
