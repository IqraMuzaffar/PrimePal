# Student Components

Detailed reference for all components under `frontend/components/student/`.

---

## Shared Types

All task components receive the same `TaskProps` interface (from `@/types/missions`):

```ts
interface TaskProps {
  question: MissionQuestion;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  disabled: boolean;
}

interface MissionQuestion {
  id: number;
  task_type: string;
  pillar: string;
  question: string;
  difficulty: string;
  points_value: number;
  emoji_hint: string;
  correct_answer?: string;
  options?: QuestionOption[];
  passage?: string;
  audio_text?: string;
  image_context?: string;
  image_options?: QuestionOption[];
  word_bank?: string[];
  correct_order?: string[];
  word_with_blanks?: string;
  letter_options?: string[];
  sentence_start?: string;
  urdu_hint?: string;
  // Legacy compat
  type?: string;
  question_text?: string;
}

interface QuestionOption {
  id: string;
  text: string;
  emoji?: string;
}
```

---

## Top-Level Student Components

### MissionsDashboard

**File:** `components/student/MissionsDashboard.tsx`

**Props:** None (fetches its own data).

**State:**
- `performance: PerformanceProfile | null` -- fetched from `/missions/performance`
- `perfLoading: boolean`

**Behavior:**
- On mount, reads `primepal_student_token` from localStorage and fetches the student's performance profile.
- Renders a performance summary card (overall accuracy bar, per-pillar accuracy bars, difficulty badge, weak/strong topic tags).
- Renders a 2x2 responsive grid of `PillarCard` components for reading, writing, listening, and speaking.
- Performance section is hidden when no data or accuracy is zero.

**Used by:** Student missions page (`/student/missions`).

---

### MissionGameplay

**File:** `components/student/MissionGameplay.tsx`

**Props:**
```ts
interface MissionGameplayProps {
  questions: MissionQuestion[];
  pillar?: string;
  onComplete: (results: GameResult[]) => void;
}
```

**Exported types:**
```ts
interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
  points_value: number;
}
```

**State:**
- `currentIndex: number` -- current question position
- `results: GameResult[]` -- accumulated results
- `showFeedback: boolean` -- whether feedback overlay is visible
- `showSummary: boolean` -- whether end-of-mission summary is shown
- `lastScore: { points: number; isCorrect: boolean } | null`

**Behavior:**
- Renders a progress bar (`Question X of Y`) and running score.
- Mounts a `QuestionTimer` per question (hidden during feedback). Timer seconds come from `getTimerSeconds(taskType)`.
- Delegates question rendering to `TaskRouter`.
- On answer: records `GameResult`, shows `ScorePopup` for 2.5 seconds, then advances.
- On time-up: auto-submits an incorrect answer.
- Provides a "Skip Question" button.
- After the last question: shows `MissionSummary` (internal component) with total score, percentage, message, per-question result grid, and a "Continue" button that calls `onComplete`.

**Internal sub-components:**
- `ScorePopup({ points, isCorrect })` -- full-screen animated overlay showing "+N" or "0".
- `MissionSummary({ results, questions, onContinue })` -- end screen with trophy icon, score, and result grid.

**Used by:** Student mission gameplay page.

---

### PillarCard

**File:** `components/student/PillarCard.tsx`

**Props:**
```ts
interface PillarCardProps {
  pillar: 'reading' | 'writing' | 'listening' | 'speaking';
  bgColor: string;
  icon: React.ReactNode;
}
```

**State:** None (stateless presentational component).

**Behavior:**
- Renders a `Link` to `/student/missions/{pillar}`.
- Uses Framer Motion for hover scale (1.05) and tap scale (0.95).
- Displays the icon, capitalized pillar name, and "Tap to practice" text.
- Has a `data-testid` attribute (`pillar-card-{pillar}`) for testing.

**Used by:** `MissionsDashboard`.

---

### AchievementPopup

**File:** `components/student/AchievementPopup.tsx`

**Props:**
```ts
interface AchievementPopupProps {
  name: string;
  icon: string;        // emoji string
  tier: "bronze" | "silver" | "gold";
  onDismiss?: () => void;
}
```

**State:**
- `visible: boolean` -- controls AnimatePresence

**Behavior:**
- Auto-dismisses after 3 seconds (calls `onDismiss` after exit animation).
- Can be dismissed early by clicking.
- Tier determines colors: bronze (amber/orange), silver (slate/gray), gold (yellow/amber).
- Spring animation for entry (scale 0.3 -> 1, y 40 -> 0).

**Used by:** Student dashboard or post-mission screens.

---

### AvatarCustomizeModal

**File:** `components/student/AvatarCustomizeModal.tsx`

**Props:**
```ts
interface Props {
  studentName: string;
  currentStyle: string;
  currentColor: string;
  onSave: (style: string, color: string) => void;
  onClose: () => void;
}
```

**State:**
- `selectedStyle: string` -- chosen DiceBear avatar style
- `selectedColor: string` -- chosen theme color hex
- `saving: boolean`
- `error: string | null`

**Behavior:**
- Renders a live preview using DiceBear API v7.x (`https://api.dicebear.com/7.x/{style}/svg?seed={name}`).
- Style picker: adventurer, bottts, fun-emoji, pixel-art, lorelei.
- Color picker: 8 colors (indigo, violet, rose, amber, emerald, sky, orange, pink).
- On save: PATCHes `/auth/student/profile` with `avatar_style` and `theme_color`, updates localStorage cache, calls `onSave`.
- Backdrop click closes the modal.

**Used by:** Student profile/dashboard.

---

### DailyChestModal

**File:** `components/student/DailyChestModal.tsx`

**Props:**
```ts
interface DailyChestModalProps {
  isOpen: boolean;
  onRewardClaimed: (reward: {
    reward_type: string;
    amount: number;
    new_total: number;
    message: string;
  }) => void;
  reward?: { reward_type: string; amount: number; new_total: number; message: string };
  isClaiming?: boolean;   // default false
}
```

**State:**
- `tapCount: number` -- 0 to 3
- `isShaking: boolean` -- chest shake animation
- `showReward: boolean` -- reveal animation flag

**Behavior:**
- Returns null if `!isOpen || !reward`.
- Chest requires 3 taps to open. Each tap below 3 triggers a shake animation.
- On 3rd tap: plays multi-stage confetti burst (via `canvas-confetti`), shows reward message with star total, and a "Collect Reward!" button.
- Confetti has 4 stages: center burst, left burst, right burst, continuous smaller bursts.
- Progress bar shows tap count (0-3).
- Backdrop does not close the modal.

**Used by:** Student dashboard on daily login.

---

### StreakCounter

**File:** `components/student/StreakCounter.tsx`

**Props:**
```ts
interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
}
```

**State:**
- `showPopover: boolean`

**Behavior:**
- Renders a compact flame badge with current streak count.
- Clicking toggles a popover with current streak, longest streak, and encouragement text.
- Popover closes on outside click.
- Flame emoji has a CSS pulse animation when streak >= 3.

**Used by:** Student top bar / dashboard header.

---

### QuestionTimer

**File:** `components/student/QuestionTimer.tsx`

**Props:**
```ts
interface QuestionTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;     // default false
}
```

**State:**
- `secondsLeft: number`

**Behavior:**
- Counts down every second. Calls `onTimeUp` when reaching 0.
- Pauses when `paused` prop is true OR when offline (uses `useNetworkStatus` hook).
- Visual: progress bar shrinks left-to-right, turns red at <= 5 seconds, digits pulse.
- When offline, shows a "Waiting for connection..." overlay with spinner.

**Used by:** `MissionGameplay`.

---

### SpeakingPronunciationFeedback

**File:** `components/student/SpeakingPronunciationFeedback.tsx`

**Props:**
```ts
interface Props {
  pronunciationData: PronunciationWord[];   // { word: string; status: "correct"|"incorrect"|"omitted" }
  pronunciationScore: number;               // 0-100
  feedback: string;
  pointsAwarded: number;
}
```

**State:**
- `playingWord: string | null` -- word currently being spoken via TTS

**Behavior:**
- Shows overall pronunciation score with color coding (green >= 70, amber >= 50, red < 50).
- Displays word count summary (correct, mispronounced, omitted).
- Renders word-by-word breakdown with color-coded chips and status icons.
- Incorrect/omitted words have a hover-activated TTS button (uses `SpeechSynthesisUtterance` at rate 0.8).
- Stagger animation for word chips.

**Used by:** Post-speaking-task feedback screens.

---

### AnimatedBackground

**File:** `components/student/AnimatedBackground.tsx`

**Props:**
```ts
{ children: React.ReactNode }
```

**State:** None.

**Behavior:**
- Full-screen wrapper with animated gradient (indigo -> violet -> pink).
- 5 floating blurred circles with continuous motion.
- Animated grid overlay that scrolls diagonally.
- Content rendered in a relative z-10 container above the background.

**Used by:** Student login/onboarding pages.

---

### DynamicBackground

**File:** `components/student/DynamicBackground.tsx`

**Props:**
```ts
interface DynamicBackgroundProps {
  missionsCompleted?: number;   // default 0
}
```

**State:**
- `isNightMode: boolean` -- true between 6 PM and 6 AM
- `mounted: boolean`

**Behavior:**
- Three environment tiers based on `missionsCompleted`:
  - Tier 1 (0-49): Classroom -- sky/blue gradient, sun/clouds by day, moon/lamp by night, rotating clock, dust motes.
  - Tier 2 (50-99): Jungle Safari -- amber/green gradient, sun/foliage by day, moon/dark foliage by night, flame torch, animated butterflies.
  - Tier 3 (100+): Space Station -- purple/indigo gradient, stars/sparkles, planets, drifting astronaut, rotating satellite debris.
- Checks local time every 60 seconds to switch day/night.
- All decorative elements render at z-index -1 behind page content.
- Returns null until mounted (SSR safety).

**Used by:** Student dashboard layout.

---

### OfflineBanner

**File:** `components/student/OfflineBanner.tsx`

**Props:** None.

**State:**
- `pendingCount: number` -- from `getPendingAnswers()` utility
- `visible: boolean`

**Behavior:**
- Monitors network status via `useNetworkStatus` hook.
- When offline: shows amber banner "You are offline -- your answers are saved locally" with pending count badge.
- Animates in/out with max-height transition.

**Used by:** Student layout (top of page).

---

## Task Router

### TaskRouter

**File:** `components/student/tasks/TaskRouter.tsx`

**Props:** `TaskProps` (same as all task components).

**Behavior:**
- Reads `question.task_type` (falls back to `question.type`, then `'multiple_choice'`).
- Looks up the matching component from `TASK_COMPONENTS` record. Falls back to `LegacyMultipleChoice`.
- Renders the matched component with all props spread.
- If not in feedback mode and the question has `urdu_hint`, renders a `HintButton` below the task.

**Task type to component mapping:**

| `task_type` | Component |
|-------------|-----------|
| `sentence_picture_match` | `SentencePictureMatch` |
| `odd_one_out` | `OddOneOut` |
| `fill_blank_word_bank` | `FillBlankWordBank` |
| `passage_true_false` | `PassageTrueFalse` |
| `sentence_scramble` | `SentenceScramble` |
| `missing_letter` | `MissingLetter` |
| `guided_translation` | `GuidedTranslation` |
| `listen_and_choose` | `ListenAndChoose` |
| `simon_says` | `SimonSays` |
| `listen_and_spell` | `ListenAndSpell` |
| `repeat_after_me` | `RepeatAfterMe` |
| `what_is_this` | `WhatIsThis` |
| `finish_the_sentence` | `FinishTheSentence` |
| `multiple_choice` | `LegacyMultipleChoice` |
| `fill_blank` | `LegacyMultipleChoice` |

**Used by:** `MissionGameplay`.

---

## Task Components -- Reading

### SentencePictureMatch

**File:** `tasks/reading/SentencePictureMatch.tsx`

**Props:** `TaskProps`

**State:** `selected: string | null`

**Behavior:**
- Displays the question text and a 2x2 grid of `EmojiCard` components from `question.image_options`.
- On tap: case-insensitive comparison of selected ID to `correct_answer`.
- Shows green/red feedback via EmojiCard's `showFeedback` prop.

---

### OddOneOut

**File:** `tasks/reading/OddOneOut.tsx`

**Props:** `TaskProps`

**State:** `selected: string | null`

**Behavior:**
- Displays question text and instruction "Tap the word that does NOT belong."
- Renders `WordChip` components from `question.options`.
- On tap: direct comparison of `opt.id` to `correct_answer`.

---

### FillBlankWordBank

**File:** `tasks/reading/FillBlankWordBank.tsx`

**Props:** `TaskProps`

**State:** `selected: string | null`

**Behavior:**
- Displays question text (sentence with blank) and word chips from `question.options`.
- On tap: compares selected `opt.id` to `correct_answer`.

---

### PassageTrueFalse

**File:** `tasks/reading/PassageTrueFalse.tsx`

**Props:** `TaskProps`

**State:** `selected: string | null`

**Behavior:**
- If `question.passage` exists, renders it in a styled box.
- Displays the question and two large True/False buttons.
- On tap: compares "true"/"false" string to `correct_answer`.
- Buttons show green (correct) or red (incorrect) backgrounds in feedback mode.

---

## Task Components -- Writing

### SentenceScramble

**File:** `tasks/writing/SentenceScramble.tsx`

**Props:** `TaskProps`

**State:**
- `words: IndexedWord[]` -- shuffled array of `{ id, text }`
- `submitted: boolean`

**Behavior:**
- Initializes by shuffling `question.word_bank` into indexed word objects.
- Uses `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop reordering.
- On "Check Answer": compares word order to `question.correct_order` (case-insensitive).
- Shows correct order in feedback mode.

---

### MissingLetter

**File:** `tasks/writing/MissingLetter.tsx`

**Props:** `TaskProps`

**State:**
- `selectedLetters: string[]` -- letter keys selected from grid

**Behavior:**
- Reads `question.word_with_blanks` (e.g., "c_t") and counts underscore positions.
- Renders the word with blank slots that fill as letters are selected.
- Uses `LetterGrid` with `question.letter_options` for letter selection.
- Auto-submits when enough letters are selected (blankCount reached).
- Compares filled word to `correct_answer` (case-insensitive).

---

### GuidedTranslation

**File:** `tasks/writing/GuidedTranslation.tsx`

**Props:** `TaskProps`

**State:**
- `selectedIndices: number[]` -- indices into `word_bank`
- `submitted: boolean`

**Behavior:**
- Displays the source text in an amber-styled "Translate this:" prompt.
- Shows a sentence construction area (selected words as `WordChip`s).
- Shows the full word bank below. Tapping toggles selection (adds/removes from sentence).
- "Check Answer" compares selected word sequence to `question.correct_order` (case-insensitive).

---

## Task Components -- Listening

### ListenAndChoose

**File:** `tasks/listening/ListenAndChoose.tsx`

**Props:** `TaskProps`

**State:** `selected: string | null`

**Behavior:**
- Renders an `AudioPlayButton` with `question.audio_text` (auto-plays on mount).
- Displays a 2x2 grid of `EmojiCard` components from `question.image_options`.
- On tap: case-insensitive comparison to `correct_answer`.

---

### SimonSays

**File:** `tasks/listening/SimonSays.tsx`

**Props:** `TaskProps`

**State:** `selected: string | null`

**Behavior:**
- Renders `AudioPlayButton` with `question.audio_text` (auto-plays).
- Displays a 2x2 grid of text option buttons from `question.options`.
- On tap: case-insensitive comparison to `correct_answer`.
- Feedback shows green (correct) or red (selected incorrect) with check/X icons.

---

### ListenAndSpell

**File:** `tasks/listening/ListenAndSpell.tsx`

**Props:** `TaskProps`

**State:**
- `input: string`
- `submitted: boolean`

**Behavior:**
- Renders `AudioPlayButton` with `question.audio_text` (auto-plays).
- Text input for typing the spelling. Supports Enter key to submit.
- "Check Spelling" button submits. Compares input to `correct_answer` (case-insensitive, trimmed).
- Feedback shows correct spelling.

---

## Task Components -- Speaking

### RepeatAfterMe

**File:** `tasks/speaking/RepeatAfterMe.tsx`

**Props:** `TaskProps`

**Behavior:**
- Renders `AudioPlayButton` (auto-play, large) with `question.audio_text` or `correct_answer`.
- Shows instruction "Listen, then repeat!" and "Tap the play button to hear, then record yourself".
- When not in feedback mode, renders `MissionRecorder` with `expectedText = correct_answer`.
- On result from recorder, calls `onAnswer(transcription, isCorrect)`.

---

### WhatIsThis

**File:** `tasks/speaking/WhatIsThis.tsx`

**Props:** `TaskProps`

**Behavior:**
- Displays `question.image_context` as a large emoji (text-8xl).
- Instruction: "What is this? Say it!"
- Renders `MissionRecorder` when not in feedback mode.

---

### FinishTheSentence

**File:** `tasks/speaking/FinishTheSentence.tsx`

**Props:** `TaskProps`

**Behavior:**
- Displays `question.sentence_start` (or `question.question`) followed by "..." in a styled box.
- Instruction: "Say the complete sentence out loud".
- Renders `MissionRecorder` when not in feedback mode.

---

## Task Components -- Fallback

### LegacyMultipleChoice

**File:** `tasks/LegacyMultipleChoice.tsx`

**Props:** `TaskProps`

**State:**
- `selected: string | null`

**Behavior:**
- Supports both old format (`string[]` options) and new format (`QuestionOption[]`).
- If no options exist, falls back to `FillBlankInput` (internal sub-component) -- a text input with Submit button.
- Multiple choice: renders animated buttons. On tap, case-insensitive comparison to `correct_answer`.
- Feedback shows green for correct option, red for selected incorrect, with check/X icons.

**Internal sub-component:**
- `FillBlankInput` -- text input with Enter-to-submit, shows correct answer in feedback mode.

---

## Shared Task Components

### AudioPlayButton

**File:** `tasks/shared/AudioPlayButton.tsx`

**Props:**
```ts
interface AudioPlayButtonProps {
  text: string;
  rate?: number;         // default 0.85
  autoPlay?: boolean;    // default false
  size?: 'sm' | 'md' | 'lg';  // default 'md'
}
```

**State:** `isPlaying: boolean`

**Behavior:**
- Uses Web Speech API (`SpeechSynthesisUtterance`) to speak the text in en-US.
- Three sizes: sm (w-10/h-10), md (w-14/h-14), lg (w-20/h-20).
- When `autoPlay` is true, speaks after a 500ms delay on mount or text change.
- Button is disabled while playing. Shows green pulsing state during playback.

**Used by:** `ListenAndChoose`, `ListenAndSpell`, `SimonSays`, `RepeatAfterMe`.

---

### EmojiCard

**File:** `tasks/shared/EmojiCard.tsx`

**Props:**
```ts
interface EmojiCardProps {
  id: string;
  emoji: string;
  label: string;
  selected: boolean;
  isCorrect?: boolean;
  showFeedback: boolean;
  disabled: boolean;
  onTap: (id: string) => void;
}
```

**State:** None.

**Behavior:**
- Renders a card with emoji (text-4xl) and label text.
- Three visual states: default (gray border), selected (indigo border), feedback correct (green), feedback incorrect (red).
- Shows check/X icons in feedback mode.
- Framer Motion hover (scale 1.05) and tap (scale 0.95) animations.

**Used by:** `SentencePictureMatch`, `ListenAndChoose`.

---

### HintButton

**File:** `tasks/shared/HintButton.tsx`

**Props:**
```ts
interface HintButtonProps {
  urduHint: string;
  onUsed?: () => void;
}
```

**State:** `showHint: boolean`

**Behavior:**
- Returns null if `urduHint` is falsy.
- Toggle button labeled "Hint (urdu)" / "Hide Hint".
- AnimatePresence reveals the Urdu text in an amber-styled RTL box.
- Calls `onUsed` on first reveal.

**Used by:** `TaskRouter` (rendered below every task when hint is available).

---

### LetterGrid

**File:** `tasks/shared/LetterGrid.tsx`

**Props:**
```ts
interface LetterGridProps {
  letters: string[];
  selectedLetters: string[];
  disabled: boolean;
  onSelect: (letter: string) => void;
}
```

**State:** None.

**Behavior:**
- Renders a flex-wrap grid of 48x48 letter buttons.
- Each letter key is `{letter}_{index}` to allow duplicate letters.
- Selected letters are visually dimmed and disabled.
- Framer Motion hover (scale 1.1) and tap (scale 0.9).

**Used by:** `MissingLetter`.

---

### MissionRecorder

**File:** `tasks/shared/MissionRecorder.tsx`

**Props:**
```ts
interface MissionRecorderProps {
  expectedText: string;
  pillar?: string;         // default 'speaking'
  onResult: (isCorrect: boolean, transcription: string, similarity: number) => void;
  disabled: boolean;
}
```

**State:**
- `recorderState: 'idle' | 'recording' | 'evaluating' | 'retry' | 'giving_up'`
- `attemptNumber: number` -- 1 to MAX_ATTEMPTS (3)
- `retryMessage: string`

**Behavior:**
- Idle: shows indigo mic button ("Tap to speak").
- Recording: shows red pulsing mic button ("Tap to stop"). Uses `MediaRecorder` API.
- On stop: sends audio as FormData to `/missions/submit-speaking` with expected text, pillar, and attempt number.
- Server can respond with `status: 'retry'` (increments attempt, shows retry UI), `status: 'give_up'` (shows gentle message, reports failure after 2s), or a final result.
- Evaluating: shows spinner with "Listening to you..."
- Retry: shows amber mic icon with retry message and "Try Again" button.
- Max 3 attempts before give-up.

**Used by:** `RepeatAfterMe`, `WhatIsThis`, `FinishTheSentence`.

---

### WordChip

**File:** `tasks/shared/WordChip.tsx`

**Props:**
```ts
interface WordChipProps {
  word: string;
  selected?: boolean;
  correct?: boolean | null;
  showFeedback?: boolean;
  disabled?: boolean;
  onTap?: () => void;
}
```

**State:** None.

**Behavior:**
- Renders a styled button chip with the word text.
- Four visual states: default (white/gray), selected (indigo), feedback correct (green), feedback incorrect (red).
- Framer Motion hover and tap animations.
- Disabled state reduces opacity.

**Used by:** `FillBlankWordBank`, `OddOneOut`, `GuidedTranslation`.
