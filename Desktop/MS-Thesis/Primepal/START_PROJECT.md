# START PRIMEPAL — Step-by-Step Guide

Complete instructions to run the entire PrimePal project on Windows.

---

## ✅ Step 0: Initial Setup (One-Time)

Run this once to install all dependencies:

```powershell
# Open PowerShell in project root
# Right-click → Open PowerShell window here

# Run setup script
.\SETUP.ps1

# This will:
# ✓ Check Python, Node, Docker versions
# ✓ Create Python virtual environment
# ✓ Install backend dependencies (pip install -r requirements.txt)
# ✓ Install frontend dependencies (npm install)
# ✓ Create .env files with templates
# ✓ Show a summary of what was installed
```

**Expected output:**
```
✓ Python found: Python 3.12.6
✓ Node.js found: v24.14.1
✓ Virtual environment activated
✓ Python dependencies installed
✓ npm dependencies installed

SETUP COMPLETE ✓
```

---

## 🚀 Running the Project

You need **3 separate terminal windows** for:
1. **Backend API Server** (FastAPI)
2. **Frontend Dev Server** (Next.js)
3. **Redis Cache** (Docker) — Optional but recommended

---

## PART 1: Start Redis Cache (Optional)

### Option A: Using Docker (Recommended)
```powershell
# Terminal 0 (Optional)
docker-compose up -d

# Expected output:
# Creating redis ... done
# redis is up-to-date
```

### Option B: Skip Redis
If you don't have Docker, the app will still work but some features will be slower.

---

## PART 2: Start Backend API

### Terminal 1 — Backend Server

```powershell
# Make sure you're in project root
cd C:\Users\Iqra Muzaffar\Desktop\MS-Thesis\Primepal

# Activate Python virtual environment
.\backend\venv\Scripts\Activate.ps1

# You should see (venv) in your prompt:
# (venv) PS C:\Users\Iqra Muzaffar\Desktop\MS-Thesis\Primepal>

# Navigate to backend and run server
cd backend
uvicorn app.main:app --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Keep this terminal open!** The backend server is now running at:
- **http://localhost:8000** (API root)
- **http://localhost:8000/api/v1** (API v1)
- **http://localhost:8000/docs** (Interactive API documentation)

### Verify Backend is Running
In a NEW terminal:
```powershell
# Test API endpoint
curl http://localhost:8000/api/v1/topics?grade_level=3

# Should return JSON with topics:
# [{"id":"...","name":"Nouns","grade_level":3}, ...]
```

---

## PART 3: Start Frontend

### Terminal 2 — Frontend Dev Server

```powershell
# Open a NEW terminal (don't close Terminal 1)
# Navigate to project root
cd C:\Users\Iqra Muzaffar\Desktop\MS-Thesis\Primepal

# Navigate to frontend
cd frontend

# Start development server
npm run dev
```

**Expected output:**
```
> next dev
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**Keep this terminal open!** The frontend is now running at:
- **http://localhost:3000** (Main app)

---

## ✨ Verify Everything Works

### Test 1: Check Frontend
Open browser: **http://localhost:3000**

You should see:
- PrimePal logo
- Landing page with three login options
- "I'm a Student" button
- "I'm a Teacher" button
- "I'm an Admin" button

### Test 2: Check Backend API
```powershell
# In any terminal
curl http://localhost:8000/api/v1/topics?grade_level=3

# Should return JSON topics (not an error)
```

### Test 3: Check API Documentation
Open browser: **http://localhost:8000/docs**

You should see Swagger UI with all API endpoints listed.

---

## 🧪 Test Student Login

1. Open **http://localhost:3000**
2. Click **"I'm a Student"**
3. Enter:
   - Class Code: `ABC123` (or create a real classroom first as teacher)
   - Select an avatar
   - PIN: `1234`
4. Click **Login**
5. You should see the student dashboard

### What if it fails?
- ❌ "Connection refused" → Backend not running (check Terminal 1)
- ❌ "Invalid credentials" → Class code doesn't exist (need to create as teacher first)
- ❌ "Blank page" → Check browser console (F12)

---

## 🏫 Test Teacher Features

1. Open **http://localhost:3000**
2. Click **"I'm a Teacher"**
3. Use your Supabase credentials:
   - Email: (must be in Supabase auth)
   - Password: (from Supabase)
4. You should see teacher dashboard

### Create a Test Classroom (as Teacher)
1. Click **"Create Classroom"**
2. Name: "Grade 3-A"
3. Grade: 3
4. Copy the class code (e.g., ABC123)
5. Add students with this code

---

## 📊 View API Documentation

While backend is running, open:
**http://localhost:8000/docs**

This shows:
- All endpoints with full documentation
- Request/response schemas
- Try endpoints directly in the browser
- Test without writing code

---

## 🛑 Stopping Services

### Stop Frontend
- Terminal 2: Press `Ctrl + C`

### Stop Backend
- Terminal 1: Press `Ctrl + C`

### Stop Redis
```powershell
docker-compose down
```

---

## 🔧 Development Workflow

### Making Code Changes

**Backend Changes:**
1. Edit file in `backend/app/`
2. Uvicorn automatically reloads (watch Terminal 1)
3. Test via http://localhost:8000/docs or curl

**Frontend Changes:**
1. Edit file in `frontend/app/` or `frontend/components/`
2. Next.js automatically reloads (watch Terminal 2)
3. Refresh browser to see changes

### Running Tests

```powershell
# Terminal 3 (new terminal)
cd backend
.\venv\Scripts\Activate.ps1

# Run all tests
pytest -v

# Run specific test
pytest tests/test_auth.py -v

# Run with coverage
pytest --cov=app --cov-report=html
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | Kill process: `netstat -ano \| findstr :3000` then `taskkill /PID xxxx` |
| Port 8000 already in use | Run on different port: `uvicorn app.main:app --port 8001` |
| `ModuleNotFoundError: No module named 'app'` | Make sure you're in `backend/` directory before running uvicorn |
| Virtual environment not activating | Use full path: `C:\path\to\venv\Scripts\Activate.ps1` |
| `Cannot find module 'next'` | Run `npm install` in `frontend/` directory |
| `.env` file shows as template | Edit it with your actual Supabase & OpenAI keys |
| Backend returns 401 errors | Check that .env has valid SUPABASE_ANON_KEY |
| Frontend blank page | Check browser console (F12) for errors |

---

## 📁 Project Structure During Development

```
Your Project Root/
├── backend/
│   ├── venv/                    ← Virtual environment (auto-created)
│   ├── app/
│   │   ├── main.py             ← Entry point
│   │   ├── api/v1/endpoints/   ← API routes
│   │   ├── agents/             ← AI agents
│   │   └── core/               ← Config, security, DB
│   ├── tests/                  ← Tests
│   ├── .env                    ← Environment variables (YOU CREATE)
│   └── requirements.txt        ← Dependencies list
│
├── frontend/
│   ├── node_modules/           ← npm packages (auto-created)
│   ├── app/
│   │   ├── page.tsx            ← Landing page
│   │   ├── student/            ← Student routes
│   │   ├── teacher/            ← Teacher routes
│   │   └── admin/              ← Admin routes
│   ├── components/             ← Reusable UI
│   ├── .env.local              ← Environment variables (YOU CREATE)
│   └── package.json            ← Dependencies list
│
├── SETUP.ps1                   ← Run this first (one-time setup)
├── START_PROJECT.md            ← This file
├── QUICK_TEST_GUIDE.md         ← Testing guide
└── docker-compose.yml          ← Redis configuration
```

---

## 🔑 Environment Variables Checklist

### Backend: `backend\.env`
```
✓ SUPABASE_URL
✓ SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ OPENAI_API_KEY
✓ STUDENT_JWT_SECRET
✓ SECRET_KEY
```

### Frontend: `frontend\.env.local`
```
✓ NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Get these keys from:**
- **Supabase**: https://app.supabase.com → Project Settings → API
- **OpenAI**: https://platform.openai.com → API Keys

---

## 🧪 Quick Tests

### Test 1: Backend is up
```powershell
curl http://localhost:8000/api/v1/topics?grade_level=3
```

### Test 2: Frontend is up
```powershell
curl http://localhost:3000
```

### Test 3: Run backend tests
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pytest tests/test_auth.py -v
```

---

## 📖 Documentation

For more details, see:
- **Full Setup**: `QUICK_TEST_GUIDE.md`
- **API Docs**: `DOCUMENTATION/api-reference/index.md`
- **Architecture**: `DOCUMENTATION/architecture/index.md`
- **Testing**: `COMPREHENSIVE_TEST_PLAN.md`
- **Deployment**: `DOCUMENTATION/deployment/index.md`

---

## ✨ You're Ready!

```
Terminal 1: Backend running at http://localhost:8000
Terminal 2: Frontend running at http://localhost:3000

Open http://localhost:3000 and start exploring! 🚀
```

---

## 🆘 Still Having Issues?

1. **Check logs in Terminal 1 & 2** — they show detailed errors
2. **Run SETUP.ps1 again** — might have missed a dependency
3. **Read error message carefully** — usually tells you what's wrong
4. **See QUICK_TEST_GUIDE.md** → Troubleshooting section
5. **Check DOCUMENTATION/** → detailed guides for each component

**Happy coding! 🎉**
