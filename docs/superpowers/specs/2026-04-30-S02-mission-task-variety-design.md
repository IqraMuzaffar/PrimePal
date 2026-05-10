# S02 — Expanded Mission Task Types (LSRW Variety)

**Date:** 2026-04-30
**Status:** Design Complete — Ready for Implementation
**Ticket:** TICKETS/student/S02-MISSION-TASK-VARIETY.md

---

## 1. Problem

PrimePal missions currently support only **2 task types**: `multiple_choice` (4 options, tap one) and `fill_blank` (type the missing word). The client requires **13 distinct interaction patterns** across the 4 LSRW pillars to keep young students engaged and to test different cognitive skills. Fixed, repetitive patterns bore children and don't adequately assess the breadth of language competency.

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Images for picture tasks | Emoji now, schema supports `image_url` for future library | Ships fast, no asset dependency, schema is future-proof |
| Drag-and-drop library | `@dnd-kit/core` + `@dnd-kit/sortable` | Modern, accessible, touch-friendly, lightweight, well-maintained |
| Audio for listening tasks | Browser `SpeechSynthesis` API | Already proven in codebase (`SpeakingPronunciationFeedback.tsx`), zero cost |
| Speaking tasks in missions | Reuse existing MediaRecorder + Whisper flow from `speaking/page.tsx` | Proven pattern, no new infra needed |
| LLM output approach | Single expanded Pydantic schema with optional fields per task type | Simpler than multiple schemas, works with `ChatOpenAI.with_structured_output` |
| Component organization | `components/student/tasks/` directory with one file per task type + shared primitives | Clean separation, easy to test individually |
| Timer duration | 15s standard, 30s for passage_true_false + sentence_scramble + guided_translation | Matches client spec for reading comprehension and complex tasks |
| Scoring model | Add `points_value` field per question (5/10/15/20) — actual scoring logic deferred to S08 | S02 adds the infrastructure, S08 adds the visibility and frontend display |

## 3. Task Type Catalog

### 3.1 Reading Pillar (4 types)

**`sentence_picture_match`** — Read sentence, tap correct emoji
- Display: sentence text + 4 emoji cards in 2x2 grid
- Student taps the emoji that matches the sentence
- Fields used: `question`, `image_options[{id, text, emoji}]`, `correct_answer` (id)
- Difficulty: Easy (5-10pts) — visual matching

**`odd_one_out`** — Identify the word that doesn't belong
- Display: 4 word cards in a row
- Student taps the outlier (e.g., "cat, dog, table, bird" → table)
- Fields used: `question`, `options[{id, text}]`, `correct_answer` (id)
- Difficulty: Medium (10-15pts) — categorization

**`fill_blank_word_bank`** — Tap word to fill the gap (upgrade from text input)
- Display: sentence with `___` gap + 4 word options below
- Student taps the correct word (not typing)
- Fields used: `question`, `options[{id, text}]`, `correct_answer` (id)
- Difficulty: Easy-Medium (5-15pts) — contextual grammar
- Note: Replaces old `fill_blank` for reading pillar. Old `fill_blank` still used for writing.

**`passage_true_false`** — Read passage, answer True or False
- Display: short passage (3-5 sentences) + statement + T/F buttons
- 30s timer (reading comprehension needs more time)
- Fields used: `passage`, `question` (the statement), `correct_answer` ("true"/"false")
- Difficulty: Medium-Hard (15-20pts)

### 3.2 Writing Pillar (3 types)

**`sentence_scramble`** — Drag words into correct order
- Display: scrambled word chips that student drags/taps into order
- Uses `@dnd-kit/sortable` for drag-and-drop (with tap-to-move fallback for accessibility)
- 30s timer (complex interaction)
- Fields used: `word_bank[]` (scrambled words), `correct_order[]` (correct sequence)
- Difficulty: Medium-Hard (15-20pts)
- Validation: compare student's order against `correct_order` array

**`missing_letter`** — Tap the missing letter(s)
- Display: word with blank(s) shown as `c _ t` + letter grid (6-8 letter options)
- Student taps letters to fill blanks
- Fields used: `word_with_blanks` (e.g., "c_t"), `letter_options[]`, `correct_answer` (full word)
- Difficulty: Easy-Medium (5-10pts) — spelling reinforcement

**`guided_translation`** — Construct English from Urdu sentence
- Display: Urdu sentence (top) + English word bank chips (bottom)
- Student taps words in order to build the English translation
- 30s timer
- Fields used: `question` (Urdu sentence), `word_bank[]` (English words), `correct_order[]` (correct English sentence)
- Difficulty: Hard (15-20pts) — bilingual scaffolding task
- Note: This is S03's primary bilingual task type, but the UI component is built in S02

### 3.3 Listening Pillar (3 types)

**`listen_and_choose`** — Hear audio, tap correct emoji
- Display: play button (triggers TTS) + 4 emoji cards in 2x2 grid
- Browser `SpeechSynthesis` reads `audio_text` aloud
- Student taps the emoji matching what they heard
- Fields used: `audio_text`, `image_options[{id, text, emoji}]`, `correct_answer` (id)
- Difficulty: Easy-Medium (5-15pts)

**`simon_says`** — Hear instruction, tap correct action
- Display: play button (TTS) + 4 action buttons with text + emoji
- TTS reads an instruction like "Touch your nose" or "Clap your hands"
- Student taps the matching action button
- Fields used: `audio_text`, `options[{id, text}]`, `correct_answer` (id)
- Difficulty: Easy (5-10pts) — comprehension

**`listen_and_spell`** — Hear word, type spelling
- Display: play button (TTS) + text input field
- TTS reads a word, student types it
- Fields used: `audio_text`, `correct_answer` (the word)
- Difficulty: Medium-Hard (10-20pts) — phonics

### 3.4 Speaking Pillar (3 types)

All speaking tasks share a common flow: display prompt → student records → send to Whisper → evaluate.

**`repeat_after_me`** — Listen to sentence, repeat it
- Display: play button (TTS reads sentence) + record button
- Student listens, then records themselves repeating
- Fields used: `audio_text`, `correct_answer` (the sentence)
- Evaluation: Whisper transcription → similarity comparison against `correct_answer`
- Difficulty: Easy-Medium (5-15pts)

**`what_is_this`** — See emoji/image, say the word
- Display: large emoji + record button + "What is this?"
- Student says the word for the displayed item
- Fields used: `image_context` (emoji), `correct_answer` (the word)
- Evaluation: Whisper transcription → exact match
- Difficulty: Easy (5-10pts)

**`finish_the_sentence`** — Read partial sentence, speak the ending
- Display: partial sentence text + record button
- Student reads aloud and completes the sentence
- Fields used: `sentence_start`, `correct_answer` (expected completion)
- Evaluation: Whisper → contains expected word(s)
- Difficulty: Medium-Hard (15-20pts)

## 4. Backend Architecture

### 4.1 Expanded Pydantic Schema

The existing `MissionQuestion` schema is extended with optional fields. Each task type uses a subset:

```python
class QuestionOption(BaseModel):
    id: str
    text: str
    emoji: str | None = None  # for image_options

class MissionQuestion(BaseModel):
    id: int
    task_type: str                              # one of 13 task type strings
    pillar: str                                 # reading, writing, listening, speaking
    question: str                               # main question/instruction text
    difficulty: str = "medium"                  # easy, medium, hard
    points_value: int = 10                      # 5, 10, 15, or 20
    correct_answer: str                         # for non-speaking: checked client-side. For speaking: checked server-side via Whisper similarity.
    emoji_hint: str = ""                        # topic emoji

    # Optional fields — used by specific task types
    options: list[QuestionOption] | None = None          # MCQ, odd_one_out, fill_blank_word_bank, simon_says
    passage: str | None = None                           # passage_true_false
    audio_text: str | None = None                        # listening + speaking tasks (TTS source)
    image_context: str | None = None                     # emoji/image URL for what_is_this
    image_options: list[QuestionOption] | None = None     # sentence_picture_match, listen_and_choose
    word_bank: list[str] | None = None                   # sentence_scramble, guided_translation
    correct_order: list[str] | None = None               # sentence_scramble, guided_translation
    word_with_blanks: str | None = None                  # missing_letter (e.g., "c_t")
    letter_options: list[str] | None = None              # missing_letter
    sentence_start: str | None = None                    # finish_the_sentence
```

### 4.2 Task Type Distribution Per Pillar

Each pillar mission is 10 questions. The LLM prompt specifies:

| Pillar | Task Types | Distribution |
|--------|-----------|-------------|
| Reading | sentence_picture_match, odd_one_out, fill_blank_word_bank, passage_true_false | 3, 3, 2, 2 |
| Writing | sentence_scramble, missing_letter, guided_translation | 4, 3, 3 |
| Listening | listen_and_choose, simon_says, listen_and_spell | 4, 3, 3 |
| Speaking | repeat_after_me, what_is_this, finish_the_sentence | 4, 3, 3 |

Difficulty distribution per pillar: ~3 easy, ~4 medium, ~3 hard (totaling 100 points per pillar).

### 4.3 Mission Generator Changes

**`generate_pillar_missions()`** will be refactored:

1. Replace free-form JSON output with `ChatOpenAI.with_structured_output(PillarMissions)` — matching the daily missions pattern for reliability
2. Pillar-specific prompts tell the LLM exactly which `task_type` values to use and how many of each
3. The prompt includes field requirements per task type (e.g., "For sentence_scramble, you MUST provide word_bank and correct_order")
4. Validation normalizes all questions against the schema, filling defaults for missing optional fields

**`generate_daily_missions()`** keeps its existing 3-question format but gains `task_type` field:
- Question 1: `sentence_picture_match` or `odd_one_out` (reading/visual)
- Question 2: `fill_blank_word_bank` or `missing_letter` (writing)
- Question 3: `listen_and_choose` or `simon_says` (listening)
- Speaking tasks excluded from daily missions (require mic setup)

### 4.4 Response Schema Changes

`MissionQuestionOut` (client-facing, correct_answer stripped) gains all the new optional fields:

```python
class MissionQuestionOut(BaseModel):
    id: int
    task_type: str          # NEW — was "type"
    pillar: str             # NEW
    question: str
    difficulty: str         # NEW
    points_value: int       # NEW
    emoji_hint: str
    options: list[QuestionOptionOut] | None = None
    passage: str | None = None
    audio_text: str | None = None
    image_context: str | None = None
    image_options: list[QuestionOptionOut] | None = None
    word_bank: list[str] | None = None
    word_with_blanks: str | None = None
    letter_options: list[str] | None = None
    sentence_start: str | None = None
    # correct_answer, correct_order deliberately ABSENT
```

### 4.5 Answer Submission Changes

`CompleteRequest` is extended:

```python
class CompleteRequest(BaseModel):
    question_correct: bool
    question_type: str            # kept for backward compat, maps to task_type
    task_type: str | None = None  # new preferred field
    pillar: str | None = None
    answer_data: dict | None = None  # for complex answers (word order, letter selection)
```

For speaking tasks within missions, a new endpoint handles audio submission:

```
POST /missions/submit-speaking
  - FormData: audio_file, question_id, expected_text, pillar
  - Returns: { is_correct, similarity_score, transcription, points_awarded }
```

This reuses the Whisper evaluation logic from `speaking.py`.

### 4.6 Interaction Logging

`interaction_type` in `student_interactions` expands from `mission_mc`/`mission_fill` to include the specific task type:

```
mission_sentence_picture_match, mission_odd_one_out, mission_fill_blank_word_bank,
mission_passage_true_false, mission_sentence_scramble, mission_missing_letter,
mission_guided_translation, mission_listen_and_choose, mission_simon_says,
mission_listen_and_spell, mission_repeat_after_me, mission_what_is_this,
mission_finish_the_sentence
```

## 5. Frontend Architecture

### 5.1 Component Tree

```
components/student/tasks/
├── TaskRouter.tsx               — switch on task_type, render correct component
├── reading/
│   ├── SentencePictureMatch.tsx
│   ├── OddOneOut.tsx
│   ├── FillBlankWordBank.tsx
│   └── PassageTrueFalse.tsx
├── writing/
│   ├── SentenceScramble.tsx
│   ├── MissingLetter.tsx
│   └── GuidedTranslation.tsx
├── listening/
│   ├── ListenAndChoose.tsx
│   ├── SimonSays.tsx
│   └── ListenAndSpell.tsx
├── speaking/
│   ├── RepeatAfterMe.tsx
│   ├── WhatIsThis.tsx
│   └── FinishTheSentence.tsx
└── shared/
    ├── AudioPlayButton.tsx      — TTS trigger (SpeechSynthesis wrapper)
    ├── EmojiCard.tsx            — Tappable emoji card for image grid
    ├── WordChip.tsx             — Draggable/tappable word token
    ├── LetterGrid.tsx           — Tappable letter options
    └── MissionRecorder.tsx      — Record + submit audio (reuse from speaking page)
```

### 5.2 TaskRouter Integration

`MissionGameplay.tsx` is refactored. Instead of inline rendering MC/fill-blank, it delegates to `TaskRouter`:

```tsx
// Inside MissionGameplay's render:
<TaskRouter
  question={currentQuestion}
  onAnswer={(answer, isCorrect) => handleAnswer(answer, isCorrect)}
  showFeedback={showFeedback}
  disabled={showFeedback}
/>
```

`TaskRouter` is a simple switch:
```tsx
switch (question.task_type) {
  case 'sentence_picture_match': return <SentencePictureMatch ... />;
  case 'odd_one_out': return <OddOneOut ... />;
  // ... etc
  default: return <MultipleChoice ... />;  // fallback for legacy questions
}
```

### 5.3 Common Task Component Interface

Every task component follows the same props contract:

```typescript
interface TaskProps {
  question: MissionQuestion;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  disabled: boolean;
}
```

This makes them interchangeable within the `TaskRouter`.

### 5.4 Timer Adjustments

`QuestionTimer` gains a `seconds` prop driven by task type:

```typescript
const TIMER_SECONDS: Record<string, number> = {
  passage_true_false: 30,
  sentence_scramble: 30,
  guided_translation: 30,
  listen_and_spell: 20,    // needs time to hear + type
  finish_the_sentence: 20, // needs time to read + speak
  default: 15,
};
```

`MissionGameplay` passes `TIMER_SECONDS[question.task_type] ?? 15` to the timer.

### 5.5 Audio Playback (Listening Tasks)

Shared `AudioPlayButton` component:

```tsx
function AudioPlayButton({ text, rate = 0.85 }: { text: string; rate?: number }) {
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;  // slightly slow for ESL learners
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };
  return (
    <button onClick={speak}>
      <Volume2 /> Play
    </button>
  );
}
```

Listening tasks auto-play once on mount, then student can tap to replay.

### 5.6 Speaking Tasks in Missions

`MissionRecorder` component extracted from the existing `speaking/page.tsx` recording flow:

- Renders a record button
- Uses `MediaRecorder` API to capture audio as webm blob
- On stop: calls `POST /missions/submit-speaking` with the blob + expected text
- Returns `{ is_correct, similarity_score, transcription }` to the parent
- The parent (`MissionGameplay`) handles feedback display and progression

Timer pauses while recording and resumes after submission.

### 5.7 Drag-and-Drop (Sentence Scramble + Guided Translation)

Using `@dnd-kit/core` + `@dnd-kit/sortable`:

- Word chips rendered as `SortableItem` components
- Student drags to reorder (desktop) or taps to select + tap destination (mobile fallback)
- "Check Answer" button compares current order against `correct_order`
- Visual feedback: correct position = green border, wrong = red

### 5.8 Backward Compatibility

The existing `multiple_choice` and `fill_blank` task types continue to work:
- `TaskRouter` has a `default` case that renders the legacy MC/fill-blank UI
- The `type` field on old questions maps to `task_type` via: `task_type = question.task_type ?? question.type`
- Daily missions from cache will still render correctly

### 5.9 Frontend TypeScript Types

New file `frontend/types/missions.ts`:

```typescript
interface QuestionOption {
  id: string;
  text: string;
  emoji?: string;
}

interface MissionQuestion {
  id: number;
  task_type: string;
  pillar: string;
  question: string;
  difficulty: string;
  points_value: number;
  emoji_hint: string;
  options?: QuestionOption[];
  passage?: string;
  audio_text?: string;
  image_context?: string;
  image_options?: QuestionOption[];
  word_bank?: string[];
  word_with_blanks?: string;
  letter_options?: string[];
  sentence_start?: string;
}

type TaskType =
  | 'sentence_picture_match' | 'odd_one_out' | 'fill_blank_word_bank' | 'passage_true_false'
  | 'sentence_scramble' | 'missing_letter' | 'guided_translation'
  | 'listen_and_choose' | 'simon_says' | 'listen_and_spell'
  | 'repeat_after_me' | 'what_is_this' | 'finish_the_sentence'
  | 'multiple_choice' | 'fill_blank';  // legacy

const TIMER_SECONDS: Record<string, number> = {
  passage_true_false: 30,
  sentence_scramble: 30,
  guided_translation: 30,
  listen_and_spell: 20,
  finish_the_sentence: 20,
  repeat_after_me: 20,
  default: 15,
};
```

## 6. Files to Create

| File | Purpose |
|------|---------|
| `frontend/components/student/tasks/TaskRouter.tsx` | Switch on task_type, delegate to component |
| `frontend/components/student/tasks/reading/SentencePictureMatch.tsx` | Sentence + emoji grid |
| `frontend/components/student/tasks/reading/OddOneOut.tsx` | 4 word cards, tap outlier |
| `frontend/components/student/tasks/reading/FillBlankWordBank.tsx` | Sentence gap + word options |
| `frontend/components/student/tasks/reading/PassageTrueFalse.tsx` | Passage + T/F buttons |
| `frontend/components/student/tasks/writing/SentenceScramble.tsx` | Draggable word reordering |
| `frontend/components/student/tasks/writing/MissingLetter.tsx` | Word blanks + letter grid |
| `frontend/components/student/tasks/writing/GuidedTranslation.tsx` | Urdu→English word bank |
| `frontend/components/student/tasks/listening/ListenAndChoose.tsx` | TTS + emoji grid |
| `frontend/components/student/tasks/listening/SimonSays.tsx` | TTS + action buttons |
| `frontend/components/student/tasks/listening/ListenAndSpell.tsx` | TTS + text input |
| `frontend/components/student/tasks/speaking/RepeatAfterMe.tsx` | TTS + record |
| `frontend/components/student/tasks/speaking/WhatIsThis.tsx` | Emoji + record |
| `frontend/components/student/tasks/speaking/FinishTheSentence.tsx` | Partial sentence + record |
| `frontend/components/student/tasks/shared/AudioPlayButton.tsx` | SpeechSynthesis wrapper |
| `frontend/components/student/tasks/shared/EmojiCard.tsx` | Tappable emoji card |
| `frontend/components/student/tasks/shared/WordChip.tsx` | Draggable word token |
| `frontend/components/student/tasks/shared/LetterGrid.tsx` | Tappable letter options |
| `frontend/components/student/tasks/shared/MissionRecorder.tsx` | Audio record + submit |
| `frontend/types/missions.ts` | TypeScript types for all task data |

## 7. Files to Modify

| File | Changes |
|------|---------|
| `backend/app/agents/tutor_agent/mission_generator.py` | New schema, new pillar prompts with task_type distributions |
| `backend/app/api/v1/endpoints/missions.py` | Updated response schemas, `_strip_answer` handles new fields, new `/submit-speaking` endpoint |
| `frontend/components/student/MissionGameplay.tsx` | Delegate to TaskRouter, pass timer seconds by task_type |
| `frontend/components/student/QuestionTimer.tsx` | Accept dynamic `initialSeconds` (already does, just used differently) |
| `frontend/app/student/missions/[pillar]/page.tsx` | Updated Question interface, pass pillar to MissionGameplay |
| `frontend/package.json` | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |

## 8. What This Does NOT Cover (Deferred to Other Tickets)

- **S03**: Urdu hint button on tasks, chatbot bilingual enhancements — S02 builds `guided_translation` UI but the hint system is S03
- **S08**: Score display animations, daily/cumulative score visibility — S02 adds `points_value` to schema but display is S08
- **S09**: Adaptive difficulty algorithm, performance profiling — S02 adds `difficulty` field but the adaptive engine is S09
- **S04**: Network grace (timer pause, offline caching) — independent infrastructure ticket
- **S05**: STT forgiveness for speaking tasks — S02 builds the recording components, S05 adds retry/forgiveness logic

## 9. Verification Criteria

- [ ] All 13 task types render correctly in the mission gameplay flow
- [ ] Timer adjusts to 30s for complex tasks, 15s for standard
- [ ] Drag-and-drop works on both desktop and mobile (touch)
- [ ] Audio playback works via SpeechSynthesis for all listening tasks
- [ ] Speaking tasks record, submit to Whisper, and return evaluation
- [ ] Legacy `multiple_choice` and `fill_blank` questions still render
- [ ] Pillar mission endpoint returns 10 questions with correct task_type distribution
- [ ] Daily mission endpoint returns 3 questions with varied task types
- [ ] All answers are logged to `student_interactions` with specific `interaction_type`
- [ ] Points are awarded per question (flat 10pts in S02, variable in S08)
