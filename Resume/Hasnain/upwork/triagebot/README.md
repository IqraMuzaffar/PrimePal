# TriageBot

AI-powered patient triage system for clinics. Patients describe symptoms via WhatsApp or web chat. AI collects symptoms, scores severity (green/yellow/red), recommends a department, and pushes a summary to a receptionist dashboard for human confirmation.

## Quick Start

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys (Anthropic, Twilio)
docker-compose up -d
```

- Backend: http://localhost:8000
- Dashboard: http://localhost:3000
- Health check: http://localhost:8000/health

## Login

- Username: `receptionist` / Password: `triage123`
- Username: `admin` / Password: `admin123`

## Architecture

Patient (WhatsApp/Web) → FastAPI → Claude AI (triage tools) → PostgreSQL → Receptionist Dashboard (Next.js)

## Tech Stack

FastAPI, Claude API (Anthropic), ChromaDB, PostgreSQL 15, Redis, Twilio, Next.js 14, Tailwind CSS, Docker Compose

## Safety

- AI never diagnoses — only triages and recommends departments
- Emergency keywords trigger immediate alerts
- All conversations logged for audit compliance
- Human receptionist always confirms before booking
