# PrimePal — Quick Test Guide

Fast reference for running comprehensive tests.

---

## 🚀 Start Here (5 minutes)

### 1. Setup Backend Environment
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
pip install pytest pytest-asyncio httpx
```

### 2. Start Backend Server
```bash
# Terminal 1 - Backend server
cd backend
uvicorn app.main:app --reload
# Runs at http://localhost:8000/api/v1
```

### 3. Start Frontend Dev Server
```bash
# Terminal 2 - Frontend server
cd frontend
npm run dev
# Runs at http://localhost:3000
```

### 4. Quick Smoke Test
```bash
# Terminal 3
cd backend
pytest tests/test_auth.py -v
```

**Expected Output:**
```
tests/test_auth.py::test_teacher_login_valid PASSED
tests/test_auth.py::test_student_login_valid PASSED
...
============ 5 passed in 2.34s ============
```

---

## 📊 Running Tests

### Backend - All Tests
```bash
cd backend
pytest -v
```

### Backend - Specific Feature
```bash
# Authentication tests
pytest tests/test_auth.py -v

# Classroom management tests
pytest tests/test_classroom.py -v

# Mission tests
pytest tests/test_missions.py tests/test_pillar_missions.py -v

# Topics tests
pytest tests/test_topics.py -v

# Chat tests
pytest tests/test_chat.py -v

# Interactions logging tests
pytest tests/test_interactions.py -v

# Analytics tests
pytest tests/test_evaluator.py -v

# Curriculum ingestion tests
pytest tests/test_ingestion.py -v
```

### Backend - Full Journey Tests
```bash
cd backend
pytest tests/test_full_journey.py -v -s
```

This runs:
- ✅ Teacher setup journey (create classroom → add students → upload PDF)
- ✅ Student learning path (login → missions → speaking → spelling → rewards)
- ✅ Teacher analytics (view reports, create announcements)
- ✅ Curriculum workflow (get topics → update active → generate missions)
- ✅ Error handling (wrong PIN, no auth, invalid fields)

### Backend - With Coverage
```bash
cd backend
pytest --cov=app --cov-report=html
# Opens: htmlcov/index.html
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Frontend - Lint Check
```bash
cd frontend
npm run lint
```

### Frontend - Build Check
```bash
cd frontend
npm run build
```

---

## 🧪 API Smoke Tests

Test endpoints directly without full test suite:

```bash
# GET topics
curl http://localhost:8000/api/v1/topics?grade_level=3

# Expected response:
# [
#   {"id": "...", "name": "Nouns", "grade_level": 3},
#   ...
# ]
```

---

## ✅ Test Checklists

### Authentication Feature
- [ ] Teacher login with email/password
- [ ] Student login with class code + PIN
- [ ] Admin login + promote teacher to admin
- [ ] Invalid credentials rejected
- [ ] Expired tokens rejected
- [ ] Avatar listing works

**Run:** `pytest tests/test_auth.py -v`

### Classroom Management
- [ ] Create classroom (teacher)
- [ ] Add students to classroom
- [ ] Get student roster
- [ ] Update classroom details
- [ ] Delete classroom (cascade)
- [ ] Get/update active topics

**Run:** `pytest tests/test_classroom.py tests/test_topics.py -v`

### Curriculum (Agent A)
- [ ] Upload PDF file
- [ ] PDF processed into chunks
- [ ] Chunks embedded with pgvector
- [ ] Retrieve chunks via RAG search
- [ ] Upload history tracked

**Run:** `pytest tests/test_ingestion.py tests/test_knowledge_base.py -v`

### Missions (Agent B)
- [ ] Generate daily mission (3 questions)
- [ ] Generate pillar mission (10 questions)
- [ ] Submit mission answers
- [ ] Get scoring + feedback
- [ ] Points awarded to student
- [ ] Interaction logged
- [ ] Can't submit twice same day

**Run:** `pytest tests/test_missions.py tests/test_pillar_missions.py -v`

### Student Features
- [ ] Speaking: Get prompt, submit audio/text, get feedback
- [ ] Spelling Bee: Get word, submit answer, get score
- [ ] Story Time: Generate story, answer comprehension
- [ ] Chat: Send message (EN/UR), get RAG response
- [ ] Rewards: Claim daily chest, points increase
- [ ] Leaderboard: See classroom ranking

**Run:** `pytest tests/test_chat.py -v`

### Analytics (Agent C)
- [ ] Interactions logged after each activity
- [ ] Student report available
- [ ] Classroom analytics available
- [ ] Pillar breakdown shows progress

**Run:** `pytest tests/test_evaluator.py tests/test_interactions.py -v`

---

## 🎯 Manual Testing (No Code Required)

### Test Student Flow (10 minutes)

1. **Open Frontend**
   ```
   http://localhost:3000
   ```

2. **Student Login**
   - Click "I'm a Student"
   - Enter class code: `ABC123`
   - Select avatar
   - Enter PIN: `1234`
   - ✅ Should see dashboard

3. **Complete Daily Mission**
   - Click "Missions" tab
   - Click "Start Daily Mission"
   - See 3 questions
   - Select answers
   - Click "Submit"
   - ✅ Should see score + feedback

4. **Check Points**
   - See points increased on dashboard
   - ✅ Points from mission added

5. **Try Spelling**
   - Go to "Spelling Bee"
   - Click "Play Word"
   - Type the word you heard
   - Click "Check"
   - ✅ Should see correct/incorrect

6. **Claim Daily Reward**
   - Click chest icon
   - Click "Open"
   - ✅ Points added

---

### Test Teacher Flow (10 minutes)

1. **Teacher Login**
   ```
   http://localhost:3000/teacher/login
   ```
   - Email: `teacher@example.com`
   - Password: `SecurePass123`

2. **Create Classroom**
   - Dashboard → Create Classroom
   - Name: "Grade 3-A"
   - Grade: 3
   - ✅ Get class code

3. **Add Students**
   - Click classroom
   - "Add Student" button
   - Name: "Ali Ahmed"
   - ✅ Get PIN (e.g., 1234)

4. **Upload Curriculum**
   - Go to "Curriculum" → "Upload"
   - Select PDF file
   - Grade: 3
   - ✅ See "Processing..."
   - Wait 1-2 min for completion

5. **View Analytics**
   - Dashboard → Analytics
   - Select classroom
   - ✅ See student progress

---

## 📈 Performance Baseline

Test response times (use online tools or curl):

```bash
# Measure individual endpoint
time curl http://localhost:8000/api/v1/topics?grade_level=3

# Expected:
# < 200ms
```

| Endpoint | Target | Tool |
|----------|--------|------|
| GET /topics | < 200ms | curl -w "@time.txt" |
| GET /classroom/{id} | < 500ms | curl |
| POST /missions/daily | < 3s | curl (includes LLM) |
| POST /missions/daily/submit | < 5s | curl |

---

## 🐛 Debugging Failed Tests

### Test Fails with "Connection refused"
```
ERROR: Cannot connect to Supabase
```
**Solution:**
1. Check SUPABASE_URL, SUPABASE_ANON_KEY in backend/.env
2. Verify Supabase project is running
3. Run: `pytest -s -v` to see full output

### Test Fails with "Missing OPENAI_API_KEY"
```
ERROR: OPENAI_API_KEY not set
```
**Solution:**
1. Add to backend/.env: `OPENAI_API_KEY=sk-...`
2. Get key from https://platform.openai.com/api-keys

### Mock Objects Not Working
```
ERROR: MagicMock has no attribute 'table'
```
**Solution:**
- Check conftest.py fixtures
- Verify mock chain: `mock.table().select().eq().maybe_single().execute()`
- See example in test_full_journey.py

### Tests Pass Locally but Fail in CI
**Causes:**
- Environment variables not set in CI
- Database state different in CI
- Race conditions from parallel test execution

**Solution:**
```bash
# Run serially
pytest -v -n0

# Run with verbose logging
pytest -v -s

# Run one test at a time
pytest tests/test_auth.py::test_teacher_login_valid -v
```

---

## 📋 Test Execution Plan

### Day 1: Foundation (30 minutes)
```bash
# 1. Setup (5 min)
cd backend && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt

# 2. Run auth tests (5 min)
pytest tests/test_auth.py -v

# 3. Run classroom tests (5 min)
pytest tests/test_classroom.py -v

# 4. Run curriculum tests (5 min)
pytest tests/test_ingestion.py -v

# 5. Check coverage (5 min)
pytest --cov=app --cov-report=term-missing | head -20
```

### Day 2: Student Features (45 minutes)
```bash
# 1. Missions (15 min)
pytest tests/test_missions.py tests/test_pillar_missions.py -v

# 2. Interactive features (15 min)
pytest tests/test_chat.py -v

# 3. Analytics (15 min)
pytest tests/test_evaluator.py tests/test_interactions.py -v
```

### Day 3: Integration & E2E (60 minutes)
```bash
# 1. Full journeys (30 min)
pytest tests/test_full_journey.py -v -s

# 2. Manual testing (20 min)
# - Login as student → complete mission
# - Login as teacher → view analytics

# 3. API smoke test (10 min)
curl http://localhost:8000/api/v1/topics?grade_level=3
```

---

## 📊 Coverage Goals

Aim for **80%+ code coverage**:

```bash
cd backend
pytest --cov=app --cov-report=html
# Open: htmlcov/index.html
```

**Target by module:**
- `app/core/security.py` — 100% (auth is critical)
- `app/api/v1/endpoints/*` — 90%+ (main logic)
- `app/agents/*` — 85%+ (LLM interactions harder to mock)
- `app/utils/*` — 75%+ (utility functions)

---

## 🔗 Test Data

Most tests use **mocked Supabase** to avoid external dependencies.

For **integration tests** with real database:

```bash
# Create test data
cd backend
python -c "
from tests.data_generator import *
# See tests/data_generator.py for helper functions
"
```

---

## 🚨 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'app'` | Run from `backend/` directory |
| `asyncio.TimeoutError` | Increase timeout: `@pytest.mark.asyncio(timeout=30)` |
| `Connection refused` | Start backend: `uvicorn app.main:app --reload` |
| `Invalid token` | Use test token from conftest.py |
| `JWT decode error` | Check STUDENT_JWT_SECRET in .env |
| Tests hang indefinitely | Kill backend, restart: `pkill -f uvicorn` |

---

## 📞 Getting Help

1. **See test output details:**
   ```bash
   pytest test_file.py -v -s
   ```

2. **Debug with pdb:**
   ```bash
   pytest test_file.py -v -s --pdb
   ```

3. **Check docs:**
   - CLAUDE.md (project architecture)
   - DOCUMENTATION/ (full API docs)
   - Test file headers (what each test does)

4. **Review git history:**
   ```bash
   git log --oneline backend/tests/
   ```

---

## ✨ Best Practices

1. **Run tests before committing:**
   ```bash
   pytest -v && npm test
   ```

2. **Test in isolation:**
   ```bash
   pytest tests/test_auth.py::test_teacher_login_valid -v
   ```

3. **Check coverage often:**
   ```bash
   pytest --cov=app --cov-report=term-missing
   ```

4. **Keep tests fast (< 10s):**
   - Use mocks for external APIs
   - Don't make real OpenAI calls in tests
   - Use in-memory DB fixtures

5. **Document test intent:**
   ```python
   def test_student_cannot_submit_twice_same_day():
       """Verify mission can only be submitted once per day."""
       # Test code...
   ```

---

**Happy Testing! 🎉**
