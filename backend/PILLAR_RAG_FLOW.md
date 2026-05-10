# Pillar Mission RAG Flow Diagram

## Complete Request Flow (After Implementation)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Student Requests Pillar Missions                                    │
│ GET /api/v1/missions/pillar?pillar=reading&is_frustrated=false     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: Authenticate Student (JWT)                                  │
│ - Verify student token                                              │
│ - Extract student_id, classroom_id                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2: Fetch Student Context (Parallel)                            │
│ ┌─────────────────┐ ┌──────────────┐ ┌────────────────────┐        │
│ │ Grade Level     │ │ Weaknesses   │ │ Performance Profile│        │
│ │ from classroom  │ │ recent 30d   │ │ accuracy, topics   │        │
│ └─────────────────┘ └──────────────┘ └────────────────────┘        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3: Fetch Active Topics                                         │
│ - Teacher-configured topics for this grade/classroom               │
│ - Used for both RAG query and mission generation                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3.5: RAG RETRIEVAL (NEW!)                                      │
│                                                                      │
│ Query: "Topics: Animals, Colors"                                    │
│ Grade: 3                                                            │
│ Match Count: 5                                                      │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────┐       │
│ │ retrieve_grade_filtered_chunks()                         │       │
│ │                                                          │       │
│ │ 1. Generate embedding for query                         │       │
│ │ 2. Call Supabase RPC match_snc_documents               │       │
│ │ 3. Filter by grade_level = 3                           │       │
│ │ 4. Return top 5 chunks by similarity                   │       │
│ └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│ Returns:                                                            │
│ [                                                                   │
│   {content: "Grade 3 vocab: animals...", metadata: {...}},         │
│   {content: "Grade 3 reading: stories...", metadata: {...}},       │
│   {content: "Grade 3 writing: sentences...", metadata: {...}},     │
│   ... (5 chunks total)                                             │
│ ]                                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4: Generate Pillar Missions                                    │
│                                                                      │
│ generate_pillar_missions(                                           │
│   pillar="reading",                                                 │
│   grade_level=3,                                                    │
│   active_topics=["Animals", "Colors"],                              │
│   student_id="student_123",                                         │
│   student_weaknesses=["vocabulary"],                                │
│   performance_profile={...},                                        │
│   context_chunks=[...] ← PASSED HERE                               │
│ )                                                                   │
│                                                                      │
│ ┌────────────────────────────────────────────────────────┐         │
│ │ Build System Prompt                                    │         │
│ │                                                        │         │
│ │ 1. Task distribution (PILLAR_TASK_CONFIGS)            │         │
│ │ 2. Difficulty distribution                            │         │
│ │ 3. Field instructions                                 │         │
│ │ 4. Student weaknesses context                         │         │
│ │ 5. Performance profile adaptation                     │         │
│ │ 6. Confidence builder override (if frustrated)        │         │
│ │ 7. CURRICULUM CONTEXT (NEW!)                          │         │
│ │    ┌───────────────────────────────────────┐          │         │
│ │    │ SNC CURRICULUM CONTEXT (Grade 3):     │          │         │
│ │    │ [1] Grade 3 vocab: animals...         │          │         │
│ │    │ [2] Grade 3 reading: stories...       │          │         │
│ │    │ [3] Grade 3 writing: sentences...     │          │         │
│ │    │                                       │          │         │
│ │    │ Use vocabulary and concepts from      │          │         │
│ │    │ this SNC curriculum context.          │          │         │
│ │    └───────────────────────────────────────┘          │         │
│ └────────────────────────────────────────────────────────┘         │
│                                                                      │
│ ┌────────────────────────────────────────────────────────┐         │
│ │ Call OpenAI LLM                                        │         │
│ │ - Model: gpt-4o-mini                                  │         │
│ │ - Structured output: PillarMissions                   │         │
│ │ - Timeout: 30s                                        │         │
│ │ - Retries: 3 attempts with backoff                   │         │
│ └────────────────────────────────────────────────────────┘         │
│                                                                      │
│ Returns: 10 mission questions                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 5: Validate & Format Questions                                 │
│ - Normalize IDs (1-10)                                              │
│ - Set pillar field                                                  │
│ - Ensure all points_value = 10                                      │
│ - Validate topic alignment                                          │
│ - Strip correct_answer from response                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 6: Cache & Return                                              │
│ - Cache missions (TTL: 1 hour)                                      │
│ - Return PillarMissionsResponse                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Student Receives 10 Curriculum-Grounded Questions                   │
│ {                                                                   │
│   "pillar": "reading",                                              │
│   "active_topics_summary": "Animals, Colors",                       │
│   "questions": [                                                    │
│     {                                                              │
│       "id": 1,                                                     │
│       "question": "The cat is ___. Choose the right word.",       │
│       "task_type": "fill_in_blank",                               │
│       "options": ["sleeping", "swimming", "flying", "cooking"],   │
│       "difficulty": "medium",                                      │
│       "points_value": 10,                                          │
│       "urdu_hint": "بلی سو رہی ہے"                                │
│     },                                                             │
│     ... (9 more questions)                                         │
│   ],                                                               │
│   "weakness_focus_questions": 3                                    │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Differences: Before vs After

### BEFORE (No RAG)
```
Student Request → Auth → Context → Topics → [SKIP RAG] → LLM → Questions
                                                ❌
                                        (Generic knowledge)
```

### AFTER (With RAG)
```
Student Request → Auth → Context → Topics → RAG Retrieval → LLM → Questions
                                                  ✅
                                          (5 SNC curriculum chunks)
```

## Curriculum Context Example in Prompt

```
You are an ESL mission designer for Pakistani primary school Grade 3 students.

Generate EXACTLY 10 questions for the reading pillar using ONLY vocabulary
appropriate for Grade 3.

ACTIVE TOPICS: Animals, Colors

[... task distribution, difficulty, rules ...]

SNC CURRICULUM CONTEXT (Grade 3):
[1] Grade 3 vocabulary: animals (cat, dog, bird), colors (red, blue, green),
simple present tense. Example: The cat is sleeping. The bird is flying.

[2] Grade 3 reading comprehension: short stories about daily life, family,
school activities. Use simple sentences with common verbs.

[3] Grade 3 writing: sentence formation, basic punctuation, simple descriptions.
Focus on subject-verb-object patterns.

Use vocabulary and concepts from this SNC curriculum context when creating questions.
```

## Error Handling Flow

```
┌─────────────────────────────────────┐
│ RAG Retrieval Attempt               │
└────────────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
    ┌────────┐      ┌──────────┐
    │Success │      │  Failure │
    │5 chunks│      │Exception │
    └────┬───┘      └─────┬────┘
         │                │
         │                ▼
         │          ┌──────────────────┐
         │          │ Log Warning      │
         │          │ context_chunks=[]│
         │          └─────┬────────────┘
         │                │
         └────────┬───────┘
                  ▼
         ┌──────────────────┐
         │ Continue with    │
         │ Mission Generation│
         │ (may have context│
         │  or be empty)    │
         └──────────────────┘
```

## Background Task Flow (Personalized Missions)

```
┌─────────────────────────────────────────────┐
│ Generic Cache Hit                           │
│ Return generic questions immediately        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Background Task Started                     │
│ _generate_personalized_missions()           │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ RAG Retrieval (Background)                  │
│ - Same 5 chunks                             │
│ - Same grade filtering                      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Generate Personalized Missions              │
│ - Include student weaknesses                │
│ - Include performance profile               │
│ - Include curriculum context                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Cache Personalized Result                   │
│ - Student-specific cache key                │
│ - TTL: 1 hour                               │
│ - Next request gets personalized version    │
└─────────────────────────────────────────────┘
```

## Monitoring & Logging

### Success Logs
```
INFO: RAG retrieval for pillar missions: 5 chunks for reading grade 3
INFO: Pillar mission generation succeeded for student student_123 pillar reading, count: 10
```

### Warning Logs (Graceful Degradation)
```
WARNING: RAG retrieval failed for pillar missions, continuing without curriculum context: <error>
INFO: Pillar mission generation succeeded for student student_123 pillar reading, count: 10
```

### Background Task Logs
```
INFO: Background task RAG retrieval: 5 chunks for listening grade 3
INFO: Background personalization cached for student student_456 pillar listening
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| RAG Retrieval Time | 200-500ms |
| LLM Generation Time | 8-15s (10 questions) |
| Total Request Time | 9-16s |
| Cache Hit Time | <100ms |
| Chunk Size Limit | 300 chars × 3 = 900 chars |
| Token Overhead | ~600-900 tokens |

## Summary

The pillar mission flow now includes curriculum grounding via RAG retrieval, ensuring questions are based on Pakistan's National Curriculum rather than generic LLM knowledge. This brings pillar missions into alignment with daily missions, providing consistent, curriculum-grounded question generation across all mission types in PrimePal.
