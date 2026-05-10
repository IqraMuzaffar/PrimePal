# Student Pages

All student pages live under `frontend/app/student/`. Auth is via custom PyJWT stored in `localStorage['primepal_student_token']`.

---

## Layout: `student/layout.tsx`

**Type**: Client component (`"use client"`)

**Purpose**: Wraps all student pages with navigation, streak counter, offline detection, and logout.

**Hooks**:
- `useStudentProfile()` -- fetches student name, avatar, points
- `useStreak()` -- fetches current streak data

**Nav Links**: Home, Chat, Missions, Quests, Badges, Leaderboard

**Logout**: Clears localStorage keys `primepal_student_token`, `primepal_student_name`, `primepal_student_avatar`, then redirects to `/student/play`.

**Wrapper Components**:
- `DynamicBackground` -- animated background per route
- `AnimatedBackground` -- additional background effects
- `OfflineBanner` -- shows banner when network is unavailable
- `StreakCounter` -- displays current streak in header

---

## `/student/play` -- Student Login

**File**: `student/play/page.tsx`

**Purpose**: 3-step student login flow.

**State Variables**:
- `step`: `"enter-code" | "pick-avatar" | "enter-pin"`
- `classCode`: string -- classroom code entered by student
- `avatars`: array -- available avatars for the classroom
- `selectedAvatar`: object -- chosen avatar
- `loading`: boolean
- `error`: string

**Step 1 -- Enter Class Code**:
- Input field for classroom code
- Calls `GET /auth/classroom/{code}/avatars` via `apiFetch`
- On success: populates `avatars` array, advances to step 2

**Step 2 -- Pick Avatar**:
- Renders `AvatarSelect` component with grid of available DiceBear avatars
- Student selects one, advances to step 3

**Step 3 -- Enter PIN**:
- Renders `PinEntry` component (4-digit PIN)
- On submit: authenticates, stores JWT in localStorage, redirects to `/student/home`

---

## `/student/home` -- Student Dashboard

**File**: `student/home/page.tsx`

**Purpose**: Main landing page after login. Shows gamified dashboard with quick-launch cards, daily rewards, and achievements.

**Hooks**:
- `useStudentProfile()` -- name, avatar, points, level
- `useStreak()` -- current streak
- `useDailySummary()` -- today's activity summary
- `useRewardStatus()` -- daily chest availability
- `useAchievements()` -- unlocked achievements list
- `useAnnouncement()` -- active school/classroom announcement
- `useClaimReward()` -- mutation to claim daily chest reward

**State Variables**:
- `showModal`: boolean -- avatar customization modal
- `avatarStyle`: string -- current avatar variant
- `themeColor`: string -- selected theme color
- `quoteIndex`: number -- current motivational quote
- `isDailyChestOpen`: boolean
- `claimingReward`: boolean
- `dailyReward`: object -- reward data after claim
- `achievementPopup`: object | null -- newly unlocked achievement
- `streakResetBanner`: boolean

**Key Components**:
- `AvatarCustomizeModal` -- change avatar style
- `DailyChestModal` -- animated chest opening with reward display
- `AchievementPopup` -- toast notification for new badges

**Sections**:
1. Announcement banner (if active)
2. Hero strip with avatar, name, level, points
3. Quick-launch cards: Missions, Chat, Spelling Bee, Leaderboard, Story Time, Speaking
4. Achievements shelf (horizontal scroll)
5. Motivational quotes rotation

---

## `/student/chat` -- Bilingual Chatbot

**File**: `student/chat/page.tsx`

**Purpose**: Streaming chat interface with the AI tutor. Supports bilingual (English/Urdu) toggle.

**State Variables**:
- `messages`: array of `{ id, role, content, english?, urdu? }`
- `input`: string -- current message text
- `loading`: boolean -- streaming in progress
- `showEnglish`: `Set<string>` -- set of message IDs where English translation is shown

**API Call**:
- `POST ${NEXT_PUBLIC_API_URL}/chat/stream`
- Headers: `Authorization: Bearer <localStorage token>`, `Content-Type: application/json`
- Body: `{ message: string }`
- Response: `text/event-stream` (SSE)
- Parses `data: JSON` lines with `{ token, done, english, urdu }` fields
- Tokens are appended incrementally for typing effect

**Bilingual Toggle**: Each tutor message can show English or Urdu version. Toggle tracked by message ID in `showEnglish` Set.

---

## `/student/missions` -- Mission Dashboard

**File**: `student/missions/page.tsx`

**Purpose**: Thin wrapper that renders the `MissionsDashboard` component.

**Components**: `MissionsDashboard` -- displays four pillar cards (reading, writing, listening, speaking) with progress indicators.

---

## `/student/missions/[pillar]` -- Mission Gameplay

**File**: `student/missions/[pillar]/page.tsx`

**Purpose**: Interactive gameplay for a specific skill pillar (reading, writing, listening, or speaking).

**Hooks**:
- `useMissionPillar(pillar)` -- fetches mission questions for the pillar

**API Calls**:
- On complete: `POST /missions/complete` per result item
- Body includes: `mission_id`, `answers`, `score`, `time_taken`

**Offline Support**:
- Failed POST requests are queued via `addPendingAnswer()` into localStorage
- On component mount, `flushPendingAnswers()` replays any queued submissions
- Renders `MissionGameplay` component for the actual game UI

---

## `/student/speaking` -- Speaking Practice

**File**: `student/speaking/page.tsx`

**Purpose**: Audio recording practice with AI pronunciation evaluation.

**Hooks**:
- `useSpeakingPrompts()` -- fetches speaking prompt list

**State Variables (GameState)**:
- `"loading"` -- fetching prompts
- `"intro"` -- showing prompt text before recording
- `"recording"` -- MediaRecorder active, capturing audio
- `"reviewing"` -- playback of recorded audio
- `"result"` -- showing evaluation scores
- `"retry"` -- option to retry (up to 3 attempts)
- `"finished"` -- all prompts completed

**Audio Recording**:
- Uses `MediaRecorder` API
- Captures `audio/webm` format
- Stores chunks in array, creates Blob on stop

**API Call**:
- `POST /speaking/evaluate-pro`
- Content-Type: `multipart/form-data` (FormData)
- Fields: `audio_file` (Blob), `prompt_id`, `prompt_text`, `attempt_number`
- Uses raw `fetch()` with Bearer token from localStorage

**Retry Logic**: Up to 3 attempts per prompt. Noise detection triggers a toast notification.

**Components**: `SpeakingPronunciationFeedback` -- displays phoneme-level scores and feedback.

---

## `/student/spelling-bee` -- Spelling Practice

**File**: `student/spelling-bee/page.tsx`

**Purpose**: Audio-based spelling practice using Web Speech API for pronunciation.

**Hooks**:
- `useSpellingWords()` -- fetches word list for the session

**State Variables**:
- `gameState`: `"loading" | "playing" | "result" | "finished"`
- `words`: array of spelling words
- `currentWordIndex`: number
- `userInput`: string -- typed spelling attempt
- `attemptCount`: number -- current attempt (max 2)
- `score`: number -- running score

**Speech**: Uses `window.speechSynthesis` (Web Speech API) to pronounce each word. Student hears the word, then types it.

**API Call**:
- `POST /spelling-bee/submit` via `apiFetch`
- Body: word_id, attempt, is_correct, user_answer

**Rules**: 2 attempts per word. First correct = full points; second correct = partial points.

---

## `/student/story-time` -- AI Story Reading

**File**: `student/story-time/page.tsx`

**Purpose**: AI-generated stories with text-to-speech read-aloud and comprehension MCQs.

**Hooks**:
- `useStoryTime()` -- fetches story data (text + questions)

**State Variables**:
- `gameState`: `"loading" | "reading" | "questioning" | "finished"`

**Text-to-Speech**: Uses `window.speechSynthesis` (`SpeechSynthesis` API) to read the story aloud paragraph by paragraph.

**API Call**:
- `POST /story-time/answer` via `apiFetch`
- Body: story_id, question_id, selected_answer

**MCQ**: Each question has a `correct_index`. Client-side checking with visual feedback (green/red highlight).

---

## `/student/achievements` -- Badge Display

**File**: `student/achievements/page.tsx`

**Purpose**: Displays all achievements/badges with unlock status and progress.

**Hooks**:
- `useAchievements()` -- fetches full achievement catalog with unlock status

**Display**:
- **Unlocked achievements**: Shown with colored tier badges (bronze, silver, gold)
- **Locked achievements**: Grayed out with progress bars showing `current_progress / threshold_value`

---

## `/student/evaluation` -- Pre/Post Test

**File**: `student/evaluation/page.tsx`

**Purpose**: Formal pre-test and post-test evaluations.

**Hooks**:
- `useEvalStatus()` -- determines whether student needs pre-test or post-test
- `useEvalQuestions(evalType)` -- fetches questions for the determined eval type

**Question Types**:
- `likert_emoji` -- emoji-based Likert scale (psychometric questions)
- Standard MCQ -- multiple choice questions

**Audio Hints**: For listening/speaking category questions, uses `window.speechSynthesis` to play audio prompts.

**API Call**:
- `POST /evaluations/submit` via `studentMutate`
- Body: `{ evaluation_type, answers: [...] }`

**Flow**: Determines pre vs post from `useEvalStatus()`. Renders questions sequentially. Submits all answers at end.

---

## `/student/leaderboard` -- Classroom Ranking

**File**: `student/leaderboard/page.tsx`

**Purpose**: Shows classroom points leaderboard.

**Hooks**:
- `useStudentLeaderboard()` -- fetches ranked student list for the classroom

**Display**:
- **Top 3**: Podium layout with 1st/2nd/3rd place styling (gold, silver, bronze)
- **Remaining**: Standard ranked list
- **Current student**: Highlighted with "YOU" badge and indigo border for easy identification
