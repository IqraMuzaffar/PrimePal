# Frontend Components

Reusable components organized by domain. Detailed documentation per category is linked below.

- [Student Components](./student.md) -- gameplay, missions, tasks, gamification
- [Teacher Components](./teacher.md) -- dashboard, analytics, classroom management
- [Landing Components](#landing-components) -- homepage hero animations

---

## Student Components (`components/student/`)

| Component | File | Description |
|-----------|------|-------------|
| `AnimatedBackground` | `AnimatedBackground.tsx` | Gradient background with floating geometric shapes for student pages |
| `DynamicBackground` | `DynamicBackground.tsx` | Day/night cycle + 3-tier themed environment (classroom / jungle / space) |
| `MissionsDashboard` | `MissionsDashboard.tsx` | Four-pillar selection screen with performance summary |
| `MissionGameplay` | `MissionGameplay.tsx` | Core gameplay loop: progress bar, timer, task routing, score popups, summary |
| `PillarCard` | `PillarCard.tsx` | Clickable card for a single pillar (reading/writing/listening/speaking) |
| `AchievementPopup` | `AchievementPopup.tsx` | Full-screen animated popup for unlocked achievements (bronze/silver/gold) |
| `AvatarCustomizeModal` | `AvatarCustomizeModal.tsx` | Modal for choosing avatar style (DiceBear) and theme color |
| `DailyChestModal` | `DailyChestModal.tsx` | Interactive tap-to-open reward chest with confetti |
| `StreakCounter` | `StreakCounter.tsx` | Flame badge showing current/longest streak with popover |
| `QuestionTimer` | `QuestionTimer.tsx` | Countdown timer bar with offline pause support |
| `SpeakingPronunciationFeedback` | `SpeakingPronunciationFeedback.tsx` | Word-level pronunciation score visualization |
| `OfflineBanner` | `OfflineBanner.tsx` | Non-alarming banner for offline mode with pending answer count |

### Task Components (`components/student/tasks/`)

| Component | File | Category | Description |
|-----------|------|----------|-------------|
| `TaskRouter` | `tasks/TaskRouter.tsx` | Router | Maps `task_type` string to the correct task component |
| `LegacyMultipleChoice` | `tasks/LegacyMultipleChoice.tsx` | Fallback | Multiple-choice or text-input fallback for unknown task types |
| **Reading** | | | |
| `SentencePictureMatch` | `tasks/reading/SentencePictureMatch.tsx` | Reading | Match sentence to correct emoji picture |
| `OddOneOut` | `tasks/reading/OddOneOut.tsx` | Reading | Identify the word that does not belong |
| `FillBlankWordBank` | `tasks/reading/FillBlankWordBank.tsx` | Reading | Fill the blank by selecting from a word bank |
| `PassageTrueFalse` | `tasks/reading/PassageTrueFalse.tsx` | Reading | Read a passage and answer True/False |
| **Writing** | | | |
| `SentenceScramble` | `tasks/writing/SentenceScramble.tsx` | Writing | Drag-and-drop words into correct sentence order |
| `MissingLetter` | `tasks/writing/MissingLetter.tsx` | Writing | Fill in missing letters from a letter grid |
| `GuidedTranslation` | `tasks/writing/GuidedTranslation.tsx` | Writing | Translate an Urdu prompt by tapping word bank chips |
| **Listening** | | | |
| `ListenAndChoose` | `tasks/listening/ListenAndChoose.tsx` | Listening | Listen to audio, choose the matching picture |
| `SimonSays` | `tasks/listening/SimonSays.tsx` | Listening | Listen to an instruction, pick the correct action |
| `ListenAndSpell` | `tasks/listening/ListenAndSpell.tsx` | Listening | Listen to a word and type its spelling |
| **Speaking** | | | |
| `RepeatAfterMe` | `tasks/speaking/RepeatAfterMe.tsx` | Speaking | Listen then record yourself saying the same phrase |
| `WhatIsThis` | `tasks/speaking/WhatIsThis.tsx` | Speaking | See an emoji/image and say what it is |
| `FinishTheSentence` | `tasks/speaking/FinishTheSentence.tsx` | Speaking | Read a sentence start, say the complete sentence |
| **Shared** | | | |
| `AudioPlayButton` | `tasks/shared/AudioPlayButton.tsx` | Shared | TTS play button using Web Speech API |
| `EmojiCard` | `tasks/shared/EmojiCard.tsx` | Shared | Selectable emoji card with feedback states |
| `HintButton` | `tasks/shared/HintButton.tsx` | Shared | Toggle button to reveal Urdu hint text |
| `LetterGrid` | `tasks/shared/LetterGrid.tsx` | Shared | Grid of tappable letter buttons |
| `MissionRecorder` | `tasks/shared/MissionRecorder.tsx` | Shared | Audio recorder with retry logic (max 3 attempts) |
| `WordChip` | `tasks/shared/WordChip.tsx` | Shared | Selectable word chip with correct/incorrect states |

---

## Teacher Components (`components/teacher/`)

| Component | File | Description |
|-----------|------|-------------|
| `TeacherShell` | `TeacherShell.tsx` | Top navbar layout with responsive mobile drawer, settings modal, logout |
| `TabbedDashboard` | `TabbedDashboard.tsx` | Analytics dashboard with four tab views (overview/grade/class/student) |
| `TabNavigation` | `TabNavigation.tsx` | Animated tab bar for the analytics dashboard |
| `FilterBar` | `FilterBar.tsx` | URL-driven filter bar (search, grade, pillar dropdowns) |
| `SearchBar` | `SearchBar.tsx` | Controlled text input with search icon |
| `AnalyticsOverview` | `AnalyticsOverview.tsx` | Summary stats, skill accuracy bars, weekly trend chart, top 5 students |
| `AnalyticsByGrade` | `AnalyticsByGrade.tsx` | Grade-level drill-down: stats, pillar accuracy, idle students, weekly trend |
| `AnalyticsByClass` | `AnalyticsByClass.tsx` | Section-level leaderboard and activity feed (per grade + section) |
| `AnalyticsByStudent` | `AnalyticsByStudent.tsx` | Searchable, paginated student table with accuracy/status badges |
| `CreateClassroomModal` | `CreateClassroomModal.tsx` | Modal form: grade, section, optional name |
| `BulkAddStudentsModal` | `BulkAddStudentsModal.tsx` | Modal: paste student names (comma/newline separated) |
| `EditStudentModal` | `EditStudentModal.tsx` | Modal: edit name, roll number, email |
| `FileUploadZone` | `FileUploadZone.tsx` | Drag-and-drop PDF upload with progressive state labels |
| `UploadBookModal` | `UploadBookModal.tsx` | Modal: upload PDF with book title and optional topic tag |
| `TopicSelectionBySkill` | `TopicSelectionBySkill.tsx` | Toggle topics per LSRW skill for a classroom |

---

## Landing Components (`components/landing/`)

| Component | File | Description |
|-----------|------|-------------|
| `FloatingEmojis` | `AnimatedHero.tsx` | Animated floating emoji decorations |
| `AnimatedHeroSection` | `AnimatedHero.tsx` | Stagger-animated container for hero text |
| `AnimatedHeroItem` | `AnimatedHero.tsx` | Stagger child wrapper (generic) |
| `AnimatedHeroH1` | `AnimatedHero.tsx` | Stagger-animated h1 element |
| `AnimatedHeroP` | `AnimatedHero.tsx` | Stagger-animated paragraph element |
| `AnimatedCard` | `AnimatedHero.tsx` | Slide-in wrapper for role cards (student/teacher) |
| `AnimatedCardInner` | `AnimatedHero.tsx` | Inner card surface with hover/tap scaling |
| `AnimatedFooter` | `AnimatedHero.tsx` | Fade-in footer text |
