# Comprehensive End-to-End Test Execution Plan
**Date:** 2026-05-06
**Status:** Ready to Execute
**Scope:** Complete Teacher-Student Cycle with All 4 Pillars

---

## 🎯 **TEST OBJECTIVE**

Rigorously validate the complete teacher-student cycle:
1. Teacher selects topics for a grade
2. Students get missions aligned with topics + weaknesses + curriculum
3. Students complete missions (creating weakness data)
4. Teacher sees accurate reports with AI guidance
5. All 4 pillars work correctly (Reading, Writing, Listening, Speaking)

---

## 📋 **TEST EXECUTION PLAN**

### **Phase 1: Teacher Topic Selection (Grade 4)**

#### **Test 1.1: Login and Navigate**
```bash
# API Call
POST /api/v1/auth/teacher/login
{
  "email": "teacher@school.com",
  "password": "password"
}

# Expected: 200 OK, JWT token returned
```

**Verification:**
- [ ] Teacher authenticated successfully
- [ ] JWT token valid
- [ ] Teacher role confirmed

---

#### **Test 1.2: Fetch Available Topics**
```bash
# API Call
GET /api/v1/topics/?grade_level=4
Authorization: Bearer {teacher_token}

# Expected: List of Grade 4 topics grouped by skill
```

**Verification:**
- [ ] All 4 skills present (Reading, Writing, Listening, Speaking)
- [ ] Each skill has 4-5 topics
- [ ] Total ~20 topics for Grade 4
- [ ] Topics are SNC curriculum-aligned

**Sample Expected Response:**
```json
{
  "topics": [
    {"id": 16, "skill": "reading", "topic_name": "Animals", "grade_level": 4},
    {"id": 17, "skill": "reading", "topic_name": "Food Items", "grade_level": 4},
    {"id": 18, "skill": "writing", "topic_name": "Simple Sentences", "grade_level": 4},
    ...
  ]
}
```

---

#### **Test 1.3: Select Topics from All 4 Pillars**
```bash
# API Call
PUT /api/v1/classroom/{classroom_id}/active-topics
Authorization: Bearer {teacher_token}
{
  "topic_ids": [16, 17, 18, 19, 20, 21, 22, 23]
}

# Selected Topics:
# Reading: "Animals", "Food Items"
# Writing: "Simple Sentences", "Prepositions"
# Listening: "Audio Stories", "Following Instructions"
# Speaking: "Greetings", "Self Introduction"
```

**Verification:**
- [ ] 200 OK response
- [ ] Topics saved in `classroom_active_topics` table
- [ ] Background pre-generation triggered
- [ ] Cache invalidation triggered (new fix!)

**Database Check:**
```sql
SELECT topic_id FROM classroom_active_topics
WHERE classroom_id = '{classroom_id}';
-- Expected: [16, 17, 18, 19, 20, 21, 22, 23]
```

---

#### **Test 1.4: Verify Topics Saved**
```bash
# API Call
GET /api/v1/classroom/{classroom_id}/active-topics
Authorization: Bearer {teacher_token}

# Expected: Same 8 topics returned
```

**Verification:**
- [ ] Retrieved topics match saved topics
- [ ] Topics grouped by skill correctly
- [ ] Selection persisted

---

### **Phase 2: Student Mission Generation - ALL 4 PILLARS**

#### **Setup: Student Login**
```bash
# API Call
POST /api/v1/auth/student/login
{
  "class_code": "ABC123",
  "student_name": "Ahmad",
  "secret_pin": "1234"
}

# Expected: Student JWT token
```

**Verification:**
- [ ] Student authenticated
- [ ] classroom_id matches Grade 4 classroom
- [ ] Student JWT contains correct grade

---

#### **Test 2.1: READING Missions**
```bash
# API Call
GET /api/v1/missions/pillar?pillar=reading
Authorization: Bearer {student_token}

# Expected: 10 reading questions
```

**CRITICAL VALIDATIONS:**

**✅ Topic Alignment (Fix #2 - Topic Validation)**
- [ ] ALL questions reference "Animals" OR "Food Items"
- [ ] NO questions about other topics (Weather, Transportation, etc.)
- [ ] Semantic matching works (e.g., "cat" → Animals topic)

**Example Valid Questions:**
```
✅ "Which animal lives in water? 🐠"
✅ "The cat is on the table. True or False?"
✅ "What food do we eat for breakfast? 🍳"
✅ "Match the picture: 🐕 A) Dog B) Car C) House D) Book"
```

**Example INVALID Questions (should NOT appear):**
```
❌ "What is the weather today?" (not a selected topic)
❌ "How do you go to school?" (transportation - not selected)
❌ "What time is it?" (time - not selected)
```

**✅ Curriculum Grounding (Fix #4 - RAG Integration)**
- [ ] Vocabulary matches Grade 4 SNC curriculum
- [ ] No Grade 5 or Grade 3 words
- [ ] Questions use Pakistani context
- [ ] Urdu hints present and appropriate

**Check Logs:**
```
# Should see in backend logs:
"RAG retrieval for pillar missions: 5 chunks for reading grade 4"
"Using SNC curriculum context for question generation"
```

**✅ Task Types (Reading)**
- [ ] sentence_picture_match present
- [ ] odd_one_out present
- [ ] fill_blank_word_bank present
- [ ] passage_true_false present
- [ ] Mix of task types (not all identical)

**✅ Structure**
- [ ] Exactly 10 questions returned
- [ ] Each has: id, task_type, pillar="reading", question, difficulty, points_value=10, emoji_hint
- [ ] Options provided for MC questions (4 options: a, b, c, d)
- [ ] correct_answer included (for primary students)

**✅ Weakness Personalization (Fix #1 - if student has history)**
- [ ] If student has reading weaknesses, some questions target them
- [ ] weakness_focus_questions count > 0 for struggling students

---

#### **Test 2.2: WRITING Missions**
```bash
# API Call
GET /api/v1/missions/pillar?pillar=writing
Authorization: Bearer {student_token}
```

**CRITICAL VALIDATIONS:**

**✅ Topic Alignment**
- [ ] Questions about "Simple Sentences" OR "Prepositions"
- [ ] NO off-topic questions

**Example Valid:**
```
✅ "Arrange these words to make a sentence: [the, cat, is, big]"
✅ "Fill in the blank: The book is ___ the table. (on/in/under)"
✅ "Complete: I go ___ school. (to/at/in)"
```

**✅ Task Types (Writing)**
- [ ] sentence_scramble present
- [ ] missing_letter present
- [ ] guided_translation present
- [ ] Mix of task types

**✅ Curriculum & Grade Level**
- [ ] Grade 4 sentence complexity
- [ ] Urdu hints for bilingual support

---

#### **Test 2.3: LISTENING Missions**
```bash
# API Call
GET /api/v1/missions/pillar?pillar=listening
Authorization: Bearer {student_token}
```

**CRITICAL VALIDATIONS:**

**✅ Topic Alignment**
- [ ] Questions about "Audio Stories" OR "Following Instructions"
- [ ] NO off-topic questions

**Example Valid:**
```
✅ "Listen and choose: [audio_text: 'The dog is sleeping'] What is the dog doing?"
✅ "Simon says: Touch your head. Which body part? (with audio)"
✅ "Listen to the story and answer..." (audio_text provided)
```

**✅ Task Types (Listening)**
- [ ] listen_and_choose present
- [ ] simon_says present
- [ ] listen_and_spell present
- [ ] Audio_text field populated for audio questions

---

#### **Test 2.4: SPEAKING Missions**
```bash
# API Call
GET /api/v1/missions/pillar?pillar=speaking
Authorization: Bearer {student_token}
```

**CRITICAL VALIDATIONS:**

**✅ Topic Alignment**
- [ ] Questions about "Greetings" OR "Self Introduction"
- [ ] NO off-topic questions

**Example Valid:**
```
✅ "Repeat after me: Hello, my name is Ahmad."
✅ "What is this? 👋 (Hint: Say 'This is a hand')"
✅ "Finish the sentence: Good morning, I am..."
```

**✅ Task Types (Speaking)**
- [ ] repeat_after_me present
- [ ] what_is_this present
- [ ] finish_the_sentence present
- [ ] Prompts clear and short (primary students)

---

### **Phase 3: Mission Completion & Weakness Creation**

#### **Test 3.1: Create Intentional Weaknesses**

**Strategy:** Complete missions with specific performance patterns to test weakness detection

**Reading:** 3/10 correct (30% - WEAK)
```bash
# Submit 10 reading answers
POST /api/v1/missions/complete
{
  "question_correct": false,  # 7 times
  "pillar": "reading",
  "task_type": "sentence_picture_match",
  "points_value": 10
}

POST /api/v1/missions/complete
{
  "question_correct": true,  # 3 times
  "pillar": "reading",
  ...
}
```

**Expected:**
- [ ] 3 questions award 10 points each (30 total)
- [ ] 7 questions award 0 points
- [ ] Total points: +30
- [ ] 10 interactions logged in student_interactions
- [ ] pillar="reading", correct=true/false properly set

**Writing:** 8/10 correct (80% - STRONG)
```bash
# Submit 8 correct, 2 wrong
```

**Expected:**
- [ ] 80 points awarded
- [ ] Interactions logged

**Listening:** 5/10 correct (50% - MEDIUM)
```bash
# Submit 5 correct, 5 wrong
```

**Expected:**
- [ ] 50 points awarded

**Speaking:** 2/10 correct (20% - VERY WEAK)
```bash
# Submit 2 correct, 8 wrong
```

**Expected:**
- [ ] 20 points awarded
- [ ] Total cumulative: 30+80+50+20 = 180 points

---

#### **Test 3.2: Verify Interactions Logged**
```sql
SELECT pillar, correct, COUNT(*)
FROM student_interactions
WHERE student_id = '{student_id}'
GROUP BY pillar, correct;

-- Expected Results:
-- reading, false: 7
-- reading, true: 3
-- writing, false: 2
-- writing, true: 8
-- listening, false: 5
-- listening, true: 5
-- speaking, false: 8
-- speaking, true: 2
```

**Verification:**
- [ ] All 40 interactions logged (10 per pillar)
- [ ] Correct/incorrect properly recorded
- [ ] Pillar field populated
- [ ] Grade level stamped

---

#### **Test 3.3: Verify Weakness Detection (Fix #1)**
```bash
# API Call (internal - testing the fixed function)
# This is called automatically when requesting new missions

# Expected weakness analysis:
# - reading: 3/10 = 30% < 60% → WEAK
# - writing: 8/10 = 80% > 60% → STRONG
# - listening: 5/10 = 50% < 60% → WEAK
# - speaking: 2/10 = 20% < 60% → VERY WEAK
```

**Expected Weakness List:**
```python
[
  "speaking (accuracy: 20%)",
  "reading (accuracy: 30%)",
  "listening (accuracy: 50%)"
]
```

**Verification:**
- [ ] Weakness detection function returns correct pillars
- [ ] Only pillars with <60% accuracy included
- [ ] Writing NOT in weakness list (80% accuracy)
- [ ] Weaknesses sorted by severity

---

#### **Test 3.4: Request New Missions - Verify Personalization**
```bash
# Request new SPEAKING missions (student's weakest pillar)
GET /api/v1/missions/pillar?pillar=speaking
Authorization: Bearer {student_token}
```

**CRITICAL: Verify Personalization**
- [ ] `weakness_focus_questions` > 0 (e.g., 3-4 out of 10)
- [ ] Questions still aligned with selected topics
- [ ] Difficulty may be adjusted (easier for weak students)

**Check Logs:**
```
"Student weaknesses detected: ['speaking (accuracy: 20%)', 'reading (accuracy: 30%)']"
"Generating 10 speaking questions with weakness focus"
```

---

### **Phase 4: Teacher Reports - Student Level**

#### **Test 4.1: Fetch Student Report**
```bash
# API Call
GET /api/v1/evaluator/report/student/{student_id}/detailed
Authorization: Bearer {teacher_token}
```

**CRITICAL VALIDATIONS:**

**✅ Overall Stats**
- [ ] Total questions: 40
- [ ] Total correct: 18 (3+8+5+2)
- [ ] Overall accuracy: 45% (18/40)
- [ ] Total points: 180

**✅ Pillar Stats**
```json
{
  "pillar_stats": [
    {
      "pillar": "reading",
      "total_questions": 10,
      "correct_answers": 3,
      "accuracy_pct": 30
    },
    {
      "pillar": "writing",
      "total_questions": 10,
      "correct_answers": 8,
      "accuracy_pct": 80
    },
    {
      "pillar": "listening",
      "total_questions": 10,
      "correct_answers": 5,
      "accuracy_pct": 50
    },
    {
      "pillar": "speaking",
      "total_questions": 10,
      "correct_answers": 2,
      "accuracy_pct": 20
    }
  ]
}
```

**Verification:**
- [ ] All 4 pillars present
- [ ] Percentages calculated correctly
- [ ] Sorted by pillar name or accuracy

**✅ AI Insights**
```json
{
  "ai_insights": {
    "engagement_level": "active",
    "strengths": ["Writing skills are strong (80%)"],
    "areas_for_improvement": [
      "Speaking needs immediate attention (20%)",
      "Reading comprehension requires support (30%)"
    ],
    "recommended_topics": [
      "Basic speaking practice",
      "Reading comprehension strategies"
    ],
    "teacher_note": "Focus on speaking and reading. Student shows good writing ability."
  }
}
```

**Verification:**
- [ ] Strengths correctly identify writing (80%)
- [ ] Weaknesses identify speaking (20%) and reading (30%)
- [ ] Recommendations are actionable
- [ ] Tone is constructive

---

#### **Test 4.2: Verify Weak Topics Identification**

**Expected in Report:**
- [ ] Weak pillars: Speaking, Reading, Listening
- [ ] Strong pillars: Writing
- [ ] AI mentions specific weak areas

**NOT Expected:**
- [ ] Generic recommendations
- [ ] Incorrect percentages
- [ ] Missing pillar data

---

### **Phase 5: Teacher Reports - Grade Level**

#### **Test 5.1: Fetch Grade 4 Overview**
```bash
# API Call
GET /api/v1/evaluator/report/grade/4
Authorization: Bearer {teacher_token}
```

**Expected Response:**
```json
{
  "grade_level": 4,
  "total_students": 30,
  "total_interactions": 1200,
  "average_accuracy": 62.5,
  "pillar_breakdown": {
    "reading": {"avg_accuracy": 55.2, "total_attempts": 300},
    "writing": {"avg_accuracy": 68.5, "total_attempts": 300},
    "listening": {"avg_accuracy": 60.3, "total_attempts": 300},
    "speaking": {"avg_accuracy": 66.0, "total_attempts": 300}
  },
  "weak_students": [
    {"student_id": "...", "student_name": "Ahmad", "overall_accuracy": 45}
  ],
  "strong_students": [
    {"student_id": "...", "student_name": "Fatima", "overall_accuracy": 92}
  ]
}
```

**Verification:**
- [ ] Aggregate data for all Grade 4 students
- [ ] Pillar breakdown correct
- [ ] Weak students identified (<50% accuracy)
- [ ] Strong students identified (>75% accuracy)

---

#### **Test 5.2: Verify Class-Wide Patterns**

**Check:**
- [ ] Class-wide weak pillar: Reading (if most students struggle)
- [ ] Class-wide strong pillar: Writing (if most excel)
- [ ] Identification of struggling students
- [ ] Identification of top performers

---

### **Phase 6: AI Teaching Assistant Guidance**

#### **Test 6.1: Request Daily Teaching Plan**
```bash
# API Call
POST /api/v1/evaluator/teacher-assistant/daily-plan
Authorization: Bearer {teacher_token}
{
  "grade_level": 4
}
```

**Expected Response:**
```json
{
  "focus_areas": [
    "Speaking fluency and pronunciation",
    "Reading comprehension strategies",
    "Listening comprehension"
  ],
  "classroom_activities": [
    {
      "activity": "Pair speaking practice - greetings and introductions",
      "time_estimate": "15 minutes",
      "materials": "Speaking prompt cards"
    },
    {
      "activity": "Guided reading with comprehension questions",
      "time_estimate": "20 minutes",
      "materials": "Grade 4 SNC reading passages"
    }
  ],
  "student_groups": [
    {
      "group_name": "Struggling (Speaking & Reading)",
      "student_count": 8,
      "recommendation": "Small group intervention with teacher"
    },
    {
      "group_name": "On-Track",
      "student_count": 18,
      "recommendation": "Independent practice with peer support"
    },
    {
      "group_name": "Advanced",
      "student_count": 4,
      "recommendation": "Challenge activities and peer tutoring"
    }
  ],
  "snc_curriculum_references": [
    "SNC Grade 4 English - Speaking: Greetings and basic conversation",
    "SNC Grade 4 English - Reading: Comprehension of simple texts"
  ]
}
```

**CRITICAL VALIDATIONS:**

**✅ Considers Class Weaknesses**
- [ ] Focus areas include speaking (class weakest pillar)
- [ ] Focus areas include reading (class weak pillar)
- [ ] Activities target identified weaknesses

**✅ Groups Students by Performance**
- [ ] Struggling group: Low performers (<50%)
- [ ] On-track group: Medium performers (50-75%)
- [ ] Advanced group: High performers (>75%)
- [ ] Student counts accurate

**✅ Provides Actionable Suggestions**
- [ ] Specific activities (not generic "practice speaking")
- [ ] Time estimates realistic (15-30 min activities)
- [ ] Materials specified
- [ ] SNC curriculum aligned

**✅ References Curriculum**
- [ ] SNC Grade 4 topics mentioned
- [ ] Curriculum standards cited
- [ ] Learning outcomes referenced

---

### **Phase 7: Repeat for Grade 5**

#### **Test 7.1: Teacher Selects Different Topics (Grade 5)**
```bash
# Select Grade 5 topics (different from Grade 4)
PUT /api/v1/classroom/{grade5_classroom_id}/active-topics
{
  "topic_ids": [36, 37, 38, 39, 40, 41, 42, 43]
}

# Grade 5 Topics (more advanced):
# Reading: "Story Comprehension", "Vocabulary Building"
# Writing: "Paragraph Writing", "Descriptive Writing"
# Listening: "Complex Audio Stories", "Note Taking"
# Speaking: "Presentations", "Debates"
```

**Verification:**
- [ ] Topics saved for Grade 5 classroom
- [ ] Different from Grade 4 topics
- [ ] More advanced vocabulary/concepts

---

#### **Test 7.2: Grade 5 Student Gets Appropriate Missions**
```bash
# Grade 5 student logs in
GET /api/v1/missions/pillar?pillar=reading
Authorization: Bearer {grade5_student_token}
```

**CRITICAL: Cross-Grade Validation**
- [ ] Questions use Grade 5 vocabulary (more complex than Grade 4)
- [ ] Topics align with Grade 5 selections
- [ ] NO Grade 4 vocabulary appears
- [ ] SNC Grade 5 curriculum referenced

**Example Valid (Grade 5):**
```
✅ "Read the passage and identify the main idea..." (complex comprehension)
✅ "Analyze this story: What is the author's message?" (higher-order thinking)
✅ "Write a paragraph describing your favorite place..." (extended writing)
```

**Example INVALID for Grade 5:**
```
❌ "The cat is on the table." (too simple, Grade 4 level)
❌ "Match the picture: 🐕" (too basic for Grade 5)
```

---

#### **Test 7.3: Verify Grade 5 Reports**
```bash
GET /api/v1/evaluator/report/grade/5
```

**Verification:**
- [ ] Grade 5 data separate from Grade 4
- [ ] Grade-appropriate analysis
- [ ] No data mixing between grades

---

### **Phase 8: Cross-Cutting Validations**

#### **Test 8.1: Real-Time Topic Update (Fix #5)**
```bash
# Teacher changes topics at 10:00:00
PUT /api/v1/classroom/{classroom_id}/active-topics
{ "topic_ids": [50, 51, 52, 53] }  # New topics

# Student requests missions at 10:00:30 (30 seconds later)
GET /api/v1/missions/pillar?pillar=reading

# CRITICAL: Should get NEW topics, not old cached ones
```

**Verification:**
- [ ] Questions reference NEW topics (50, 51, 52, 53)
- [ ] NO questions about OLD topics (16, 17, 18, 19)
- [ ] Cache invalidation worked
- [ ] Response time still fast (<2s from pre-generation)

**Check Logs:**
```
"Cache invalidation: cleared 40 mission caches for classroom {id}"
"Pre-generation complete: 4 pillars generated"
```

---

#### **Test 8.2: Error Handling**

**Scenario: No Topics Selected**
```bash
# Teacher sends empty topic list
PUT /api/v1/classroom/{classroom_id}/active-topics
{ "topic_ids": [] }

# Student requests missions
GET /api/v1/missions/pillar?pillar=reading
```

**Expected:**
- [ ] System doesn't crash
- [ ] Falls back to "General English skills"
- [ ] OR returns all grade topics
- [ ] OR blocks missions with clear message

---

#### **Test 8.3: Topic Validation Rejection**

**Check Logs for:**
```
"Topic validation: 2 questions rejected for reading.
Topics: [Animals, Food].
Rejected: ['What is the weather today?', 'How do you go to school?']"
```

**Verification:**
- [ ] Off-topic questions logged and rejected
- [ ] Automatic retry attempted
- [ ] Final result still has 10 questions (all valid)

---

#### **Test 8.4: RAG Retrieval Success**

**Check Logs:**
```
"RAG retrieval for pillar missions: 5 chunks for reading grade 4"
"Using SNC curriculum context for question generation"
"LLM generation completed in 8.2s for reading grade 4"
```

**Verification:**
- [ ] RAG retrieval successful
- [ ] Curriculum context used
- [ ] Questions reference SNC content

---

## 🎯 **SUCCESS CRITERIA**

### **MUST PASS (Critical):**
- [ ] All teacher-selected topics appear in student missions ✓
- [ ] NO off-topic questions generated ✓
- [ ] Weakness detection works (Fix #1) ✓
- [ ] Topics validated (Fix #2) ✓
- [ ] Curriculum grounding works (Fix #4) ✓
- [ ] Cache invalidation works (Fix #5) ✓
- [ ] Reports show accurate data ✓
- [ ] AI assistant provides actionable guidance ✓
- [ ] All 4 pillars function correctly ✓
- [ ] Grade 4 and Grade 5 separate and appropriate ✓

### **SHOULD PASS (High Priority):**
- [ ] Response times acceptable (<5s first, <1s cached)
- [ ] Error messages clear and helpful
- [ ] Logs capture all key events
- [ ] Background tasks complete successfully

### **NICE TO HAVE:**
- [ ] Pre-generation 100% success rate
- [ ] Zero topic validation rejections
- [ ] RAG retrieval always successful

---

## 📊 **TEST RESULTS TEMPLATE**

```markdown
# Test Execution Results

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Local/Staging/Production]

## Summary
- Total Test Cases: 50+
- Passed: XX
- Failed: XX
- Blocked: XX
- Pass Rate: XX%

## Phase 1: Teacher Topic Selection
✅ Test 1.1: Login - PASS
✅ Test 1.2: Fetch Topics - PASS
✅ Test 1.3: Select Topics - PASS
✅ Test 1.4: Verify Saved - PASS

## Phase 2: Student Missions
✅ Test 2.1: Reading Missions - PASS
  - Topic alignment: PASS ✓
  - Curriculum grounding: PASS ✓
  - Task types: PASS ✓
✅ Test 2.2: Writing Missions - PASS
✅ Test 2.3: Listening Missions - PASS
✅ Test 2.4: Speaking Missions - PASS

## Phase 3: Weakness Tracking
✅ Test 3.1: Create Weaknesses - PASS
✅ Test 3.2: Verify Logging - PASS
✅ Test 3.3: Weakness Detection - PASS
✅ Test 3.4: Personalization - PASS

## Phase 4: Student Reports
✅ Test 4.1: Report Accuracy - PASS
✅ Test 4.2: Weak Topics - PASS

## Phase 5: Grade Reports
✅ Test 5.1: Grade Overview - PASS
✅ Test 5.2: Class Patterns - PASS

## Phase 6: AI Assistant
✅ Test 6.1: Daily Plan - PASS

## Phase 7: Grade 5
✅ Test 7.1-7.3: All Grade 5 Tests - PASS

## Phase 8: Edge Cases
✅ Test 8.1: Real-time Updates - PASS
✅ Test 8.2: Error Handling - PASS
✅ Test 8.3: Validation - PASS
✅ Test 8.4: RAG Success - PASS

## Critical Issues Found
[List any failures]

## Recommendations
[Any improvements needed]

## Sign-Off
✅ APPROVED FOR PRODUCTION
or
❌ NOT APPROVED - Fix issues above
```

---

## 🚀 **EXECUTION INSTRUCTIONS**

### **Option 1: Automated Testing (Backend Running)**
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Run automated test script
python test_complete_flow.py --grade 4 --grade 5 --verbose

# Check results
cat test_results.json
```

### **Option 2: Manual Testing (Step-by-Step)**
1. Start backend and frontend
2. Follow test cases in order
3. Use Postman/Insomnia for API calls
4. Document results in checklist above
5. Take screenshots of key validations
6. Generate final report

### **Option 3: Semi-Automated (Recommended)**
1. Use automated script for API calls
2. Manually verify UI and reports
3. Check logs for all critical events
4. Validate edge cases manually

---

## 📝 **NOTES**

- **Backend must be running** for live testing
- **Redis must be active** for caching tests
- **Database must have test data** (Grade 4 & 5 classrooms with students)
- **OpenAI API key must be valid** for mission generation
- **Logs should be set to DEBUG level** for comprehensive tracking

---

**This comprehensive test plan ensures every aspect of the teacher-student cycle is rigorously validated with all 5 critical fixes in place.**
