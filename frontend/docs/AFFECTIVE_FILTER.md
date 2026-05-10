# Dynamic Sentiment & Avatar Empathy — Complete Implementation Guide

## Feature Overview

The **Dynamic Sentiment & Avatar Empathy** system monitors student cognitive load in real-time and dynamically adjusts both UI/avatar expressions and question difficulty to manage the **Affective Filter** — a psychological barrier that inhibits learning under stress.

**Key Components:**
1. **Frustration Detection** (Backend) — Identifies cognitive overload
2. **Adaptive Question Generation** (Backend) — Adjusts difficulty
3. **Dynamic Avatar** (Frontend) — Visual emotional feedback
4. **Gameplay Integration** (Frontend) — Real-time feedback loop

---

## Data Flow Diagram

```
Student submits answer
         ↓
   [MissionGameplay]
         ↓
   Call onAnswer(result)
         ↓
   [handleAnswer in PillarMissionPage]
         ↓
   POST /interactions (with result)
         ↓
   Backend checks last 3 interactions
         ↓
   ┌─────────────────────────────────┐
   │ Frustration Detection Algorithm │
   │                                 │
   │ ✗ All 3 answers wrong?          │
   │ ✗ Avg time > 12 seconds?        │
   └─────────────────────────────────┘
         ↓
   ┌─────────────────────────────────┐
   │   Return is_frustrated flag     │
   └─────────────────────────────────┘
         ↓
   Frontend receives response
         ↓
   ┌─────────────────────────────────┐
   │ If is_frustrated == true:       │
   │ - Set sentiment = 'encouraging' │
   │ - Show speech bubble            │
   │ - Fetch new questions with      │
   │   ?is_frustrated=true           │
   │   (Confidence Builders)         │
   └─────────────────────────────────┘
         ↓
   LLM generates easy questions
   (reduced complexity, obvious answers)
         ↓
   Student answers Confidence Builder
         ↓
   If CORRECT:
   - Set sentiment = 'celebratory'
   - Play high-energy sound
   - Show sparkle animations
   - Continue with normal difficulty
```

---

## Step 1: Frustration Detection (Backend)

### Endpoint: `POST /api/v1/interactions`

**Request:**
```json
{
  "pillar": "reading",
  "results": [
    {
      "question_id": "q-123",
      "is_correct": false,
      "time_remaining": 3
    }
  ]
}
```

**Response:**
```json
{
  "logged_interactions": 1,
  "correct_count": 0,
  "accuracy": 0.0,
  "pillar": "reading",
  "is_frustrated": true,
  "frustration_reason": "All 3 consecutive questions answered incorrectly (100% error rate)"
}
```

### Algorithm

The backend evaluates a **rolling window of the last 3 interactions**:

1. **Query** the 3 most recent mission interactions for the student
2. **Check Condition A**: All 3 answers incorrect?
   - If yes → `is_frustrated = true` + reason: "100% error rate"
3. **Check Condition B**: Average time_spent > 12 seconds?
   - If yes → `is_frustrated = true` + reason: "High cognitive load"
4. **Return** the flag with reason string for logging

**Code Location:** `backend/app/api/v1/endpoints/interactions.py` (lines 119-164)

---

## Step 2: Adaptive Question Generation (Backend)

### Endpoints: `GET /api/v1/missions/daily` and `GET /api/v1/missions/pillar`

Both endpoints accept an optional `?is_frustrated=true` query parameter.

**Request (with frustration flag):**
```
GET /api/v1/missions/pillar?pillar=reading&is_frustrated=true
```

**When `is_frustrated=true`:**

The LLM receives a **CRITICAL OVERRIDE** prompt instruction:

```
CRITICAL OVERRIDE — STUDENT IS EXPERIENCING HIGH COGNITIVE LOAD:
The student is currently frustrated (3 consecutive incorrect answers or high time pressure).
The next set of questions MUST be "Confidence Builders" to recover their affective state.

CONFIDENCE BUILDER RULES:
- Reduce vocabulary complexity by 1-2 grade levels BELOW the student's current grade.
- Make the correct answer OBVIOUS (eliminate ambiguous distractors).
- Focus on concepts the student has demonstrated understanding of in past correct answers.
- Frame all questions with extra encouragement ("You're doing great!", "Nice work!", etc.).
- Use simpler sentence structures and shorter questions.
- Ensure at least 7 of the 10 questions are easy wins (>90% success probability).
```

**Code Location:** `backend/app/agents/tutor_agent/mission_generator.py` (lines 69-111, 174-178)

---

## Step 3: Dynamic Avatar (Frontend)

### Component: `PrimePalAvatar` (`components/student/PrimePalAvatar.tsx`)

**Sentiment States:**

| Sentiment | Expression | Glow | Animation | Usage |
|-----------|-----------|------|-----------|-------|
| `neutral` | Calm, straight mouth | Indigo | Minimal | Default state |
| `happy` | Bright smile, rosy cheeks | Green | Gentle bobbing | Correct answer |
| `encouraging` | Concerned support, tilted head | Orange | Subtle support | After frustration detected |
| `celebratory` | Wide smile, sparkles | Orange | Energetic bobbing | Recovery success |

**Usage:**
```tsx
<PrimePalAvatar
  sentiment="encouraging"
  size="md"
  showSpeechBubble={true}
  speechText="Take a deep breath, you got this! 💪"
/>
```

**Documentation:** See `frontend/docs/AVATAR_COMPONENT.md` for complete props and customization.

---

## Step 4: Gameplay Integration (Frontend)

### Page: `app/student/missions/[pillar]/page.tsx`

### State Management

```typescript
// Sentiment tracking
const [currentSentiment, setCurrentSentiment] = useState<AvatarSentiment>('neutral');
const [showSpeechBubble, setShowSpeechBubble] = useState(false);

// Frustration state machine
const [isFrustrated, setIsFrustrated] = useState(false);
const [wasEncouraging, setWasEncouraging] = useState(false);

// Sound effects
const { play: playCorrectSound } = usePrimeSounds('correct');
const { play: playCelebrationSound } = usePrimeSounds('level-up');
```

### Answer Submission Handler

**Function:** `handleAnswer(result: GameResult)`

**Flow:**
1. Submit answer to `POST /interactions`
2. Receive `is_frustrated` flag from backend
3. **If frustrated:**
   - Set sentiment to `'encouraging'`
   - Show supportive speech bubble
   - Set flag `wasEncouraging = true`
   - Continue (don't redirect)
4. **If not frustrated but student was encouraging:**
   - If answer is correct → sentiment = `'celebratory'` + play celebration sound
   - Reset encouraging flag
   - Auto-hide speech bubble after 3 seconds
5. **If regular correct answer:**
   - Set sentiment = `'happy'`
   - Play correct sound
   - Auto-hide after 1.5 seconds
6. **If incorrect (not frustrated):**
   - Set sentiment = `'neutral'`
   - Hide speech bubble

**Code Location:** `frontend/app/student/missions/[pillar]/page.tsx` (lines 68-128)

### Confidence Builder Question Loading

**Function:** `handleComplete(results: GameResult[])`

**When student has completed current questions:**
1. Check if `isFrustrated` flag is true
2. **If frustrated:**
   - Fetch new questions with `?is_frustrated=true`
   - Questions are automatically easier (Confidence Builder)
   - Reset sentiment to `'neutral'`
   - **Do NOT redirect** — continue with new questions
3. **If not frustrated:**
   - Submit all results to `/missions/complete`
   - Award points and update progress
   - Redirect to mission selection

**Code Location:** `frontend/app/student/missions/[pillar]/page.tsx` (lines 130-188)

### MissionGameplay Component Integration

**Props passed from PillarMissionPage:**
```tsx
<MissionGameplay
  questions={questions}
  onComplete={handleComplete}
  onAnswer={handleAnswer}           // NEW: frustration tracking callback
  avatarSentiment={currentSentiment} // NEW: sentiment state
  showSpeechBubble={showSpeechBubble} // NEW: speech bubble visibility
/>
```

**Avatar rendering:**
```tsx
<PrimePalAvatar
  sentiment={avatarSentiment}
  size="md"
  showSpeechBubble={showSpeechBubble}
  speechText={getSpeechText(avatarSentiment)}
/>
```

**Code Location:** `frontend/components/student/MissionGameplay.tsx` (lines 98-130)

---

## User Experience Timeline

### Scenario: Student gets 3 questions wrong in a row

**Question 1: Incorrect**
- Avatar: `neutral` (calm, no change)
- Continue normally

**Question 2: Incorrect**
- Avatar: `neutral`
- Continue normally

**Question 3: Incorrect**
- ⚠️ Frustration detected!
- Avatar transitions to: `encouraging` (orange glow, concerned expression)
- Speech bubble appears: "Take a deep breath, you got this! 💪"
- Backend generates 10 "Confidence Builder" questions
- **Frontend loads and shows new questions** (doesn't redirect)

**Question 4 (Confidence Builder): Correct!**
- 🎉 Recovery!
- Avatar transitions to: `celebratory` (sparkles, wide smile)
- Speech bubble appears: "Amazing! Fantastic work! 🎉"
- High-energy celebration sound plays
- Sparkle effects animate around avatar
- After 3 seconds, reset to neutral
- Continue with remaining Confidence Builder questions

**Questions 5-10 (Confidence Builders): More successes**
- Each correct answer plays normal correct sound
- Avatar shows `happy` sentiment temporarily
- Student regains confidence

**After 10 questions**
- Submit all results
- Award points and resume normal difficulty

---

## Database Schema

### `student_interactions` table additions (Migration 022)

```sql
ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0
  CHECK (time_spent >= 0 AND time_spent <= 15);

ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS is_frustrated BOOLEAN DEFAULT FALSE;
```

**Columns used:**
- `correct` (existing) — True/False answer correctness
- `time_spent` (new) — 0-15 seconds elapsed
- `created_at` (existing) — Timestamp for window queries
- `pillar` (existing) — Reading/Writing/Listening/Speaking
- `is_frustrated` (new) — Flag for analytics

**Index:**
```sql
CREATE INDEX idx_student_interactions_time_spent
  ON student_interactions(student_id, created_at DESC)
  WHERE interaction_type IN ('mission_mc', 'mission_fill');
```

---

## API Response Changes

### `POST /interactions` — Updated Response

```typescript
interface LogInteractionsResponse {
  logged_interactions: number;
  correct_count: number;
  accuracy: float;
  pillar: string;
  is_frustrated: boolean;           // NEW
  frustration_reason: string | null; // NEW
}
```

### `GET /missions/pillar` — New Query Parameter

```
GET /missions/pillar?pillar=reading&is_frustrated=true
```

Optional parameter. When `true`, generates Confidence Builder questions.

---

## Testing Checklist

### Backend Testing

- [ ] Frustration detection for 3 wrong answers in a row
- [ ] Frustration detection for average time > 12 seconds
- [ ] Confidence Builder prompt is included in LLM call
- [ ] LLM returns reduced complexity questions
- [ ] `is_frustrated` flag correctly returned in response

### Frontend Testing

- [ ] Avatar sentiment transitions smoothly
- [ ] Speech bubble appears with correct text
- [ ] Sounds play (correct, celebration) when expected
- [ ] Confidence Builder questions load instead of redirecting
- [ ] After correct answer on Confidence Builder, sentiment = celebratory
- [ ] After completion, student can resume or go back to menu

### UX Testing

- [ ] Visual feedback is immediate and clear
- [ ] Encouragement messages feel supportive, not condescending
- [ ] Transitions between sentiments are smooth (not jarring)
- [ ] Celebration feels rewarding when student recovers
- [ ] Speech bubbles don't cover important UI

---

## Logging & Monitoring

### Backend Logs

```
DEBUG: LLM response (first 200 chars): ...
WARNING: Frustration detected for student {id}: All 3 consecutive questions answered incorrectly
WARNING: Frustration detected for student {id}: High cognitive load: average time spent is 13.2s > 12s threshold
INFO: Pillar mission generation succeeded for student {id} pillar reading, count: 10 (Confidence Builder)
```

### Frontend Logs

```
DEBUG: is_frustrated={true}, loading Confidence Builder questions
DEBUG: Frustration detected: {reason}
DEBUG: Confidence Builder loaded, sentiment=encouraging
INFO: Student recovered! sentiment=celebratory
```

---

## Performance Considerations

- **Avatar animations**: GPU-accelerated (uses `transform` and `opacity`)
- **Speech bubble**: Smooth AnimatePresence transitions
- **Sounds**: Async playback, non-blocking
- **LLM calls**: Backend, doesn't block gameplay
- **Confidence Builder reload**: Happens between questions, no freezing

---

## Future Enhancements

1. **Adaptive emotion intensity**: Increase glow/animation intensity as frustration increases
2. **Custom encouragement**: Vary speech text based on student's weak areas
3. **Teacher dashboard**: View student frustration triggers and recovery patterns
4. **Difficulty curve**: Remember when student recovers and gradually increase challenge
5. **Peer comparison**: Celebrate overcoming challenges that similar students struggle with
6. **Streak tracking**: Visual feedback for consecutive correct answers after recovery

---

## Related Files

- Backend: `backend/app/api/v1/endpoints/interactions.py`
- Backend: `backend/app/agents/tutor_agent/mission_generator.py`
- Backend: `backend/app/api/v1/endpoints/missions.py`
- Frontend: `frontend/app/student/missions/[pillar]/page.tsx`
- Frontend: `frontend/components/student/MissionGameplay.tsx`
- Frontend: `frontend/components/student/PrimePalAvatar.tsx`
- Database: `supabase/migrations/022_sentiment_affective_filter.sql`
- Docs: `frontend/docs/AVATAR_COMPONENT.md`
