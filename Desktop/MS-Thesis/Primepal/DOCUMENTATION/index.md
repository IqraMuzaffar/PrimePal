# PrimePal Documentation

PrimePal is an AI-powered ESL education platform for Pakistani primary school students. It addresses the "Mute English" phenomenon by combining a gamified student-facing app with a teacher-facing analytics dashboard, built around three AI agents (Curriculum Guardrail, Tutor, Evaluator).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Backend | Python 3.12, FastAPI 0.111.0, Uvicorn |
| Database & Auth | Supabase (PostgreSQL + GoTrue auth + pgvector) |
| LLM | OpenAI gpt-4o-mini (chat), text-embedding-3-small (RAG) |
| Speech-to-Text | OpenAI Whisper (whisper-1) |
| Cache | Redis 7 |
| Containerization | Docker Compose |

## Three-Agent Architecture

- **Agent A (Curriculum Guardrail)** — Ingests SNC textbooks, chunks + embeds into pgvector. Ensures AI stays within approved vocabulary.
- **Agent B (Tutor)** — Student-facing. Generates missions, stories, spelling bees, speaking prompts. Powers the bilingual chatbot.
- **Agent C (Evaluator)** — Silently logs interactions, produces analytics and teacher-facing insight reports.

## Documentation Map

| Section | Description |
|---------|-------------|
| [Architecture](architecture/index.md) | System design, auth flows, data flow diagrams |
| [Backend](backend/index.md) | FastAPI app structure, endpoints, agents, core modules |
| [Frontend](frontend/index.md) | Next.js pages, components, libraries, routing |
| [Database](database/index.md) | Supabase tables, migrations, RLS policies, pgvector |
| [API Reference](api-reference/index.md) | Complete endpoint listing with request/response shapes |
| [Deployment](deployment/index.md) | Docker, environment variables, production checklist |

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env  # fill in Supabase + OpenAI keys
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
cp .env.local.example .env.local  # fill in API URL + Supabase keys
npm install
npm run dev

# Or via Docker
docker-compose up
```

## Repository Structure

```
Primepal/
├── frontend/           → Next.js 14 App Router
├── backend/            → FastAPI + AI agents
├── supabase/           → Migrations + edge functions
├── DOCUMENTATION/      → This documentation (you are here)
├── TICKETS/            → Pre-ship audit tracking
├── docker-compose.yml  → Redis + backend orchestration
└── AI_CONTEXT.md       → AI assistant context file
```

## User Roles

| Role | Auth Method | Interface |
|------|-------------|-----------|
| Teacher | Supabase GoTrue (email/password) | Web dashboard at `/teacher/*` |
| Student | Custom PyJWT (class code + avatar + PIN) | Mobile-friendly app at `/student/*` |
| Admin | Supabase GoTrue + invite code | Admin panel at `/admin/*` |
