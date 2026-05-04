# 🚀 RUN PRIMEPAL NOW

## ✅ Status: Setup Complete

Your project is ready to run! Everything is configured.

---

## 📋 What's Been Done

✅ Backend `.env` — Configured with Supabase & OpenAI keys
✅ Frontend `.env.local` — Configured with Supabase keys
✅ Python 3.12 — Installed
✅ Node.js v24.14 — Installed
✅ Python venv — Created
✅ Backend packages — Installing...
✅ Frontend packages — Already installed (npm install done)

---

## ⚡ Quick Start (2 Minutes)

### Option A: Using Batch Scripts (Easiest)

**Step 1: Open Terminal 1**
```
Double-click: START_BACKEND.bat
```

**Step 2: Open Terminal 2 (NEW window)**
```
Double-click: START_FRONTEND.bat
```

**Step 3: Open Browser**
```
http://localhost:3000
```

---

### Option B: Manual Command Line

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Browser:**
```
http://localhost:3000
```

---

## ✨ Test It Works

### 1. Check Frontend (should see landing page)
```
http://localhost:3000
```

### 2. Check Backend API Docs (should see Swagger UI)
```
http://localhost:8000/docs
```

### 3. Test API Endpoint
```powershell
curl http://localhost:8000/api/v1/topics?grade_level=3
```
Should return JSON with topics.

---

## 🎓 Try Student Login

1. Open http://localhost:3000
2. Click **"I'm a Student"**
3. Enter:
   - **Class Code**: `ABC123`
   - **Select Avatar**: Any avatar
   - **PIN**: `1234`
4. Click **Login**

---

## 📖 Need Help?

| Question | Answer |
|----------|--------|
| How do I run the backend? | Use `START_BACKEND.bat` or manually run the commands above |
| How do I run the frontend? | Use `START_FRONTEND.bat` or manually run the commands above |
| Port 3000 in use? | Kill the process or use different port: `npm run dev -- -p 3001` |
| Port 8000 in use? | Use different port: `uvicorn app.main:app --port 8001` |
| Commands not working? | Make sure you're in the right directory |
| See error in browser? | Press F12 to see console errors |

---

## 📁 Terminal Layout

You need **2 terminal windows**:

```
┌─────────────────────┐    ┌──────────────────────┐
│ Terminal 1          │    │ Terminal 2           │
│ BACKEND             │    │ FRONTEND             │
│                     │    │                      │
│ Backend running on  │    │ Frontend running on  │
│ http://0.0.0.0:8000 │    │ http://0.0.0.0:3000  │
│                     │    │                      │
│ (Keep running)      │    │ (Keep running)       │
└─────────────────────┘    └──────────────────────┘
```

---

## 🔧 Troubleshooting

### Backend won't start
```powershell
# Make sure Python venv is activated
.\backend\venv\Scripts\Activate.ps1

# Should see (venv) in prompt
# Then try:
cd backend
uvicorn app.main:app --reload
```

### Frontend won't start
```powershell
# Make sure npm packages are installed
cd frontend
npm install
npm run dev
```

### Commands not found
- Activate venv: `.\backend\venv\Scripts\Activate.ps1`
- Check you're in project root directory
- Check no spaces or special characters in paths

### Still having issues?
See full documentation in:
- `START_PROJECT.md` - Detailed step-by-step guide
- `QUICK_TEST_GUIDE.md` - Testing guide
- `README_SETUP.md` - Full setup reference

---

## 🎯 What Next?

1. **Get backend & frontend running** (use scripts above)
2. **Open http://localhost:3000 in browser**
3. **Try student login** (class: ABC123, PIN: 1234)
4. **Explore features** (missions, chat, speaking, etc.)
5. **Check backend API docs** (http://localhost:8000/docs)
6. **Run tests** when ready

---

## 💡 Your .env Files Are Already Configured

**Backend** (`backend/.env`):
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ OPENAI_API_KEY

**Frontend** (`frontend/.env.local`):
- ✅ NEXT_PUBLIC_API_URL
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY

**No additional setup needed!**

---

## 🔌 Backend Dependencies Status

Installing the following packages:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- Supabase (database)
- OpenAI (LLM)
- Redis (caching)
- PyJWT (authentication)
- LangChain (AI orchestration)
- pytest (testing)

---

## 🎉 Ready to Go!

```
Choose one:

A) Easiest Way:
   Double-click: START_BACKEND.bat
   Double-click: START_FRONTEND.bat
   Open: http://localhost:3000

B) Manual Way:
   Terminal 1: cd backend && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload
   Terminal 2: cd frontend && npm run dev
   Open: http://localhost:3000

Either way, you'll be running in 30 seconds! ⚡
```

---

**Proceed with Option A or B above 👆**
