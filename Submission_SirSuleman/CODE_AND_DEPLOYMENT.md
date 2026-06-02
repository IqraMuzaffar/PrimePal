# PrimePal — Code Repository & Deployment Guide

## GitHub Repository

**URL:** https://github.com/IqraMuzaffar/PrimePal

The repository contains the complete source code for both the frontend and backend.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI + Uvicorn | 0.111.0 |
| LLM | OpenAI SDK + LangChain | 1.58.1 / 0.3.25 |
| Embeddings | text-embedding-3-small | — |
| Database | Supabase (PostgreSQL + pgvector) | 2.4.6 |
| Caching | Redis | 5.0.1 |
| Frontend | Next.js 14 + React 18 | 14.2.35 |
| Styling | Tailwind CSS + Framer Motion | 3.4.1 / 12.38.0 |
| Auth (Students) | PyJWT | 2.8.0 |
| Auth (Teachers) | Supabase GoTrue | — |
| Speech-to-Text | OpenAI Whisper | — |
| Deployment | Docker Compose | 3.8 |

## External Libraries

### Backend (Python — see `backend/requirements.txt`)
- fastapi, uvicorn — REST API framework
- openai — GPT-4o-mini for chat, missions, insight reports
- langchain, langchain-openai — LLM orchestration and structured output
- supabase — Database client (PostgreSQL + pgvector)
- redis — Caching layer (tiered TTL)
- pyjwt — Custom student authentication (HS256)
- pydantic — Data validation and schema enforcement

### Frontend (JavaScript — see `frontend/package.json`)
- next (14.x) — React framework with App Router
- react (18.x), react-dom — UI library
- @tanstack/react-query — Server state management
- tailwindcss — Utility-first CSS
- framer-motion — Animations (gamification effects)
- @supabase/supabase-js — Teacher auth and real-time subscriptions

## Step-by-Step Deployment Guide

### Prerequisites
- Docker and Docker Compose installed
- OpenAI API key
- Supabase project (free tier works)
- Redis instance (included in Docker Compose)

### 1. Clone the Repository
```bash
git clone https://github.com/IqraMuzaffar/PrimePal.git
cd PrimePal
```

### 2. Environment Variables

Create `backend/.env`:
```env
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Deploy with Docker Compose
```bash
docker-compose up -d
```
This starts three services:
- **Redis** (port 6379) — caching
- **Backend** (port 8000) — FastAPI server
- **Frontend** (port 3000) — Next.js app

### 4. Manual Deployment (Without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 5. Database Setup
- Create a Supabase project
- Enable the pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- Run the migrations in `backend/migrations/` (001 through 025) in order
- Upload SNC textbook PDFs through the admin panel to populate the vector store

### 6. Access the Application
- **Student Portal:** http://localhost:3000 (class code + avatar + PIN login)
- **Teacher Dashboard:** http://localhost:3000/teacher (email + password login)
- **Admin Panel:** http://localhost:3000/admin (promoted teacher account)

## Architecture Overview

PrimePal uses a three-agent Multi-Agent System:
- **Agent A (Knowledge Curator)** — RAG pipeline, grade-filtered curriculum retrieval
- **Agent B (Instructor)** — Mission generation, bilingual chatbot, Confidence Builder
- **Agent C (Analyst)** — Async logging, NLP insight reports, teacher recommendations

All agents share a Supabase PostgreSQL database and communicate via shared tables.

## Questions?

Contact: Iqra Muzaffar — iqra.muzaffar@lums.edu.pk
