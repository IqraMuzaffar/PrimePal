# RAG Integration Comparison: Daily vs Pillar Missions

## Before This Change

### Daily Missions (3 questions)
```
Student Request → Fetch Topics → RAG RETRIEVAL → Generate Questions → Return
                                      ✅
                                 (5 SNC chunks)
```

### Pillar Missions (10 questions)
```
Student Request → Fetch Topics → Generate Questions → Return
                                      ❌
                                 (No curriculum)
```

**Problem**: Inconsistency leads to pillar missions using generic English knowledge instead of Pakistan's National Curriculum.

---

## After This Change

### Daily Missions (3 questions)
```
Student Request → Fetch Topics → RAG RETRIEVAL → Generate Questions → Return
                                      ✅
                                 (5 SNC chunks)
```

### Pillar Missions (10 questions)
```
Student Request → Fetch Topics → RAG RETRIEVAL → Generate Questions → Return
                                      ✅
                                 (5 SNC chunks)
```

**Result**: Both mission types now use the same RAG pipeline for SNC curriculum grounding.

---

## Code Comparison

### missions.py - Daily Missions (Unchanged)
```python
# Lines 248-256
seed_phrase = f"English topics: {', '.join(active_topic_names)}" if active_topic_names else "vocabulary words lesson"
try:
    context_chunks = await retrieve_grade_filtered_chunks(
        query=seed_phrase,
        grade_level=grade_level,
        supabase_admin_client=supabase,
        match_count=5,
    )
    logger.info("RAG retrieval succeeded: %d chunks for grade %d", len(context_chunks), grade_level)
```

### missions.py - Pillar Missions (NEW)
```python
# Lines 862-876
seed_phrase = f"Topics: {', '.join(active_topic_names)}" if active_topic_names else "vocabulary words lesson"
try:
    context_chunks = await retrieve_grade_filtered_chunks(
        query=seed_phrase,
        grade_level=grade_level,
        supabase_admin_client=supabase,
        match_count=5,
    )
    logger.info(f"RAG retrieval for pillar missions: {len(context_chunks)} chunks for {pillar} grade {grade_level}")
except Exception as exc:
    logger.warning(f"RAG retrieval failed for pillar missions, continuing without curriculum context: {exc}")
    context_chunks = []
```

---

## LLM Prompt Enhancement

### Before (No Curriculum Context)
```
You are an ESL mission designer for Pakistani primary school Grade 3 students.

Generate EXACTLY 10 questions for the reading pillar using ONLY vocabulary appropriate for Grade 3.

ACTIVE TOPICS: Animals, Colors

RULES:
1. Use age-appropriate vocabulary for Grade 3 Pakistani students.
...
```

### After (With Curriculum Context)
```
You are an ESL mission designer for Pakistani primary school Grade 3 students.

Generate EXACTLY 10 questions for the reading pillar using ONLY vocabulary appropriate for Grade 3.

ACTIVE TOPICS: Animals, Colors

RULES:
1. Use age-appropriate vocabulary for Grade 3 Pakistani students.
...

SNC CURRICULUM CONTEXT (Grade 3):
[1] Grade 3 vocabulary: animals (cat, dog, bird), colors (red, blue, green), simple present tense. Example: The cat is sleeping. The bird is flying.

[2] Grade 3 reading comprehension: short stories about daily life, family, school activities. Use simple sentences with common verbs.

[3] Grade 3 writing: sentence formation, basic punctuation, simple descriptions. Focus on subject-verb-object patterns.

Use vocabulary and concepts from this SNC curriculum context when creating questions.
```

---

## Impact on Question Quality

### Before (Generic LLM Knowledge)
- Questions might use vocabulary not in SNC curriculum
- Topics might not align with Pakistani education standards
- Difficulty might be inconsistent with grade expectations

### After (SNC Curriculum Grounded)
- Questions use curriculum-appropriate vocabulary
- Topics align with Pakistani National Curriculum
- Difficulty matches grade-level expectations from SNC
- Better consistency with teacher-selected topics

---

## Key Benefits

1. **Curriculum Alignment**: Questions now match Pakistan's education standards
2. **Consistency**: Daily and pillar missions use the same RAG pipeline
3. **Topic Relevance**: Better alignment with teacher-configured topics
4. **Educational Quality**: Higher quality questions grounded in actual curriculum
5. **Backward Compatibility**: Graceful degradation if RAG fails
6. **Flexibility**: Works with or without curriculum context

---

## Technical Details

### RAG Retrieval Parameters
- **Query**: Teacher-selected topics or "vocabulary words lesson"
- **Grade Filter**: Student's grade level (1-5)
- **Chunk Count**: 5 chunks (same as daily missions)
- **Timeout**: Handled by retrieve_grade_filtered_chunks()
- **Fallback**: Empty list if retrieval fails

### Prompt Integration
- **Chunk Limit**: Top 3 chunks used in prompt
- **Character Limit**: 300 characters per chunk
- **Position**: After adaptive section, before generation
- **Format**: Numbered list with clear section header

### Error Handling
- **RAG Failure**: Logs warning, continues without context
- **Empty Chunks**: Empty string in prompt (no section added)
- **None Chunks**: Treated same as empty list
- **Generation Failure**: Standard retry logic (unchanged)

---

## Verification Checklist

- [x] Syntax validated (py_compile)
- [x] Backward compatibility maintained
- [x] Error handling implemented
- [x] Logging added for monitoring
- [x] Background task updated
- [x] Test script created
- [ ] Integration testing with real API
- [ ] Verify curriculum chunks retrieved
- [ ] Check question quality improvement
- [ ] Monitor RAG success/failure rates
