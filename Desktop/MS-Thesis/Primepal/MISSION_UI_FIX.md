# Mission UI Bugs - Timer Stacking & Wrong Answer Validation

## Issues Fixed

### Issue 1: Timer Stacking (Multiple Timers Visible)
**Problem:** Old question timers remained visible when advancing to next question, causing multiple "Time Remaining" bars to stack up.

**Root Cause:**
- Timer component had `key={timerKey}` which should force remount
- But lacked `AnimatePresence` wrapper for proper cleanup
- Timer wasn't hidden during feedback phase

**Fix Applied:**
```tsx
// Before:
<QuestionTimer
  key={timerKey}
  initialSeconds={timerSeconds}
  onTimeUp={handleTimeUp}
/>

// After:
<AnimatePresence mode="wait">
  {!showFeedback && (
    <QuestionTimer
      key={timerKey}
      initialSeconds={timerSeconds}
      onTimeUp={handleTimeUp}
    />
  )}
</AnimatePresence>
```

**File:** `frontend/components/student/MissionGameplay.tsx`

**Benefits:**
- ✅ Timer hidden during feedback phase
- ✅ Proper animation out when question changes
- ✅ No stacking of multiple timers
- ✅ Cleaner UI during gameplay

---

### Issue 2: Correct Answers Marked as Wrong
**Problem:** User selects correct answer but gets red X with "Try Again! 0 points"

**Root Cause:**
- Answer validation used exact string comparison (`===`)
- Case-sensitive matching: "The" ≠ "the"
- Whitespace not trimmed: "playing " ≠ "playing"
- LLM-generated correct answers might have different casing

**Examples of False Negatives:**
```typescript
// These would fail despite being correct:
"The child is playing" vs "the child is playing" (case)
"playing " vs "playing" (trailing space)
"THE CHILD IS PLAYING" vs "The Child Is Playing" (case)
```

**Fix Applied:**
Made answer validation case-insensitive and trim whitespace in 5 task components:

#### 1. GuidedTranslation.tsx
```typescript
// Before:
const isCorrect = selectedWords.every((w, i) => w === correctOrder[i]);

// After:
const isCorrect = selectedWords.every((w, i) =>
  w.toLowerCase().trim() === correctOrder[i].toLowerCase().trim()
);
```

#### 2. SentenceScramble.tsx
```typescript
// Before:
const isCorrect = texts.every((w, i) => w === correctOrder[i]);

// After:
const isCorrect = texts.every((w, i) =>
  w.toLowerCase().trim() === correctOrder[i].toLowerCase().trim()
);
```

#### 3. LegacyMultipleChoice.tsx
```typescript
// Before:
const isCorrect = answer === question.correct_answer;

// After:
const isCorrect = answer.toLowerCase().trim() ===
  (question.correct_answer ?? '').toLowerCase().trim();
```

#### 4. ListenAndChoose.tsx
```typescript
// Before:
onAnswer(id, id === question.correct_answer);
isCorrect={opt.id === question.correct_answer}

// After:
const isCorrect = id.toLowerCase().trim() ===
  (question.correct_answer ?? '').toLowerCase().trim();
onAnswer(id, isCorrect);
isCorrect={opt.id.toLowerCase().trim() ===
  (question.correct_answer ?? '').toLowerCase().trim()}
```

#### 5. SentencePictureMatch.tsx
```typescript
// Before:
onAnswer(id, id === question.correct_answer);
isCorrect={opt.id === question.correct_answer}

// After:
const isCorrect = id.toLowerCase().trim() ===
  (question.correct_answer ?? '').toLowerCase().trim();
onAnswer(id, isCorrect);
isCorrect={opt.id.toLowerCase().trim() ===
  (question.correct_answer ?? '').toLowerCase().trim()}
```

---

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `frontend/components/student/MissionGameplay.tsx` | Wrapped timer in AnimatePresence, hide during feedback | 219-226 |
| `frontend/components/student/tasks/writing/GuidedTranslation.tsx` | Case-insensitive answer validation | 24-31 |
| `frontend/components/student/tasks/writing/SentenceScramble.tsx` | Case-insensitive answer validation | 52-59 |
| `frontend/components/student/tasks/LegacyMultipleChoice.tsx` | Case-insensitive answer validation | 11-16 |
| `frontend/components/student/tasks/listening/ListenAndChoose.tsx` | Case-insensitive answer validation | 12-16, 32 |
| `frontend/components/student/tasks/reading/SentencePictureMatch.tsx` | Case-insensitive answer validation | 11-15, 28 |

**Total:** 6 files modified

---

## Testing After Fixes

### Test Case 1: Timer Behavior
1. Start any mission type
2. Answer first question
3. **Expected:** Timer disappears during feedback, new timer appears for next question
4. **Expected:** Only ONE timer visible at a time
5. **Expected:** No stacking of multiple "Time Remaining" bars

### Test Case 2: Answer Validation
Try these scenarios that previously failed:

| Input | Correct Answer | Should | Previously |
|-------|---------------|--------|-----------|
| "The child is playing" | "the child is playing" | ✅ Pass | ❌ Fail |
| "playing " (trailing space) | "playing" | ✅ Pass | ❌ Fail |
| "THE CHILD IS PLAYING" | "The Child Is Playing" | ✅ Pass | ❌ Fail |
| " the child is playing " | "the child is playing" | ✅ Pass | ❌ Fail |

### Manual Test Steps
1. Load any reading/writing/listening mission
2. Answer questions with correct content but different casing
3. **Expected:** Green checkmark with correct points
4. **Expected:** No red X for correct answers
5. **Expected:** Case and whitespace don't affect correctness

---

## Why This Happened

### Timer Issue
- Quick development without testing question transitions
- Missing AnimatePresence wrapper is a common React mistake
- Timer component worked in isolation but broke in sequence

### Answer Validation Issue
- LLM generates questions with varying casing in correct_answer field
- Frontend validation didn't account for case variations
- No normalization of user input before comparison
- Common bug pattern: exact string matching without normalization

---

## Prevention

### For Timer Issues
- ✅ Always wrap conditional renders in AnimatePresence
- ✅ Test full user flows, not just individual components
- ✅ Use React DevTools to check for component leaks

### For Answer Validation
- ✅ Always normalize strings before comparison (toLowerCase, trim)
- ✅ Consider using a validation utility function across all task types
- ✅ Add unit tests for answer validation logic
- ✅ Test with various input formats (case, whitespace, punctuation)

---

## Impact

**Before Fixes:**
- ❌ Frustrating UX: correct answers marked wrong
- ❌ Students lose points unfairly
- ❌ Confusing UI with multiple timers
- ❌ User loses trust in the system

**After Fixes:**
- ✅ Accurate answer validation
- ✅ Fair point distribution
- ✅ Clean, single timer UI
- ✅ Better user experience
- ✅ Increased student engagement

---

## Status
🟢 **FIXED** - All 6 files updated with validation improvements and timer cleanup
