# Topic Validation Optimization - Quick Reference

## What Changed

### 1. TOPIC_KEYWORDS Dictionary (Line 329)
- **22 topics** (was 13)
- **520+ keywords** (was ~150)
- **New Grade 4-5 topics:** Grammar, Composition, Reading Comprehension, Vocabulary, Literature, Letter Writing, Punctuation, Idioms, Synonyms & Antonyms
- **Plural forms added:** animals, cats, dogs, birds, etc.
- **Verb forms added:** eating, drinking, walking, reading, writing, etc.

### 2. Validation Logic (Line 500-525)
- **Enhanced logging:** Shows searchable_text in rejected questions
- **Pass rate calculation:** Reports "7/10 passed (70%)"
- **Better diagnostics:** First 3 rejected questions logged with context

### 3. LLM Prompt (Line 634-643)
- **Explicit count enforcement:** "EXACTLY 10 questions. Not 9, not 11"
- **Verification instruction:** "Before responding, count your questions"
- **Clear consequences:** "Responses with incorrect counts will be REJECTED"

### 4. Validation Stats (Line 756-772)
- **Automatic logging:** Pass rate after every validation
- **Low pass warning:** Alert if < 70% on first attempt
- **Diagnostic info:** "LLM may not be following topic constraints"

## How to Monitor

### Check Validation Pass Rates
```bash
# In backend logs
grep "Topic validation stats" logs/*.log

# Example output:
# Topic validation stats: 10/10 passed (100%) for reading grade 5
# Topic validation stats: 7/10 passed (70%) for writing grade 4  ← Watch for low rates
```

### Check for Low Pass Warnings
```bash
grep "LOW PASS RATE" logs/*.log

# Example output:
# LOW PASS RATE (60%) on first attempt for listening. LLM may not be following topic constraints: ['Animals']
```

### Check Question Counts
```bash
grep "LLM returned.*questions" logs/*.log

# Should consistently see:
# LLM returned 10 questions for reading grade 5
```

## Testing Checklist

- [ ] Test with new Grade 4-5 topics (Grammar, Composition, Literature, etc.)
- [ ] Verify plural matching (topic "Animals" matches "cats", "dogs", etc.)
- [ ] Verify verb form matching (topic "School" matches "reading", "writing", etc.)
- [ ] Check logs for pass rate >= 70%
- [ ] Confirm 10 questions generated consistently
- [ ] Review rejected questions in logs (if any)

## Expected Pass Rates

- **Good:** 90-100% (9-10 questions pass validation)
- **Acceptable:** 70-89% (7-8 questions pass validation)
- **Needs attention:** < 70% (< 7 questions pass)

If pass rates are consistently < 70%, the LLM prompt may need tuning or active_topics may be too specific.

## Quick Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Pass rate < 50% | LLM ignoring topic constraints | Check active_topics in logs, may need to adjust prompt |
| 9 questions instead of 10 | LLM timeout or early stop | Check for timeout errors in logs, increase timeout if needed |
| Questions on wrong topics | Keywords missing from TOPIC_KEYWORDS | Add missing keywords to relevant topic |
| False rejections | Keywords too restrictive | Add plural/verb forms to topic |

## File Reference

**Modified file:** `backend/app/agents/tutor_agent/mission_generator.py`

**Key line numbers:**
- Line 329: TOPIC_KEYWORDS dictionary
- Line 435: validate_topic_alignment function
- Line 500-525: Validation logging
- Line 634-643: LLM prompt with count enforcement
- Line 756-772: Validation statistics logging

---

**Last updated:** 2026-05-07
