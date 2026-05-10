# Comprehensive QA Test Plan - PrimePal Production Readiness

**Date:** 2026-05-06
**Objective:** Rigorously test complete teacher-student flow for production deployment to schools

---

## Test Scope

### Complete Flow to Test:
1. **Teacher Side:** Select classroom (Grade 4/5) → Select topics from all 4 pillars → Save
2. **Student Side:** Login → Get missions for all 4 pillars (based on topics + weaknesses) → Complete missions → See scores/stars
3. **Reporting:** Teacher views student report → AI assistant helps identify weaknesses
4. **Performance:** Measure latency, throughput, identify bottlenecks
5. **Related Flows:** Chat, Spelling Bee, Story Time, Speaking Practice
6. **Production Readiness:** Security, error handling, edge cases

---

## Test Environment Setup

### Prerequisites:
- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Redis running and accessible
- [ ] Supabase database accessible
- [ ] OpenAI API key valid and funded

### Test Data Required:
- [ ] Teacher account (admin role)
- [ ] Grade 4 classroom with 3 test students
- [ ] Grade 5 classroom with 3 test students
- [ ] Curriculum data loaded for both grades
- [ ] SNC topics seeded in database

---

## Test Cases

### 1. TEACHER TOPIC SELECTION FLOW

#### 1.1 Grade 4 Topic Selection
**Priority:** CRITICAL
**Prerequisites:** Teacher logged in, Grade 4 classroom exists

**Steps:**
1. Navigate to classroom management
2. Select Grade 4 classroom
3. Click "Select Topics" or equivalent
4. Fetch available topics: `GET /api/v1/topics/?grade_level=4`
5. Verify all 4 pillars (Reading, Writing, Listening, Speaking) have topics
6. Select 2-3 topics from EACH pillar (8-12 total)
7. Save selections: `PUT /api/v1/classroom/{classroom_id}/active-topics`
8. Verify topics saved: `GET /api/v1/classroom/{classroom_id}/active-topics`

**Expected Results:**
- [ ] All 4 pillars have topics available
- [ ] Topics can be selected from multiple pillars
- [ ] Save operation succeeds (200 OK)
- [ ] Retrieved topics match saved selections
- [ ] Response time < 1s for fetch, < 2s for save

**Potential Issues to Check:**
- [ ] What if teacher selects 0 topics?
- [ ] What if only 1 pillar selected?
- [ ] Can teacher change selections later?
- [ ] Are old missions invalidated when topics change?

#### 1.2 Grade 5 Topic Selection
**Priority:** CRITICAL
**Steps:** Same as 1.1 but for Grade 5

---

### 2. STUDENT MISSION GENERATION FLOW

#### 2.1 Grade 4 - Reading Missions
**Priority:** CRITICAL
**Prerequisites:** Teacher has selected topics for Grade 4, student logged in

**Steps:**
1. Student logs in: `POST /api/v1/auth/student/login`
2. Request Reading missions: `GET /api/v1/missions/pillar?pillar=reading`
3. Verify response contains 10 questions
4. Check each question has required fields: `id`, `task_type`, `pillar`, `question`, `difficulty`, `options`
5. Verify `active_topics_summary` contains teacher-selected topics
6. Check `weakness_focus_questions` count (shows how many target weaknesses)

**Expected Results:**
- [ ] Returns exactly 10 questions
- [ ] All questions are pillar="reading"
- [ ] Questions reference teacher-selected topics
- [ ] If student has weaknesses, some questions target them
- [ ] No `correct_answer` field in response (security)
- [ ] Response time < 5s (LLM generation)
- [ ] Cached for subsequent requests (< 1s)

**Potential Issues to Check:**
- [ ] What if no topics selected? (Should fallback to all grade topics)
- [ ] What if student has no weaknesses? (General questions)
- [ ] What if LLM timeout? (60s timeout set, check error handling)
- [ ] Cache invalidation when topics change?

#### 2.2 Grade 4 - Writing Missions
**Priority:** CRITICAL
**Steps:** Same as 2.1 but for `pillar=writing`

#### 2.3 Grade 4 - Listening Missions
**Priority:** CRITICAL
**Steps:** Same as 2.1 but for `pillar=listening`

#### 2.4 Grade 4 - Speaking Missions
**Priority:** CRITICAL
**Steps:** Same as 2.1 but for `pillar=speaking`

#### 2.5 Grade 5 - All 4 Pillars
**Priority:** CRITICAL
**Steps:** Repeat 2.1-2.4 for Grade 5 student

---

### 3. MISSION COMPLETION & SCORING

#### 3.1 Grade 4 - Correct Answers
**Priority:** CRITICAL
**Prerequisites:** Student has missions

**Steps:**
1. Get current points: `GET /api/v1/missions/me`
2. Submit 5 correct answers: `POST /api/v1/missions/complete`
   ```json
   {
     "question_correct": true,
     "task_type": "multiple_choice",
     "pillar": "reading",
     "points_value": 10
   }
   ```
3. Verify each response:
   - `points_awarded` = 10
   - `new_total` increases by 10
   - `current_streak` updates
4. Check final points: `GET /api/v1/missions/me`

**Expected Results:**
- [ ] Each correct answer awards 10 points
- [ ] Total points = previous + (5 × 10)
- [ ] Points persist in database
- [ ] Interactions logged in `student_interactions` table
- [ ] Response time < 500ms per submission

**Potential Issues to Check:**
- [ ] Race conditions with concurrent submissions?
- [ ] Idempotency - duplicate submissions detected?
- [ ] Points rollback if interaction logging fails?

#### 3.2 Grade 4 - Incorrect Answers
**Priority:** CRITICAL

**Steps:**
1. Submit 3 incorrect answers with `question_correct: false`
2. Verify `points_awarded` = 0
3. Check interactions logged with `correct: false`

**Expected Results:**
- [ ] Incorrect answers award 0 points
- [ ] Still logged in `student_interactions` (for weakness tracking)
- [ ] Student can see which answers were wrong

#### 3.3 Grade 5 - Mission Completion
**Priority:** CRITICAL
**Steps:** Repeat 3.1-3.2 for Grade 5 student

---

### 4. WEAKNESS TRACKING & PERSONALIZATION

#### 4.1 Create Student Weaknesses
**Priority:** HIGH
**Prerequisites:** Grade 4 student has completed some missions

**Steps:**
1. Submit 5 incorrect answers for "reading" pillar
2. Submit 5 incorrect answers for "writing" pillar
3. Wait for cache invalidation (or force it)
4. Request new missions: `GET /api/v1/missions/pillar?pillar=reading`
5. Check response for `weakness_focus_questions` > 0

**Expected Results:**
- [ ] System detects student weaknesses from `student_interactions`
- [ ] Next missions include questions targeting weak areas
- [ ] `weakness_focus_questions` count indicates personalization

**Potential Issues to Check:**
- [ ] How many incorrect answers needed to trigger weakness?
- [ ] Does system look at last N interactions or all time?
- [ ] Are weaknesses pillar-specific or topic-specific?

#### 4.2 Verify Performance Profile
**Priority:** HIGH

**Steps:**
1. Check `GET /api/v1/missions/performance`
2. Verify response shows:
   - `overall_accuracy`: percentage
   - `pillar_accuracy`: per-pillar breakdown
   - `weak_topics`: list of struggling areas
   - `strong_topics`: list of mastered areas

**Expected Results:**
- [ ] Accuracy calculated correctly from interactions
- [ ] Weak topics match areas with low scores
- [ ] Data used to personalize future missions

---

### 5. TEACHER REPORTING & AI ASSISTANT

#### 5.1 Grade 4 Student Report
**Priority:** CRITICAL
**Prerequisites:** Student has completed missions with mix of correct/incorrect

**Steps:**
1. Teacher navigates to student report page
2. Click on specific Grade 4 student
3. Request: `GET /api/v1/evaluator/report/student/{student_id}/detailed`
4. Verify response contains:
   - `student_id`
   - `pillar_stats`: accuracy per pillar
   - `ai_insights`: LLM-generated insights
   - `weaknesses`: identified weak areas
   - `strengths`: identified strong areas
   - `recommendations`: actionable suggestions

**Expected Results:**
- [ ] Report loads successfully
- [ ] Pillar stats match actual performance
- [ ] AI insights are specific and actionable
- [ ] Weaknesses align with student_interactions data
- [ ] Teacher can understand where student struggles
- [ ] Response time < 10s (includes LLM call)

**Potential Issues to Check:**
- [ ] What if student has 0 interactions?
- [ ] Generic vs. specific insights quality?
- [ ] Does report show recent vs. all-time data?
- [ ] Can filter by date range or pillar?

#### 5.2 AI Teaching Assistant
**Priority:** HIGH

**Steps:**
1. Check if endpoint exists: `POST /api/v1/evaluator/teacher-assistant/daily-plan`
2. Request daily plan for a student
3. Verify AI provides:
   - Focus areas for today
   - Recommended topics
   - Teaching strategies

**Expected Results:**
- [ ] AI provides actionable teaching suggestions
- [ ] Suggestions based on student data
- [ ] Teacher can use insights to help student

#### 5.3 Grade 5 Student Report
**Priority:** CRITICAL
**Steps:** Repeat 5.1 for Grade 5 student

---

### 6. RELATED FLOWS INTEGRATION

#### 6.1 Chat with RAG
**Priority:** HIGH

**Steps:**
1. Student asks question: `POST /api/v1/chat`
2. Verify response uses grade-filtered curriculum
3. Check interaction logged
4. Verify points NOT awarded for chat

#### 6.2 Spelling Bee
**Priority:** HIGH

**Steps:**
1. Get words: `GET /api/v1/spelling-bee/words`
2. Submit attempt: `POST /api/v1/spelling-bee/submit`
3. Verify points awarded correctly (10 for 1st attempt, 5 for 2nd, 0 for wrong)
4. Check interaction logged

#### 6.3 Story Time
**Priority:** HIGH

**Steps:**
1. Get story: `GET /api/v1/story-time/story`
2. Answer comprehension questions: `POST /api/v1/story-time/answer`
3. Verify points awarded
4. Check interaction logged with pillar="reading"

#### 6.4 Speaking Practice
**Priority:** HIGH

**Steps:**
1. Get prompts: `GET /api/v1/speaking/prompts`
2. Submit audio: `POST /api/v1/speaking/evaluate-pro`
3. Verify Whisper transcription
4. Check pronunciation scoring
5. Verify points awarded based on accuracy
6. Check interaction logged with pillar="speaking"

---

### 7. PERFORMANCE & LATENCY TESTING

#### 7.1 Endpoint Response Times
**Priority:** CRITICAL

**Metrics to Measure:**
- [ ] GET /topics (fetch topics): < 500ms
- [ ] PUT /classroom/active-topics (save topics): < 1s
- [ ] GET /missions/pillar (generate missions): < 5s first time, < 1s cached
- [ ] POST /missions/complete (submit answer): < 500ms
- [ ] GET /evaluator/report/student/{id}/detailed (report): < 10s
- [ ] POST /chat (RAG chat): < 3s
- [ ] POST /speaking/evaluate-pro (Whisper): < 8s

**Performance Issues to Check:**
- [ ] Database query optimization (N+1 queries?)
- [ ] Redis cache hit rate
- [ ] LLM call parallelization
- [ ] Concurrent request handling

#### 7.2 Throughput Testing
**Priority:** HIGH

**Steps:**
1. Simulate 10 students requesting missions simultaneously
2. Simulate 20 mission submissions/second
3. Monitor server CPU, memory, response times

**Expected Results:**
- [ ] No request failures under normal load
- [ ] Response times don't degrade significantly
- [ ] Cache prevents redundant LLM calls

#### 7.3 Cache Effectiveness
**Priority:** HIGH

**Steps:**
1. Request pillar missions (cache miss - slow)
2. Request same missions again (cache hit - fast)
3. Teacher changes topics
4. Request missions again (cache invalidated, regenerates)

**Expected Results:**
- [ ] Cache hit < 1s
- [ ] Cache miss < 5s
- [ ] Cache invalidation works correctly

---

### 8. EDGE CASES & ERROR HANDLING

#### 8.1 No Topics Selected
**Priority:** HIGH

**Steps:**
1. Create classroom without selecting topics
2. Student requests missions
3. Check if system falls back to all grade topics

**Expected Results:**
- [ ] System doesn't crash
- [ ] Generates missions using all available topics
- [ ] Clear messaging to teacher to select topics

#### 8.2 Student with No Interactions
**Priority:** MEDIUM

**Steps:**
1. New student (0 interactions)
2. Request missions
3. Check if system handles gracefully

**Expected Results:**
- [ ] No errors
- [ ] Generates generic (non-personalized) missions
- [ ] Report shows "No data yet" or similar

#### 8.3 Duplicate Submission Detection
**Priority:** HIGH

**Steps:**
1. Submit same answer with same `submitted_at` timestamp
2. Submit within 60s window
3. Verify idempotency check prevents double-scoring

**Expected Results:**
- [ ] Duplicate detected
- [ ] Points NOT awarded twice
- [ ] Returns previous response

#### 8.4 Invalid Inputs
**Priority:** HIGH

**Test Cases:**
- [ ] Invalid pillar name ("invalid")
- [ ] Invalid grade_level (0, 7, -1)
- [ ] Malformed JSON
- [ ] Missing required fields
- [ ] SQL injection attempts ('; DROP TABLE --)
- [ ] XSS attempts (<script>alert('xss')</script>)

**Expected Results:**
- [ ] 400 Bad Request with clear error message
- [ ] No server crash
- [ ] No data corruption
- [ ] Input sanitized properly

#### 8.5 Unauthorized Access
**Priority:** CRITICAL

**Test Cases:**
- [ ] Student tries to access teacher endpoints
- [ ] Teacher tries to access other teacher's classrooms
- [ ] Expired JWT token
- [ ] Missing Authorization header

**Expected Results:**
- [ ] 401 Unauthorized for expired/missing tokens
- [ ] 403 Forbidden for access violations
- [ ] No data leakage

#### 8.6 LLM Timeout/Failure
**Priority:** HIGH

**Steps:**
1. Simulate OpenAI API timeout
2. Check error handling
3. Verify graceful fallback or retry

**Expected Results:**
- [ ] 503 Service Unavailable with helpful message
- [ ] Doesn't crash other requests
- [ ] Logged for monitoring

---

### 9. PRODUCTION READINESS CHECKLIST

#### 9.1 Security
- [ ] All endpoints have proper authentication
- [ ] RLS policies enforced on database
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CORS configured correctly
- [ ] Secrets not exposed in logs/errors
- [ ] Rate limiting configured

#### 9.2 Data Integrity
- [ ] Points calculation accurate
- [ ] No race conditions in concurrent requests
- [ ] Transactions used where needed
- [ ] Foreign key constraints enforced
- [ ] Data validation at DB level

#### 9.3 Error Handling
- [ ] All errors return proper HTTP status codes
- [ ] Error messages user-friendly (no stack traces to client)
- [ ] Errors logged server-side for debugging
- [ ] Background tasks don't fail silently

#### 9.4 Monitoring & Logging
- [ ] Critical operations logged
- [ ] Performance metrics tracked
- [ ] Error rates monitored
- [ ] LLM usage tracked (cost management)

#### 9.5 Scalability
- [ ] Database indexes on frequently queried columns
- [ ] Redis caching reduces DB load
- [ ] LLM responses cached
- [ ] Can handle 100+ concurrent students

#### 9.6 Data Privacy
- [ ] Student PINs never exposed in logs
- [ ] Student data isolated by classroom
- [ ] Teachers can only see their students
- [ ] Admins have proper audit logging

---

## Test Execution

### Recommended Order:
1. **Setup** - Verify environment, create test data
2. **Teacher Flow** - Test topic selection (Grade 4 & 5 in parallel)
3. **Student Flow** - Test missions (all 4 pillars for both grades)
4. **Completion Flow** - Test scoring and weakness tracking
5. **Reporting Flow** - Test teacher dashboard and AI insights
6. **Related Flows** - Test chat, spelling, story, speaking
7. **Performance** - Measure latency, throughput
8. **Edge Cases** - Test error scenarios
9. **Production Audit** - Final security and reliability checks

### Parallel Testing Strategy:
- Use 2 parallel agents: one for Grade 4, one for Grade 5
- Test all 4 pillars simultaneously per grade
- Run performance tests while functional tests execute
- Monitor system resources during load testing

---

## Success Criteria

### Must Pass (CRITICAL):
- [ ] All teacher-selected topics appear in student missions
- [ ] Student weaknesses correctly identified and targeted
- [ ] Points awarded accurately for correct/incorrect answers
- [ ] Teacher reports show accurate student performance
- [ ] AI insights help teachers understand weaknesses
- [ ] All 4 pillars work correctly for both grades
- [ ] No security vulnerabilities
- [ ] No data corruption or loss

### Should Pass (HIGH):
- [ ] Response times meet targets
- [ ] Cache working effectively
- [ ] Error handling graceful
- [ ] Related flows integrate properly

### Nice to Have (MEDIUM):
- [ ] Advanced personalization working
- [ ] Performance optimizations in place
- [ ] Comprehensive error logging

---

## Issues Tracking Template

```markdown
### Issue #X: [Brief Description]

**Severity:** Critical / High / Medium / Low
**Component:** Teacher Flow / Student Missions / Reporting / Performance
**Test Case:** [Test case number/name]

**Description:**
[Detailed description of the issue]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Impact:**
[How this affects production use]

**Recommended Fix:**
[Suggested solution]

**Priority:** P0 (blocker) / P1 (critical) / P2 (important) / P3 (nice-to-have)
```

---

## Test Report Template

```markdown
# QA Test Report - PrimePal Production Readiness
**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Backend version, Frontend version, DB state]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Warnings: W

## Critical Findings
[List all critical issues]

## Performance Metrics
- Average mission generation latency: Xms
- Average completion latency: Xms
- Average report generation latency: Xms
- Cache hit rate: X%

## Production Readiness Verdict
[ ] Ready for Production
[ ] Ready with Minor Fixes
[ ] Not Ready - Critical Issues Found

## Recommendations
[List recommendations for improvements]
```

---

## Next Steps After Testing

1. **Fix Critical Issues** - Address all P0/P1 bugs
2. **Optimize Performance** - Address slow endpoints
3. **Load Testing** - Test with realistic school load (50-100 students)
4. **UAT** - User acceptance testing with real teachers/students
5. **Staging Deployment** - Deploy to staging environment
6. **Final Verification** - Re-run this test plan on staging
7. **Production Deployment** - Go live!

---

**Remember:** This is going to schools. Bugs affect children's learning. Test rigorously! 🎓
