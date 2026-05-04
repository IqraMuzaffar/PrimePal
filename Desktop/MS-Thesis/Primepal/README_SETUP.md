# PrimePal Setup & Run Guide

**Complete instructions for setting up and running PrimePal on Windows.**

---

## 📋 What You'll Need

### System Requirements
- **Windows 10/11**
- **Python 3.12+** ✓ (You have this)
- **Node.js 18+** ✓ (You have this)
- **Docker Desktop** (optional but recommended for Redis)
- **Supabase Account** (free tier at https://supabase.com)
- **OpenAI API Key** (paid at https://platform.openai.com)

### Installed on Your System
✓ Python 3.12.6
✓ Node.js v24.14.1
✓ npm 10.8.1
✓ Git
❓ Docker (needed for Redis cache)

---

## 🚀 GETTING STARTED — 3 Simple Steps

### Step 1️⃣: Run Automated Setup (5 minutes)

```powershell
# Open PowerShell
# Navigate to project folder
cd "C:\Users\Iqra Muzaffar\Desktop\MS-Thesis\Primepal"

# Run setup
.\SETUP.ps1
```

**This will automatically:**
- ✅ Check all dependencies
- ✅ Create Python virtual environment
- ✅ Install backend packages
- ✅ Install frontend packages
- ✅ Create `.env` template files
- ✅ Show what's been installed

### Step 2️⃣: Configure Credentials (5 minutes)

Edit two files with your credentials:

**File 1: `backend\.env`**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-proj-...
STUDENT_JWT_SECRET=random-secret-key-here
SECRET_KEY=another-secret-key
```

**File 2: `frontend\.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Get these from:**
- **Supabase**: https://app.supabase.com → Project → API
- **OpenAI**: https://platform.openai.com → API Keys

### Step 3️⃣: Start Services (3 terminals)

**Terminal 1 — Backend API:**
```powershell
.\backend\venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload
# Output: INFO: Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
# Output: - ready started server on 0.0.0.0:3000
```

**Terminal 3 (Optional) — Redis Cache:**
```powershell
docker-compose up -d
# Output: Creating redis ... done
```

---

## ✅ Verify It Works

### Check 1: Frontend
Open browser: **http://localhost:3000**
You should see PrimePal landing page with login options.

### Check 2: Backend API
Open browser: **http://localhost:8000/docs**
You should see Swagger UI with all API endpoints.

### Check 3: API Test
```powershell
curl http://localhost:8000/api/v1/topics?grade_level=3
# Should return JSON with topics
```

---

## 📚 Documentation Files Created For You

| File | Purpose |
|------|---------|
| **QUICK_START.txt** | 1-page quick reference (keep this open!) |
| **START_PROJECT.md** | Detailed step-by-step guide (READ THIS) |
| **SETUP.ps1** | Automated setup script (RUN THIS FIRST) |
| **COMPREHENSIVE_TEST_PLAN.md** | 100+ test cases for all features |
| **QUICK_TEST_GUIDE.md** | Testing guide with checklists |
| **RUN_TESTS.bat** | Windows test runner script |

---

## 🎯 Quick Reference Commands

### Activate Backend Environment
```powershell
.\backend\venv\Scripts\Activate.ps1
```

### Run Backend
```powershell
cd backend
uvicorn app.main:app --reload
```

### Run Frontend
```powershell
cd frontend
npm run dev
```

### Run Tests
```powershell
cd backend
pytest -v
```

### Check API is Working
```powershell
curl http://localhost:8000/api/v1/topics?grade_level=3
```

### Check Frontend is Working
```powershell
curl http://localhost:3000
```

---

## 🔧 Dependency Summary

### Backend Dependencies (Installed by SETUP.ps1)
```
✓ FastAPI 0.111.0        - Web framework
✓ Uvicorn 0.29.0         - ASGI server
✓ Supabase 2.4.6         - Database client
✓ OpenAI 1.58.1          - LLM API
✓ LangChain 0.3.25       - AI orchestration
✓ Redis 5.0.1            - Caching
✓ PyJWT 2.8.0            - Token generation
✓ pytest 8.2.1           - Testing framework
```

### Frontend Dependencies (Installed by SETUP.ps1)
```
✓ Next.js 14.2           - React framework
✓ React 18              - UI library
✓ Tailwind CSS 3.4      - Styling
✓ Supabase JS 2.43      - Database client
✓ Framer Motion 12.38   - Animations
```

---

## 🧪 Testing

### Run All Tests
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pytest -v
```

### Run Specific Tests
```powershell
pytest tests/test_auth.py -v
pytest tests/test_missions.py -v
pytest tests/test_chat.py -v
```

### Generate Coverage Report
```powershell
pytest --cov=app --cov-report=html
# Opens: backend/htmlcov/index.html
```

### Use Test Runner Script
```powershell
RUN_TESTS.bat auth          # Auth tests
RUN_TESTS.bat missions      # Mission tests
RUN_TESTS.bat all           # All tests
RUN_TESTS.bat coverage      # Coverage report
```

---

## 📱 Test the Application

### Student Flow
1. Open **http://localhost:3000**
2. Click "I'm a Student"
3. Class code: `ABC123` (or create new)
4. Select avatar
5. PIN: `1234`
6. Try missions, speaking, spelling, etc.

### Teacher Flow
1. Open **http://localhost:3000**
2. Click "I'm a Teacher"
3. Login with Supabase email/password
4. Create classroom
5. Add students
6. Upload curriculum PDF
7. View analytics

---

## 🛑 Stopping Services

When you're done:

```powershell
# Terminal 1 (Backend)
Ctrl + C

# Terminal 2 (Frontend)
Ctrl + C

# Terminal 3 (Redis) - if running
docker-compose down
```

---

## 🆘 Troubleshooting

### "Port 3000 in use"
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID>
```

### "Port 8000 in use"
```powershell
# Use different port
uvicorn app.main:app --port 8001
```

### "Module not found"
```powershell
# Rerun setup
.\SETUP.ps1

# Or manually install
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### "Connection refused"
- Check Terminal 1 is running with backend
- Check Terminal 2 is running with frontend
- Check no errors in terminal output

### "Blank page in browser"
- Press F12 to see console
- Check .env files have correct URLs
- Check backend is responding: http://localhost:8000/docs

---

## 🗂️ File Locations

```
Your Project/
├── backend/
│   ├── venv/                    ← Virtual environment (auto-created)
│   ├── app/main.py             ← Server entry point
│   ├── requirements.txt         ← Dependencies list
│   ├── .env                     ← EDIT THIS with your keys
│   └── tests/                   ← Test files
│
├── frontend/
│   ├── app/page.tsx            ← Landing page
│   ├── app/student/            ← Student routes
│   ├── app/teacher/            ← Teacher routes
│   ├── package.json            ← Dependencies list
│   ├── .env.local              ← EDIT THIS with your keys
│   └── node_modules/           ← npm packages (auto-created)
│
├── SETUP.ps1                   ← RUN THIS FIRST
├── START_PROJECT.md            ← READ THIS
├── QUICK_START.txt             ← QUICK REFERENCE
└── docker-compose.yml          ← Redis config
```

---

## ⚡ The Quickest Way to Get Running

**Copy & paste these commands in order:**

**PowerShell Terminal:**
```powershell
# Setup (one-time)
.\SETUP.ps1

# Edit your credentials in backend\.env and frontend\.env.local

# Terminal 1 - Backend
.\backend\venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend (NEW WINDOW)
cd frontend
npm run dev

# Open browser
start http://localhost:3000
```

---

## 📖 Next: Detailed Instructions

For step-by-step detailed guide, see: **START_PROJECT.md**

For quick reference, see: **QUICK_START.txt**

For testing, see: **QUICK_TEST_GUIDE.md**

For all test cases, see: **COMPREHENSIVE_TEST_PLAN.md**

---

## ✨ You're Ready!

```
✓ All dependencies installed
✓ Backend ready at http://localhost:8000
✓ Frontend ready at http://localhost:3000
✓ API docs at http://localhost:8000/docs

Start exploring! 🚀
```

---

**Questions?** Check the relevant documentation file or see the troubleshooting section above.

**Happy coding! 🎉**
