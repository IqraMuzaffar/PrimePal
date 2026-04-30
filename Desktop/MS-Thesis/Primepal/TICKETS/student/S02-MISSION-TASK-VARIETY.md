# S02 — Expanded Mission Task Types (Gamified LSRW Variety)

**Priority:** HIGH
**Status:** TODO
**Depends on:** None (current mission infrastructure is the foundation)

## What Exists

- Pillar missions (`/student/missions/[pillar]`) serve 10 questions per pillar
- Current task types are limited to: **multiple-choice (4 options)** and **fill-in-the-blank**
- `MissionGameplay` component renders questions with a 15s `QuestionTimer`
- Mission generator (`mission_generator.py`) uses structured LLM output with RAG context
- Scoring: 10 points per correct answer, difficulty-based weighting exists in prompt

## What Needs to Be Built

The client requires **explicit, defined UI components** per pillar — not just MCQ and fill-blank everywhere. Each pillar must have 3-4 distinct interaction patterns.

### Reading Pillar — New Task Types

| Task Type | UI Component | What Student Does | Exists? |
|-----------|-------------|-------------------|---------|
| Sentence-Picture Match (MCQ) | Image grid + tap | Read sentence, tap correct image | NO |
| Odd One Out (Vocabulary Grouping) | 4 word cards, tap the outlier | Identify which word doesn't belong | NO |
| Fill-in-the-Blank (Contextual Grammar) | Sentence with gap + word bank | Tap correct word to fill gap | PARTIAL (text input exists, word bank needed) |
| Short Passage True/False | Passage + T/F buttons | Read passage, answer True or False | NO |

### Writing Pillar — New Task Types

| Task Type | UI Component | What Student Does | Exists? |
|-----------|-------------|-------------------|---------|
| Sentence Scramble (Reordering) | Draggable word chips | Drag words into correct sentence order | NO |
| Missing Letter / Spelling Bee Lite | Word with blank + letter options | Tap the missing letter(s) | NO |
| Guided Translation (Bilingual) | Urdu sentence + English word bank | Construct English translation from words | NO |

### Listening Pillar — New Task Types

| Task Type | UI Component | What Student Does | Exists? |
|-----------|-------------|-------------------|---------|
| Listen and Choose (Vocabulary) | Audio play + image grid | Hear word/sentence, tap correct image | NO |
| Simon Says Action Task | Audio instruction + action buttons | Listen to instruction, tap correct action | NO |
| Listen and Spell (Phonics) | Audio play + letter input | Hear word, type spelling | NO |

### Speaking Pillar — New Task Types

| Task Type | UI Component | What Student Does | Exists? |
|-----------|-------------|-------------------|---------|
| Repeat After Me (Pronunciation) | Audio play + record button | Listen, then repeat into mic | PARTIAL (speaking page exists, needs mission integration) |
| What Is This? (Vocabulary Recall) | Image display + record button | See image, say the word | NO |
| Finish the Sentence (Syntax) | Partial sentence + record button | Read start, speak the ending | NO |

### Backend Changes

1. **Mission generator prompt** must be updated to output a `task_type` field per question (e.g., `"sentence_picture_match"`, `"sentence_scramble"`, `"listen_and_choose"`)
2. **Structured output schema** needs new fields: `task_type`, `options` (for MCQ/word bank), `image_url` (for picture tasks), `audio_text` (for TTS tasks), `correct_order` (for reordering), `passage` (for comprehension)
3. **Scoring** must account for task difficulty: simple MCQ = 5pts, reordering/translation = 15-20pts, total per pillar = 100pts
4. **Timer**: 15s for standard tasks, 30s for reading comprehension and sentence scramble

### Frontend Changes

1. `MissionGameplay` component needs a **task-type router** — render different UI based on `task_type`
2. New UI components needed:
   - `DraggableWordChips` (sentence scramble)
   - `ImageGrid` (picture match, listen-and-choose)
   - `AudioPlayer` (listening tasks — use browser TTS or pre-generated audio)
   - `TrueFalseButtons`
   - `MissingLetterInput`
   - `RecordAndSubmit` (speaking tasks within missions)
3. All new components must be mobile-friendly (tap targets, no tiny buttons)

## Engineering Notes

- Browser TTS (`speechSynthesis` API) is acceptable for listening tasks — no need for server-side audio generation
- Image tasks: use simple emoji/icon representations or AI-generated placeholders initially
- Sentence scramble drag-and-drop: use a library like `@dnd-kit/core` or simple tap-to-reorder
- The mission generator already receives grade + topic context from RAG — the prompt just needs to specify variety

## Files to Touch

- `backend/app/agents/mission_generator.py` — prompt + output schema expansion
- `frontend/src/app/student/missions/[pillar]/page.tsx` — task type routing
- `frontend/src/components/student/` — new task UI components (6-8 new components)
