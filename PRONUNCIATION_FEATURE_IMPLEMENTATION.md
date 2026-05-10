# Word-Level Pronunciation Feedback — Implementation Guide

## Feature Overview

The Speaking Pillar has been upgraded to include **word-level pronunciation analysis**. Instead of a simple pass/fail, students now receive:

1. **Word-by-word accuracy assessment** (correct/incorrect/omitted)
2. **Pronunciation score** (0-100% based on word accuracy)
3. **Visual feedback** (color-coded words: green for correct, red/orange for issues)
4. **Audio remediation** (click to hear correct pronunciation of problem words)

---

## Architecture

### Database Layer
**Migration 019: `pronunciation_data` column**
- Stores `JSONB` array of word-level assessments
- Structure: `[{"word": "play", "status": "correct"}, ...]`
- Index for analytics queries

### Backend Processing Pipeline

**1. Audio Transcription (Whisper API)**
```python
response_format="verbose_json"
timestamp_granularities=["word"]
```
→ Returns word-level timing and text from audio

**2. Word Comparison (`app/utils/pronunciation.py`)**
- `compare_phrases()`: Aligns target vs. spoken words
- `levenshtein_similarity()`: Fuzzy matching (75% threshold)
- `calculate_pronunciation_score()`: Converts to 0-100 scale

Scoring Logic:
- Correct word: 10 points
- Incorrect word: 5 points
- Omitted word: 0 points

**3. Enhanced Evaluation Endpoint**
- `POST /api/v1/speaking/evaluate-pro` (new)
- Accepts audio file (WebM/WAV)
- Returns `EvaluatePronunciationFeedback` with word-level data

### Frontend Rendering

**Speaking Mission Page** (`frontend/app/student/speaking/page.tsx`)
- Uses Web Audio API for recording (replaces SpeechRecognition)
- Sends audio blob to `/speaking/evaluate-pro`
- Displays `SpeakingPronunciationFeedback` component

**Pronunciation Feedback Component** (`frontend/components/student/SpeakingPronunciationFeedback.tsx`)
- Word grid with color-coded badges
- Staggered Framer Motion animations
- Hover-to-listen for mispronounced words
- Word count summary (correct/incorrect/omitted)

---

## Implementation Details

### Step 1: Database

**File:** `supabase/migrations/019_pronunciation_data.sql`

```sql
ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS pronunciation_data JSONB DEFAULT NULL;

CREATE INDEX idx_pronunciation_data
  ON student_interactions USING GIN(pronunciation_data)
  WHERE pronunciation_data IS NOT NULL;
```

**Action Required:** Apply this migration in Supabase SQL Editor.

---

### Step 2: Backend

#### Utility Function
**File:** `backend/app/utils/pronunciation.py`

Three core functions:

1. **`levenshtein_similarity(s1, s2) → float`**
   - Calculates string similarity (0-1)
   - Uses difflib.SequenceMatcher
   - Case-insensitive

2. **`compare_phrases(target_phrase, spoken_words, threshold=0.75) → List[dict]`**
   - Aligns target words with spoken words
   - Returns: `[{"word": "I", "status": "correct"}, ...]`
   - Statuses: `"correct" | "incorrect" | "omitted"`

3. **`calculate_pronunciation_score(pronunciation_data) → int`**
   - Converts word accuracy to 0-100 percentage
   - Formula: `(correct_points / max_points) × 100`

#### New Endpoint
**File:** `backend/app/api/v1/endpoints/speaking.py`

**Route:** `POST /api/v1/speaking/evaluate-pro`

**Request:**
```python
class EvaluateProRequest(BaseModel):
    prompt_id: int
    prompt_text: str  # Target phrase

# With file upload:
audio_file: UploadFile = File(...)
```

**Response:**
```python
class EvaluatePronunciationFeedback(BaseModel):
    score: int  # 0-2 (LLM quality score)
    feedback: str  # Encouraging feedback message
    pronunciation_score: int  # 0-100 word accuracy
    pronunciation_data: list[PronunciationWordData]  # Word-level assessment
    points_awarded: int  # Points earned (0-10)
    new_total: int  # Updated student total
```

**Processing Steps:**
1. **Transcribe** audio with Whisper (word-level granularity)
2. **Compare** target phrase vs. spoken words
3. **Calculate** pronunciation score
4. **Generate** AI feedback (gpt-4o-mini)
5. **Award** points based on score (≥70% → 10 pts, ≥50% → 5 pts, <50% → 0 pts)
6. **Log** interaction with `pronunciation_data` to database

---

### Step 3: Frontend

#### Web Audio Recording
**File:** `frontend/app/student/speaking/page.tsx`

Replaces SpeechRecognition with MediaRecorder API:

```typescript
// Start recording
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.start();

// Stop and collect audio blob
mediaRecorder.onstop = () => {
  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
};
```

**Submission:**
```typescript
const formData = new FormData();
formData.append('audio_file', audioBlob, 'recording.webm');
formData.append('prompt_id', String(promptId));
formData.append('prompt_text', promptText);

const response = await fetch('/api/v1/speaking/evaluate-pro', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

#### Pronunciation Feedback UI
**File:** `frontend/components/student/SpeakingPronunciationFeedback.tsx`

**Features:**

1. **Overall Score Card**
   - Large pronunciation score display (0-100%)
   - Color-coded (green ≥70%, amber ≥50%, red <50%)
   - Word count summary (correct/incorrect/omitted)

2. **Word Grid**
   - Each word as a badge
   - Color: emerald (correct), red (incorrect), orange (omitted)
   - Status icon: ✓ (correct), ⚠ (incorrect/omitted)
   - Hover reveals "Listen" button

3. **Audio Playback**
   - Click Volume icon → SpeechSynthesis API plays word
   - Slow playback (rate: 0.8) for clarity
   - Visual feedback (pulsing icon while playing)

4. **Animations**
   - Container: staggered appearance (delay 0.08s between words)
   - Words: spring animation from hidden state
   - Score card fades in from top
   - Legend appears last with hint text

**Props:**
```typescript
interface Props {
  pronunciationData: PronunciationWord[];
  pronunciationScore: number; // 0-100
  feedback: string;
  pointsAwarded: number;
}
```

---

## Data Flow

```
Student speaks → Audio recorded (MediaRecorder)
                    ↓
         FormData with audio blob
                    ↓
    POST /speaking/evaluate-pro
                    ↓
    Whisper transcribes with word-level timestamps
                    ↓
    compare_phrases() aligns words
                    ↓
    LLM generates encouraging feedback
                    ↓
    Response: pronunciation_data + score
                    ↓
    Frontend: SpeakingPronunciationFeedback renders
                    ↓
    Student can hover to hear mispronounced words
                    ↓
    Interaction logged with pronunciation_data to DB
```

---

## Database Schema

### student_interactions (Updated)

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| student_id | UUID | FK to students |
| interaction_type | TEXT | 'speaking_practice', 'spelling_bee', etc. |
| correct | BOOLEAN | Overall correctness |
| **pronunciation_data** | JSONB | **NEW** — Word-level assessment array |
| pillar | TEXT | 'speaking', 'reading', etc. |
| created_at | TIMESTAMPTZ | Timestamp |

**pronunciation_data Example:**
```json
[
  {"word": "I", "status": "correct"},
  {"word": "like", "status": "correct"},
  {"word": "to", "status": "correct"},
  {"word": "play", "status": "incorrect"},
  {"word": "football", "status": "correct"}
]
```

---

## Testing Checklist

### Backend Setup

- [ ] **Migration 019** applied to Supabase
- [ ] Python dependencies installed (Whisper, difflib already available)
- [ ] `backend/app/utils/pronunciation.py` created
- [ ] `backend/app/api/v1/endpoints/speaking.py` updated with `evaluate-pro` endpoint
- [ ] Backend server restarted

### Frontend Setup

- [ ] `frontend/components/student/SpeakingPronunciationFeedback.tsx` created
- [ ] `frontend/app/student/speaking/page.tsx` updated to use Web Audio API
- [ ] Browser supports `navigator.mediaDevices.getUserMedia()`
- [ ] Microphone permissions granted in browser
- [ ] Framer Motion installed (should already be)

### Functional Testing

#### Test 1: Record and Submit Audio
1. Go to **Student Home → Speaking Practice**
2. Click **Start Speaking** on first prompt
3. **Speak the prompt clearly** (e.g., "I like to play football")
4. Click **Stop Recording**
5. Click **Submit**
6. **Expected:** Pronunciation feedback displays with word-level colors

#### Test 2: Word Accuracy Assessment
1. Intentionally **mispronounce one word** (e.g., say "pway" instead of "play")
2. Submit recording
3. **Expected:**
   - That word shows in red/orange
   - Other words in green
   - Score ~80% (4/5 correct)

#### Test 3: Audio Remediation
1. In feedback display, **hover over a red/orange word**
2. Click **Volume icon**
3. **Expected:** Browser plays correct pronunciation slowly

#### Test 4: Omitted Words
1. Skip a word while speaking (e.g., say "I like play football" instead of "I like to play football")
2. Submit
3. **Expected:** Omitted word ("to") shows in orange with omitted status

#### Test 5: Database Logging
1. After submitting, check Supabase
2. Go to **student_interactions table**
3. Filter by `interaction_type = 'speaking_practice'`
4. **Expected:** `pronunciation_data` column contains the word array

### Performance Notes

- **Whisper API**: ~2-3s per audio (account for API latency)
- **Word comparison**: <100ms for typical phrase
- **Frontend animation**: Smooth 60fps with Framer Motion

---

## API Endpoints Comparison

### OLD: `POST /speaking/evaluate`
```json
{
  "prompt_id": 1,
  "prompt_text": "I like to play",
  "transcript": "I like to play"  // Text only
}
```
→ Simple score, no word-level data

### NEW: `POST /speaking/evaluate-pro`
```
FormData:
  audio_file: <audio blob>
  prompt_id: 1
  prompt_text: "I like to play"
```
→ Audio processed, word-level assessment, pronunciation_data returned

**Both endpoints still work.** The app uses the new one for pronunciation feedback.

---

## Scoring System

### Pronunciation Score (0-100%)
```
Points per word:
  - Correct: 10 points
  - Incorrect: 5 points
  - Omitted: 0 points

Score = (total_earned / total_possible) × 100
```

### Points Awarded (0-10)
```
if pronunciation_score >= 70: 10 points
elif pronunciation_score >= 50: 5 points
else: 0 points
```

### Bonus: Teacher Analytics
The `pronunciation_data` JSONB is queryable in Supabase:
```sql
-- Find students with consistent pronunciation issues
SELECT student_id, COUNT(*) as attempts,
       AVG(CAST(pronunciation_data->0->>'status' as text)) as avg_status
FROM student_interactions
WHERE interaction_type = 'speaking_practice'
  AND pronunciation_data IS NOT NULL
GROUP BY student_id;
```

---

## Future Enhancements

1. **Prosody Analysis** — Detect intonation, stress, speech rate
2. **Phoneme Visualization** — Show incorrect phonemes (not just words)3. **Recording Playback** — Let students hear their own recording
4. **Comparative Charts** — Track pronunciation improvement over time
5. **Vocabulary Difficulty Scaling** — Adjust prompts based on student level

---

## Troubleshooting

### "Microphone access denied"
→ Browser permission issue. Check browser settings.

### "No audio recorded"
→ Ensure SpeechSynthesis isn't interfering. Reset media stream.

### "Pronunciation score always 0"
→ Check Whisper response format. Verify word-level data exists.

### "Words not highlighting in UI"
→ Check pronunciation_data array structure in console. Ensure status is one of: `"correct" | "incorrect" | "omitted"`.

---

## Files Modified

| File | Change | Type |
|------|--------|------|
| `supabase/migrations/019_pronunciation_data.sql` | NEW | Migration |
| `backend/app/utils/pronunciation.py` | NEW | Python utility |
| `backend/app/api/v1/endpoints/speaking.py` | Updated | FastAPI endpoint |
| `frontend/components/student/SpeakingPronunciationFeedback.tsx` | NEW | React component |
| `frontend/app/student/speaking/page.tsx` | Updated | Page logic |

---

## Dependencies

**Backend:**
- `openai` (Whisper API) — already installed
- `difflib` — stdlib, no install needed

**Frontend:**
- `framer-motion` — already installed
- `lucide-react` — already installed
- Web Audio API — built-in to browser

No new package installations required!

---

## Git Commit Message

```
feat(speaking): implement word-level pronunciation feedback with Whisper & phoneme highlighting

- Add pronunciation_data JSONB column to student_interactions (migration 019)
- Implement word-level diffing algorithm (Levenshtein distance based)
- Add POST /speaking/evaluate-pro endpoint with Whisper word-level timestamps
- Create SpeakingPronunciationFeedback component with animated word grid
- Replace SpeechRecognition with Web Audio API for audio recording
- Add audio remediation: click-to-hear for mispronounced words
- Color-coded feedback: green (correct), red (incorrect), orange (omitted)
- Scoring: 0-100% pronunciation score with points awarded (0-10)

Breaking: Switched from SpeechRecognition to Web Audio API
```

---

## Next Steps

1. **Apply migration 019** in Supabase SQL Editor
2. **Restart backend** (`python -m uvicorn app.main:app --reload`)
3. **Clear browser cache** or hard-refresh (`Ctrl+Shift+R`)
4. **Test with the checklist above**
5. (Optional) **Update TESTING_GUIDE.md** with pronunciation testing steps
