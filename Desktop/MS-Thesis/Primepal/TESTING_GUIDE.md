# PrimePal — Complete Testing Guide

**Last updated:** April 25, 2026
**Backend URL:** `http://localhost:8000`
**Frontend URL:** `http://localhost:3000`
**API Docs:** `http://localhost:8000/docs`

---

## Table of Contents

1. [Setup & Prerequisites](#1-setup--prerequisites)
2. [Backend Automated Tests](#2-backend-automated-tests)
3. [Teacher Auth Flow](#3-teacher-auth-flow)
4. [Classroom Management](#4-classroom-management)
5. [Student Login Flow](#5-student-login-flow)
6. [Student Home Dashboard](#6-student-home-dashboard)
7. [Daily Missions (4-Pillar LMS)](#7-daily-missions-4-pillar-lms)
8. [Bilingual Chat](#8-bilingual-chat)
9. [Spelling Bee](#9-spelling-bee)
10. [Story Time](#10-story-time)
11. [Speaking Practice](#11-speaking-practice)
12. [Quests Page](#12-quests-page)
13. [Student Leaderboard](#13-student-leaderboard)
14. [Curriculum Hub (SNC Upload)](#14-curriculum-hub-snc-upload)
15. [Teacher Dashboard v2](#15-teacher-dashboard-v2)
16. [Student Directory](#16-student-directory)
17. [Student Report Cards](#17-student-report-cards)
18. [Analytics Dashboard](#18-analytics-dashboard)
19. [Admin Role System](#19-admin-role-system)
20. [Evolving Worlds (Dynamic Backgrounds)](#20-evolving-worlds-dynamic-backgrounds)
21. [Surprise Daily Chest (Loot Box)](#21-surprise-daily-chest-loot-box)
22. [API Smoke Tests (curl)](#22-api-smoke-tests-curl)
23. [Known Limitations](#23-known-limitations)
24. [Quick Reference: All Routes](#24-quick-reference-all-routes)

---

## 1. Setup & Prerequisites

### Start the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Start the frontend
```bash
cd frontend
npm install
npm run dev
```

### Required `.env` values
**`backend/.env`**
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STUDENT_JWT_SECRET=...
OPENAI_API_KEY=sk-...
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Database: all migrations must be applied (in order)
Apply each via Supabase SQL Editor:
```
001_feature1_auth.sql
002_feature2_classroom.sql
003_feature3_storage.sql
004_feature4_pgvector.sql
005_feature5_chat_rpc.sql
006_feature6_gamification.sql
007_feature8_interactions.sql
009_add_current_week_topic.sql
010_classroom_syllabus.sql
011_student_secret_pin.sql
013_add_student_identity_fields.sql
014_admin_roles.sql
017_interactions_pillar.sql        ← CRITICAL for Quests/Speaking/Story Time
020_missions_completed_tracking.sql ← CRITICAL for Evolving Worlds (Dynamic Backgrounds)
021_daily_rewards.sql              ← CRITICAL for Surprise Daily Chest (Loot Box)
```

---

## 2. Backend Automated Tests

```bash
cd backend
python -m pytest tests/ -v
```

**Expected:** All tests pass with 0 failures.

| File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 14 | Student login, JWT, classroom code lookup |
| `test_classroom.py` | 10 | CRUD, bulk add, delete |
| `test_ingestion.py` | 13 | PDF upload, chunking, validation |
| `test_knowledge_base.py` | 7 | Embedding, pgvector insert |
| `test_chat.py` | 19 | RAG chat, bilingual, grade guardrail |
| `test_evaluator.py` | — | NLP insight generation |

---

## 3. Teacher Auth Flow

### 3.1 Login
1. Navigate to `http://localhost:3000/teacher/login`
2. Enter teacher email + password (registered in Supabase Auth)
3. **Expected:** Redirect to `/teacher/dashboard`
4. **Verify:** Avatar initial appears in top-right corner of navbar

### 3.2 Session persistence
1. Refresh the dashboard page
2. **Expected:** Stays on dashboard (not redirected to login)

### 3.3 Logout
1. Click "Logout" in navbar (top-right)
2. **Expected:** Redirect to `/teacher/login`
3. Try navigating to `/teacher/dashboard` directly
4. **Expected:** Redirect back to login

### 3.4 Settings modal
1. Click "Settings" in navbar
2. **Expected:** Modal shows teacher email + role = "Teacher"

---

## 4. Classroom Management

### 4.1 Create classroom
1. Navigate to `/teacher/classroom`
2. Click "New Classroom"
3. Enter class name (e.g., "3-Alpha") + grade level (e.g., 3)
4. Click Create
5. **Expected:** Classroom appears in list with Grade 3 badge and an auto-generated 6-char class code

### 4.2 Copy class code
1. Click the copy icon next to a class code
2. Paste into a text editor
3. **Expected:** Correct 6-char code pasted

### 4.3 Bulk add students
1. Click "Manage" on any classroom → classroom detail
2. Click "Add Students"
3. Enter: `Ali, Sara, Ahmed`
4. Click Add
5. **Expected:** 3 students in roster with avatar initials

### 4.4 Edit student details
1. Click pencil icon next to a student
2. Update roll number (e.g., "001") + email
3. Save
4. **Expected:** Roll number visible in roster row

### 4.5 Search roster
1. Type in the search box above the roster
2. **Expected:** Filters in real time to matching students

### 4.6 Remove student
1. Click trash icon → confirm
2. **Expected:** Student disappears immediately

### 4.7 Syllabus tab
1. Click "Syllabus" tab
2. **Expected:** 30-week pacing calendar with status (locked/active/completed)
3. Click a week to change status
4. **Expected:** Status updates

### 4.8 Set active week topic
1. In classroom detail, find the current week topic field
2. Change to "Week 5: Action Verbs" → save
3. **Expected:** Saved topic drives AI question generation for all student activities

---

## 5. Student Login Flow

### 5.1 Enter class code
1. Navigate to `http://localhost:3000/student/play`
2. Enter a valid class code from step 4.1
3. **Expected:** Student avatar grid appears

### 5.2 Select student and login
1. Click a student name/avatar
2. Enter 4-digit PIN (default: `1234`)
3. **Expected:** Redirect to `/student/home`
4. **Verify:** Student name + ⭐ points in header

### 5.3 Invalid class code
1. Enter a fake class code
2. **Expected:** Error "Classroom not found"

### 5.4 Wrong PIN
1. Select a student, enter wrong PIN
2. **Expected:** Error (login rejected, stays on login)

### 5.5 Token persistence
1. After login, open DevTools → Application → Local Storage
2. **Expected:** `primepal_student_token` key exists with a JWT value

---

## 6. Student Home Dashboard

### 6.1 Hero strip
1. Login as student, view `/student/home`
2. **Expected:** Gradient strip with student name, star count, avatar (DiceBear or ⭐ fallback), "Edit Character" button

### 6.2 All 6 activity cards visible
**Expected:** No locked cards. All 6 visible:
- 🎯 Daily Missions
- 💬 Chat with PrimePal
- 🐝 Spelling Bee
- 🏆 Leaderboard
- 📖 Story Time (full-width)
- 🎤 Speaking Practice (full-width)

### 6.3 Badges section
1. Check "Your Badges" shelf
2. **Expected:** Badges earned (lit up) vs. not earned (grayed) based on thresholds

### 6.4 Avatar customization
1. Click "Edit Character"
2. Select different style + color → Save
3. **Expected:** Avatar updates immediately in hero strip

---

## 7. Daily Missions (4-Pillar LMS)

### 7.1 Open missions dashboard
1. Navigate to `/student/missions`
2. **Expected:** 2×2 grid — Reading (red), Writing (blue), Listening (yellow), Speaking (green)

### 7.2 Start a pillar
1. Click "Reading"
2. **Expected:** 3–5s loading (AI generation) → "Question 1 of 10" with active week topic

### 7.3 Multiple choice
1. Click any option
2. **Expected:** Green (correct) or red (wrong) feedback + auto-advance after ~2s

### 7.4 15-second timer
1. Let timer reach 0 without answering
2. **Expected:** Auto-marked incorrect, feedback shown, advance

### 7.5 Fill-in-the-blank
1. Type answer in input → Submit
2. **Expected:** Correct/incorrect feedback with correct answer shown

### 7.6 Points update
1. Complete all 10 questions
2. **Expected:** Star counter in header increases
3. **Verify in Supabase:** `students.points` updated

---

## 8. Bilingual Chat

### 8.1 English message
1. Navigate to `/student/chat`
2. Type: "What is a noun?"
3. **Expected:** Grade-appropriate Minglish reply

### 8.2 Roman Urdu message
1. Type: "Mujhe noun ke baare mein batao"
2. **Expected:** Bilingual reply + "🇬🇧 English only" toggle button

### 8.3 English-only toggle
1. Click "🇬🇧 English only"
2. **Expected:** Switches to pure English
3. Click "🔄 Bilingual" → returns to Minglish

### 8.4 Grade guardrail
1. Type: "Explain quantum mechanics"
2. **Expected:** PrimePal redirects to age-appropriate topics

---

## 9. Spelling Bee

### 9.1 Load game
1. Navigate to `/student/spelling-bee`
2. **Expected:** First word with definition + example sentence

### 9.2 TTS playback
1. Click "🔊 Hear Word" → word reads aloud
2. Click "🔊 Hear Example" → sentence reads aloud

### 9.3 Correct spelling
1. Type correct spelling → Submit
2. **Expected:** Green feedback "✓ Correct!", +10 ⭐, next word

### 9.4 Wrong spelling
1. Type wrong spelling → Submit
2. **Expected:** Red feedback, correct spelling revealed

### 9.5 Finish all 5 words
1. Complete all 5
2. **Expected:** Summary: "X / 5 correct", total stars, Play Again + Home

### 9.6 Points in Supabase
- Check `students.points` → increased by `correct_count × 10`

---

## 10. Story Time

### 10.1 Load story
1. Navigate to `/student/story-time`
2. **Expected:** ~5s loading → story card with title + 4–6 sentence story

### 10.2 Read aloud
1. Click "🔊 Read Aloud"
2. **Expected:** Browser reads story at 0.8× speed

### 10.3 Comprehension questions
1. Click "Start Questions →"
2. 4 option buttons per question
3. Click an option → instant green/red highlight → auto-advance 1.5s

### 10.4 Finished screen
1. **Expected:** "X / 3 correct", stars earned, Play Again + Home buttons

### 10.5 Quests progress
1. Complete Story Time → navigate to `/student/quests`
2. **Expected:** 📚 Reading bar shows increased progress

### 10.6 Points
- `students.points` → +10 per correct answer (max +30)

---

## 11. Speaking Practice

> **Requires Chrome or Edge** — Firefox does NOT support `SpeechRecognition`

### 11.1 Browser compatibility check
1. Open `/student/speaking` in Firefox
2. **Expected:** "Please use Chrome or Edge" message, no recording UI

### 11.2 Load prompts (Chrome/Edge)
1. Navigate to `/student/speaking`
2. **Expected:** 3 prompts for active week topic, "Prompt 1 of 3" shown

### 11.3 Start recording
1. Click "🎤 Start Speaking"
2. Grant microphone permission
3. **Expected:** Pulsing mic animation + live transcript updates as you speak

### 11.4 Stop and review
1. Click "⏹ Stop Recording"
2. **Expected:** "You said: '...'" with your transcript

### 11.5 Try Again
1. Click "🔄 Try Again"
2. **Expected:** Returns to recording phase, transcript cleared

### 11.6 Submit
1. Click "Submit →"
2. **Expected:** LLM feedback + "+N ⭐", auto-advance to next prompt after 2.5s

### 11.7 Empty submission
1. Stop immediately without speaking → Submit
2. **Expected:** Score 0, "It looks like nothing was recorded. Try again!"

### 11.8 Complete all 3 prompts
1. **Expected:** "3 / 3 responses submitted", total stars, 🏠 Home

### 11.9 Quests progress
1. Navigate to `/student/quests` after completing
2. **Expected:** 🎤 Speaking bar shows increased progress

### 11.10 Interaction logging
- Supabase `student_interactions`: new rows with `interaction_type='speaking_practice'`, `pillar='speaking'`

---

## 12. Quests Page

### 12.1 Load page
1. Navigate to `/student/quests`
2. **Expected:** 2×2 grid: 📚 Reading (emerald), ✍️ Writing (violet), 👂 Listening (sky), 🎤 Speaking (rose)

### 12.2 Progress accuracy
1. Check one pillar — cross-reference against Supabase:
   ```sql
   SELECT COUNT(*) FROM student_interactions
   WHERE student_id = '...' AND pillar = 'reading'
   AND created_at >= NOW() - INTERVAL '7 days';
   ```
2. **Expected:** Matches "X / 10 questions this week"

### 12.3 Status badges
| Questions answered | Badge |
|---|---|
| 0 | "Not Started" (gray) |
| 1–9 | "In Progress" (amber) |
| ≥ 10 | "Done! ✓" (green) |

### 12.4 Cross-feature progress
1. Complete Story Time → Reading bar increments
2. Complete Speaking Practice → Speaking bar increments

---

## 13. Student Leaderboard

### 13.1 Load leaderboard
1. Navigate to `/student/leaderboard`
2. **Expected:** Classroom ranking by points, podium for top 3

### 13.2 Current student highlighted
1. **Expected:** Your row is visually distinct from others

### 13.3 Live points
1. Complete a mission → refresh leaderboard
2. **Expected:** Points updated, rank may change

---

## 14. Curriculum Hub (SNC Upload)

### 14.1 Upload PDF
1. Navigate to `/teacher/curriculum`
2. Drag-drop a SNC PDF, select grade 3, enter title
3. **Expected:** 3-phase loading → success "X chunks embedded"

### 14.2 Reject non-PDF
1. Try uploading `.jpg` or `.txt`
2. **Expected:** Error "Only PDF files are accepted"

### 14.3 Verify in Supabase
- `snc_knowledge_base`: new rows with correct `grade_level` metadata

### 14.4 RAG test
1. Login as Grade 3 student → ask about a topic in the PDF
2. **Expected:** Chat reply references relevant concepts

---

## 15. Teacher Dashboard v2

### 15.1 Four KPI cards
1. Navigate to `/teacher/dashboard`
2. **Expected:** 4 stat cards: Total Students, Active This Week, Total Interactions, Avg Accuracy %

### 15.2 Active This Week accuracy
1. Have a student complete any activity → refresh dashboard
2. **Expected:** "Active This Week" increases (if student was previously inactive this week)

### 15.3 At-Risk widget
1. Have a student answer many questions incorrectly (< 40% accuracy, ≥ 5 total)
2. Refresh dashboard
3. **Expected:** "Needs Attention" section appears with that student
4. Click "View Report" → redirects to `/teacher/reports?studentId=...`

### 15.4 No at-risk = section hidden
1. All students ≥ 40% OR < 5 interactions
2. **Expected:** "Needs Attention" section not rendered

### 15.5 Six Quick Actions
1. **Expected:** Students, Reports, Analytics, Classrooms, Curriculum, Upload SNC
2. Each links to correct route

---

## 16. Student Directory

### 16.1 Load page
1. Navigate to `/teacher/students`
2. **Expected:** Table of all students across all classrooms

### 16.2 Search by name/roll number
1. Type in search box
2. **Expected:** Real-time filtering

### 16.3 Filter by classroom / grade
1. Select from dropdowns
2. **Expected:** Table narrows to matching students

### 16.4 Accuracy color coding
| Accuracy | Color |
|---|---|
| ≥ 70% | Green |
| 40–69% | Amber |
| < 40% | Red |
| No interactions | "—" |

### 16.5 Active/Inactive badge
- Green "Active" = activity in last 7 days
- Gray "Inactive" = no recent activity

### 16.6 Report link
1. Click "Report →" on any student
2. **Expected:** `/teacher/reports?studentId={id}` with report auto-generating

---

## 17. Student Report Cards

### 17.1 Generate report
1. Navigate to `/teacher/reports`
2. Select a student → click "Generate Report"
3. **Expected:** "AI is analysing…" → full report card after ~10s

### 17.2 Deep link
1. Click "Report →" anywhere in the app
2. **Expected:** Report auto-loads for that student via `?studentId=` URL param

### 17.3 Profile section
1. **Expected:** Name, roll number, classroom, grade level
2. Engagement badge: "High" (green) / "Medium" (amber) / "Low" (red)
3. ⭐ total points

### 17.4 Overall stats
1. **Expected:** Total Questions, Overall Accuracy %, Stars Earned
2. Accuracy color matches the scale (≥70% green, ≥40% amber, <40% red)

### 17.5 LSRW pillar breakdown
1. **Expected:** 4 pillar cards with colored progress bars
2. Each: accuracy %, "X / Y correct"
3. No activity → "No activity yet" (grayed)

### 17.6 AI Insights
1. **Expected:**
   - Teacher Note blockquote (1–2 sentences)
   - Strengths: green chips
   - Needs Work: amber chips
   - Recommended Topics: indigo chips

### 17.7 Export PDF
1. Click "Export PDF"
2. **Expected:** Downloads `report-{Name}-{date}.pdf`
3. Open PDF: verify student name header, stats table, pillar table, AI text

### 17.8 Authorization
1. Teacher B cannot view Teacher A's students
2. **Expected:** 403 Forbidden from API

---

## 18. Analytics Dashboard

### 18.1 Load analytics
1. Navigate to `/teacher/analytics`
2. **Expected:** Global stats across all classrooms

### 18.2 By Student tab
1. All students listed with accuracy badges
2. SearchBar filters by name/roll number
3. Click "Report" → AI insights panel

### 18.3 By Grade tab
1. Grade-level aggregates: student count + avg accuracy

### 18.4 By Section tab
1. Per-classroom breakdown: class name, grade, student count, avg accuracy

---

## 19. Admin Role System

### 19.1 Admin login
1. Navigate to `http://localhost:3000/admin/login`
2. Enter admin credentials
3. **Expected:** Redirect to `/admin/dashboard/staff`

### 19.2 Create admin invite
1. Click "Invite Admin" → enter email
2. **Expected:** Invite code generated and displayed
3. Check Supabase `admin_invite_codes` — new row with 7-day expiry

### 19.3 New admin signup
1. Go to `/admin/login`, enter invite code
2. **Expected:** Code validated → sign-up form shown
3. Fill name + password → submit
4. **Expected:** Account created, auto-login to admin dashboard

### 19.4 Staff Directory
1. `/admin/dashboard/staff` → all teachers listed with role badges

### 19.5 Reassign classroom
1. `/admin/dashboard/hierarchy` → click "Reassign" on a classroom
2. Select new teacher → confirm
3. **Expected:** Classroom assigned to new teacher; Supabase `admin_audit_log` updated

### 19.6 Delete curriculum
1. `/admin/dashboard/curriculum` → trash icon on a chunk → confirm
2. **Expected:** Removed from `snc_knowledge_base`

### 19.7 Block non-admin teacher
1. Login as regular teacher → navigate to `http://localhost:3000/admin/dashboard`
2. **Expected:** Redirect to `/admin/login`

---

## 20. Evolving Worlds (Dynamic Backgrounds)

### 20.1 Test Day/Night Cycle Detection
1. Student logs in at any time (e.g., 9:00 AM — day mode)
2. Navigate to `/student/home`
3. **Expected:** Background shows bright sky blue gradient, sun icon, clouds
4. **To test night mode:**
   - Open browser DevTools → Console
   - Run: `localStorage.setItem('test_force_night_mode', 'true')` (mock override)
   - Refresh page
   - **Expected:** Background shows dark indigo/blue gradient, moon icon, desk lamps (Tier 1), or other night elements

### 20.2 Test Tier 1 Classroom (0-49 missions)
1. Student with 0 missions logs in (new account)
2. Navigate to `/student/home`
3. **Expected visuals:**
   - Day: Bright sky blue background, sun ☀️, clouds ☁️, rotating clock ⏰
   - Night: Dark blue background, moon 🌙, glowing desk lamps 💡, rotating clock ⏰
   - Dust motes float lazily in sunbeams (day only)

### 20.3 Test Tier 2 Jungle (50-99 missions)
1. Update student `missions_completed = 50` in Supabase
2. Refresh page
3. **Expected visuals:**
   - Day: Warm amber-emerald gradient, large sun ☀️, green leaves 🍃, flame 🔥
   - Night: Dark green-slate gradient, moon 🌙, dark foliage, flame 🔥
   - Butterflies 🦋 fly across screen from left to right (18s cycle) + right to left (20s cycle, offset by 10s)

### 20.4 Test Tier 3 Space Station (100+ missions)
1. Update student `missions_completed = 100` in Supabase
2. Refresh page
3. **Expected visuals:**
   - Day: Cosmic blue-purple gradient, sun ☀️, stars ⭐, planets 🪐
   - Night: Deep space gradient, glowing stars ⭐ (drifting in parallax), neon sparkles ✨ (pulsing), planets 🪐
   - Astronaut 🧑‍🚀 bobs up/down (zero gravity effect, 4s cycle)
   - Floating satellite spins with combined bobbing motion

### 20.5 Check Performance
- Open DevTools → Performance tab
- Scroll/interact with page
- **Expected:** No janky animations, smooth 60 FPS (especially for continuous animations like clock rotation, star drift, sparkle pulsing)

---

## 21. Surprise Daily Chest (Loot Box) — Complete

### Backend Testing

#### 21.1 Test Anti-Cheat: First Claim of Day
1. **Setup:** Student must not have claimed reward today (check `last_daily_reward_at` is NULL or yesterday)
2. Call: `POST /api/v1/rewards/claim-daily` with student JWT
3. **Expected response (HTTP 200):**
   ```json
   {
     "reward_type": "stars_25" | "stars_50" | "multiplier_2x",
     "amount": 25 | 50 | 0,
     "new_total": <updated_points>,
     "message": "You earned +25 Stars! ⭐" | "..." | "..."
   }
   ```
4. **Expected in database:** `last_daily_reward_at` updated to current UTC timestamp, `points` incremented by reward amount.

#### 21.2 Test Anti-Cheat: Second Claim Same Day (SHOULD FAIL)
1. Call again: `POST /api/v1/rewards/claim-daily` with same student JWT (within 24 hours)
2. **Expected response (HTTP 400):**
   ```json
   {
     "detail": "You have already claimed your daily reward today. Come back tomorrow!"
   }
   ```
3. **Expected in database:** No changes to `points` or `last_daily_reward_at`.

#### 21.3 Test Reward Distribution (RNG)
1. Create 3+ test students
2. Manually set `last_daily_reward_at = NULL` for each in Supabase
3. Call `POST /api/v1/rewards/claim-daily` for each
4. Log responses
5. **Expected:** Mix of `stars_25` (70%), `stars_50` (20%), `multiplier_2x` (10%) rewards (verify distribution across 3+ claims)

#### 21.4 Test Status Endpoint
1. Student who HAS claimed today: `GET /api/v1/rewards/status`
   - **Expected:** `{ "has_claimed_today": true, "last_claimed_at": "<ISO_timestamp>" }`
2. Student who HAS NOT claimed today: `GET /api/v1/rewards/status`
   - **Expected:** `{ "has_claimed_today": false, "last_claimed_at": null }`

#### 21.5 Simulate Day Boundary (UTC)
1. Update Supabase `last_daily_reward_at` to yesterday 11:59 PM UTC (manually)
2. Backend server time is tomorrow 12:01 AM UTC
3. Call `POST /api/v1/rewards/claim-daily`
4. **Expected:** Success (HTTP 200) — different calendar days

### Frontend Testing

#### 21.6 Test Modal Auto-Open on First Login
1. Student with `last_daily_reward_at = NULL` logs in
2. Navigate to `/student/home`
3. **Expected:** Chest modal automatically appears (full-screen overlay with dark backdrop)
4. **Modal displays:**
   - Title: "Daily Chest! 🎁"
   - Instruction: "Tap the chest 3 times to unlock your reward"
   - Closed chest emoji: 📦
   - Tap progress: "0 / 3"
   - Progress bar: empty (0%)

#### 21.7 Test Chest Tap Interactions (Taps 1-2)
1. Modal open, tap chest once
2. **Expected:**
   - Chest shakes (translateX + rotateZ animation)
   - "Thud" sound plays (if not muted)
   - Spark emoji ✨ floats up around chest
   - Tap progress updates: "1 / 3"
   - Progress bar fills to ~33%
3. Repeat for tap 2 (same animations + sounds)
   - Progress: "2 / 3"
   - Progress bar: ~66%
4. **Verify:** No reward is shown yet; chest remains closed

#### 21.8 Test Chest Open Animation (Tap 3)
1. Tap chest third time
2. **Expected sequence:**
   - Chest shakes one final time
   - "Fanfare" sound plays (if not muted)
   - Progress bar fills to 100%
   - 1.5-second delay (showing closed chest)
3. **Then reward animates:**
   - Chest emoji changes from 📦 to 📂 (opens)
   - Reward emoji (⭐ or 🚀) floats upward from chest
   - Reward emoji rotates 360° while floating
   - Reward glows with golden filter effect
   - Confetti bursts from multiple directions (4-stage effect)

#### 21.9 Test Confetti Burst Effect
1. After tap 3, observe confetti animation
2. **Expected:**
   - Stage 1 (0ms): 60 particles burst from center upward
   - Stage 2 (100ms delay): 40 particles burst from left side
   - Stage 3 (200ms delay): 40 particles burst from right side
   - Stage 4 (continuous for 1s): Micro-bursts of 15 particles at random angles
3. **Quality check:** Particles have gravity, fade out smoothly, colors vary (gold, orange, pink, cyan, purple)

#### 21.10 Test Reward Message Display
1. After reward animation (tap 3 + animations complete)
2. **Expected to show:**
   - Large message text: "🎉 You earned 25 stars!" (or 50 stars / 2x multiplier)
   - Glassmorphic card with:
     - "Total Stars" label
     - Star emoji + total points (e.g., "⭐ 150")
     - Glow animation (scale + drop-shadow pulsing)
   - "Collect Reward!" button
3. **Duration:** Message visible for ~2 seconds before modal closes automatically

#### 21.11 Test Star Count Update
1. Note the star count in the header BEFORE claiming
2. Complete tap 3 and reward animation
3. **Expected:** Header star count updates to reflect new total
4. **Example:** Was "125" → becomes "150" (if +25 stars)

#### 21.12 Test Modal Auto-Close
1. After reward message displays for ~2 seconds
2. **Expected:** Modal animates out (AnimatePresence from framer-motion)
3. **Result:** Dashboard is visible again, star count reflects new total

#### 21.13 Test Already-Claimed Behavior
1. Student who already claimed today logs in
2. Navigate to `/student/home`
3. **Expected:** Modal does NOT appear
4. Dashboard shows normally with no prompts

#### 21.14 Test Mute State Respect
1. Toggle sound mute in app (if mute control exists)
2. Open chest modal and tap
3. **Expected:** No sounds play despite taps (thud, fanfare are silent)
4. **Note:** Confetti still plays (it's visual, not audio)

#### 21.15 Test Non-Closeable Modal
1. Modal is open
2. Click on dark backdrop (around the chest)
3. **Expected:** Modal does NOT close (interaction prevented)
4. **Note:** Must tap chest 3 times to proceed

#### 21.16 Responsive Design Check
1. Test on mobile viewport (375px width)
2. Test on tablet (768px width)
3. Test on desktop (1920px width)
4. **Expected:**
   - Modal and chest emoji scale appropriately
   - Text remains readable
   - Confetti still bursts smoothly
   - Touch/tap interactions are responsive

---

## 22. API Smoke Tests (curl)

Replace `TOKEN` with a teacher JWT (from browser DevTools → Supabase session storage).
Replace `STUDENT_TOKEN` with student JWT (from `localStorage.primepal_student_token`).
Replace `STUDENT_ID` with an actual student UUID.

```bash
# Health check
curl http://localhost:8000/

# Dashboard stats (teacher)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/v1/evaluator/dashboard-stats

# Global students list (teacher)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/v1/evaluator/students

# Student detailed report (teacher)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/api/v1/evaluator/report/student/STUDENT_ID/detailed"

# Speaking prompts (student)
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/speaking/prompts

# Story (student)
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/story-time/story

# Spelling words (student)
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/spelling-bee/words

# Weekly quest progress (student)
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/missions/weekly-progress

# Leaderboard (student)
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/missions/leaderboard

# Daily reward claim (student)
curl -X POST -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/rewards/claim-daily

# Daily reward status (student)
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:8000/api/v1/rewards/status
```

**Expected for all:** HTTP 200 with JSON body (not 401/403/500).

---

## 23. Known Limitations

| Limitation | Details |
|---|---|
| **Speaking Practice browser** | Requires Chrome or Edge. Firefox lacks `SpeechRecognition`. A "Use Chrome" message is shown. |
| **Report Card generation time** | AI call takes ~10 seconds. Loading spinner + "AI is analysing…" message shown. Expected. |
| **Spelling Bee TTS quality** | Uses browser `speechSynthesis` — voice quality varies by OS. Chrome on Windows is best. |
| **Story Time TTS speed** | Set to 0.8× rate for primary school children. May sound slow on some voices. |
| **Client-side correct check** | Story Time + Spelling Bee: server trusts `correct: bool` from client (thesis prototype). Production would verify server-side. |
| **At-Risk threshold** | Hardcoded: ≥5 interactions AND <40% accuracy. Adjustable in `dashboard/page.tsx`. |
| **is_correct column bug** | `GET /evaluator/report/teacher` queries `is_correct` (wrong) — actual column is `correct`. Analytics "By Section" accuracy may show 0%. Fix: rename in that query. |
| **Offline support** | None. All LLM calls require active internet (OpenAI API). |
| **Multi-teacher classrooms** | Not supported. One classroom = one teacher. |

---

## 24. Quick Reference: All Routes

### Student Routes
| Route | Description |
|---|---|
| `/student/play` | Class code entry + PIN login |
| `/student/home` | Home dashboard (all activities) |
| `/student/missions` | 4-pillar mission selector |
| `/student/missions/[pillar]` | Gameplay (10 questions, 15s timer) |
| `/student/chat` | Bilingual AI chat |
| `/student/spelling-bee` | Spelling Bee game |
| `/student/story-time` | Reading comprehension |
| `/student/speaking` | Voice speaking practice |
| `/student/quests` | Weekly 4-pillar progress |
| `/student/leaderboard` | Classroom ranking |

### Teacher Routes
| Route | Description |
|---|---|
| `/teacher/login` | Email/password login |
| `/teacher/dashboard` | KPI stats + At-Risk + Quick Actions |
| `/teacher/classroom` | Classroom CRUD |
| `/teacher/classroom/[id]` | Roster + syllabus tabs |
| `/teacher/students` | Global student directory |
| `/teacher/analytics` | By Student / Grade / Section |
| `/teacher/reports` | Per-student AI report cards + PDF |
| `/teacher/curriculum` | SNC PDF upload + embedding |

### Admin Routes
| Route | Description |
|---|---|
| `/admin/login` | Admin login / invite code signup |
| `/admin/dashboard/staff` | Teacher management |
| `/admin/dashboard/hierarchy` | Classroom reassignment |
| `/admin/dashboard/curriculum` | Global curriculum management |

### Key Backend Endpoints (`/api/v1`)
| Endpoint | Auth | Description |
|---|---|---|
| `POST /auth/student/login` | Public | Student login → JWT |
| `GET /classroom/` | Teacher | List classrooms |
| `POST /classroom/` | Teacher | Create classroom |
| `POST /curriculum/upload` | Teacher | PDF upload → embed |
| `POST /chat` | Student | Bilingual RAG chat |
| `GET /missions/pillar` | Student | 10 pillar questions |
| `POST /missions/complete` | Student | Award points |
| `GET /missions/weekly-progress` | Student | 4-pillar Quests data |
| `GET /missions/leaderboard` | Student | Classroom ranking |
| `GET /spelling-bee/words` | Student | 5 spelling words |
| `POST /spelling-bee/submit` | Student | Submit spelling |
| `GET /story-time/story` | Student | Story + 3 questions |
| `POST /story-time/answer` | Student | Submit answer |
| `GET /speaking/prompts` | Student | 3 speaking prompts |
| `POST /speaking/evaluate` | Student | Evaluate transcript |
| `GET /evaluator/dashboard-stats` | Teacher | KPI stats incl. active_this_week |
| `GET /evaluator/students` | Teacher | All students + stats |
| `GET /evaluator/report/student/{id}/detailed` | Teacher | Full pillar + AI report |
| `GET /evaluator/report/classroom/{id}` | Teacher | Classroom summary |
| `POST /rewards/claim-daily` | Student | Claim daily chest reward (anti-cheat) |
| `GET /rewards/status` | Student | Check if claimed today |
| `DELETE /admin/curriculum/{id}` | Admin | Delete curriculum chunk |
