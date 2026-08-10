# TriageBot — AI Patient Triage WhatsApp + Web Chatbot

## Overview

TriageBot is a deployable AI patient triage system for clinics. Patients describe symptoms via WhatsApp or web chat. The AI collects symptoms, scores severity (green/yellow/red), recommends a department, and pushes a structured triage summary to a receptionist dashboard. A human always confirms before any appointment is booked.

**Goal:** Deployable MVP that a real clinic can use. Also fills Hasnain's portfolio gap — a front-facing health chatbot that African healthtech companies can see working in 30 seconds.

**Build approach:** Fork WhatsBot Pro, swap AI engine to Claude with medical tools, add DocMind RAG for clinical guidelines, add triage-specific logic, build receptionist dashboard.

## Architecture

```
Patient (WhatsApp / Web Chat)
    -> Twilio Webhook / WebSocket
    -> FastAPI Backend
        -> Session Manager (Redis)
        -> Triage Engine (Claude API + 5 Tools)
            |-- collect_symptoms()
            |-- score_severity()
            |-- lookup_guidelines()
            |-- recommend_department()
            |-- escalate_to_human()
        -> PostgreSQL (patients, sessions, messages, audit)
    -> Receptionist Dashboard (Next.js)
        |-- Triage Queue (severity-sorted)
        |-- Patient Chat History
        |-- Confirm / Reassign / Reject
        |-- Analytics
```

## Channels

- **WhatsApp** via Twilio API (forked from WhatsBot Pro)
- **Web chat** via WebSocket + React widget (embeddable on clinic website)
- **Language:** English only at launch

## Triage Engine

### AI Model

Claude API (Anthropic SDK) with tool-use. Forked from CareBot's `ai_engine.py` + `tools.py` pattern.

### 5 Tools

| Tool | Input | Output | Reused From |
|------|-------|--------|-------------|
| `collect_symptoms` | raw patient message | structured JSON: body_part, duration, intensity (1-10), associated_symptoms | New |
| `score_severity` | symptoms JSON | severity level: GREEN (routine/self-care), YELLOW (appointment within 24-48hrs), RED (urgent/same-day) | New |
| `lookup_guidelines` | symptoms + severity | relevant clinical guideline excerpts from ChromaDB with citations | DocMind hybrid search |
| `recommend_department` | symptoms + severity + guidelines | department name + reasoning string | New |
| `escalate_to_human` | full triage summary object | pushes to receptionist queue, triggers alert for RED cases | WhatsBot escalation pattern |

### Conversation Flow

Maximum 5 turns per triage session:

1. **Patient describes complaint** — "I have chest pain and shortness of breath"
2. **Claude extracts symptoms** — calls `collect_symptoms`, asks 1-2 clarifying questions (location, duration, intensity)
3. **Patient clarifies** — "It started 2 hours ago, intensity 7/10, also feeling dizzy"
4. **Claude triages** — calls `score_severity` (RED), `lookup_guidelines` (chest pain protocol), `recommend_department` (Cardiology)
5. **Claude responds to patient** — "Based on your symptoms, I recommend you see Cardiology urgently. A receptionist will confirm your appointment shortly."
6. **Triage summary pushed to dashboard** — via `escalate_to_human`

If symptoms are unclear after 5 turns, auto-escalate to human with whatever information was collected.

### Safety Guardrails

These are non-negotiable and enforced at the code level (not just in prompts):

1. **Never diagnose** — AI only triages and recommends a department. System prompt hard-codes: "You are a triage assistant. You do NOT diagnose conditions. You collect symptoms and recommend which department the patient should visit."
2. **Emergency keywords trigger immediate action** — if patient message contains: chest pain + breathing difficulty, unconscious, severe bleeding, seizure, stroke symptoms, suicidal ideation → AI immediately sends "Please call emergency services at [local emergency number]" AND pushes RED alert to receptionist dashboard. No further questions.
3. **RED severity = immediate alert** — not just added to queue. Receptionist gets a push notification / audio alert.
4. **Max 5 turns** — prevents AI from going in circles. After 5 turns, escalate with partial summary.
5. **Full audit trail** — every tool call (input + output) logged to `audit_log` table with timestamp and session ID. Required for healthcare compliance.
6. **No personal health advice** — AI does not recommend medications, dosages, home remedies, or treatment plans. Only: "see [department]" or "call emergency services."

## RAG: Clinical Guidelines

Forked from DocMind's hybrid search pipeline:

- **Storage:** ChromaDB with sentence-transformer embeddings
- **Search:** Hybrid (vector similarity + BM25 keyword) + cross-encoder re-ranker (ms-marco-MiniLM)
- **Content:** Pre-loaded with WHO clinical guidelines, common symptom-to-department mapping, triage protocols (e.g., Manchester Triage System simplified)
- **Citations:** Every RAG lookup returns source document + page number. Stored in audit log.
- **Ingestion:** Admin can upload PDF/DOCX clinical guidelines via dashboard. DocMind's ingestion pipeline handles chunking + embedding.

## Database Schema

```sql
-- Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage Sessions
CREATE TABLE triage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('whatsapp', 'web')),
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'awaiting_review', 'confirmed', 'rejected', 'emergency')),
    severity VARCHAR(10) CHECK (severity IN ('green', 'yellow', 'red')),
    department VARCHAR(50),
    ai_summary TEXT,
    receptionist_notes TEXT,
    reviewed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES triage_sessions(id),
    role VARCHAR(15) NOT NULL CHECK (role IN ('patient', 'ai', 'receptionist', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES triage_sessions(id),
    action VARCHAR(50) NOT NULL,
    tool_used VARCHAR(50),
    input JSONB,
    output JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT
);
```

Connection: asyncpg pool (CareBot pattern). No ORM.

## Receptionist Dashboard

Next.js 14 + Tailwind + shadcn/ui (same stack as WhatsBot Pro dashboard).

### Pages

**1. Triage Queue** (main page)
- Live list of triaged patients, sorted: RED first, then YELLOW, then GREEN
- Each card shows:
  - Patient name + phone
  - Severity badge (color-coded)
  - Recommended department
  - AI summary (3-4 lines)
  - Time waiting (e.g., "3 min ago")
  - Channel icon (WhatsApp / Web)
- Actions per card:
  - **Confirm** — accepts AI recommendation, triggers confirmation message to patient on WhatsApp/web
  - **Reassign** — change department (dropdown), then confirm
  - **Reject** — with required reason text, notifies patient to visit clinic in person
- Real-time updates via polling every 5 seconds (upgrade to SSE later if needed)

**2. Chat History**
- Click any patient card to expand full conversation
- Shows: patient messages, AI responses, tool calls (collapsible), timestamps
- Receptionist can add a note (saved to `triage_sessions.receptionist_notes`)

**3. Analytics**
- Daily/weekly/monthly toggle
- Metrics: total triage volume, severity breakdown (pie chart), avg triage time (symptom collection to AI summary), avg wait-to-confirm (AI summary to receptionist action), top 5 departments by volume
- Built with recharts (same as WhatsBot dashboard)

### Auth

Simple JWT auth for receptionist/admin login. Hardcoded users in MVP (no registration flow). Forked from CareBot's auth pattern.

## Web Chat Widget

- Lightweight React component (embeddable via `<script>` tag on any clinic website)
- WebSocket connection to FastAPI backend
- Simple chat UI: message bubbles, typing indicator, severity result display
- Same triage engine as WhatsApp — just different transport layer
- Session tracked by browser fingerprint + optional phone number input

## Tech Stack

| Layer | Technology | Reused From |
|-------|-----------|-------------|
| WhatsApp | Twilio API | WhatsBot Pro (`twilio_client.py`) |
| Web Chat | WebSocket + React widget | New (small) |
| Backend | FastAPI + Python 3.12 | WhatsBot Pro (project structure) |
| AI Engine | Claude API (Anthropic SDK) + tool-use | CareBot (`ai_engine.py`, `tools.py`) |
| RAG | ChromaDB + BM25 + cross-encoder re-ranker | DocMind (`hybrid_search.py`) |
| Database | PostgreSQL + asyncpg | CareBot (pool pattern) |
| Cache/Queue | Redis (conversation state + message queue) | WhatsBot Pro |
| Dashboard | Next.js 14 + Tailwind + shadcn/ui + recharts | WhatsBot Pro (dashboard) |
| Deployment | Docker Compose | All projects |

## Project Structure

```
triagebot/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + lifespan
│   │   ├── config.py                  # env vars
│   │   ├── routes/
│   │   │   ├── webhook.py             # Twilio WhatsApp webhook
│   │   │   ├── websocket.py           # Web chat WebSocket
│   │   │   ├── dashboard.py           # Receptionist API (queue, actions)
│   │   │   ├── analytics.py           # Analytics endpoints
│   │   │   └── auth.py                # JWT login
│   │   ├── services/
│   │   │   ├── twilio_client.py       # Twilio send/receive (from WhatsBot)
│   │   │   ├── triage_engine.py       # Claude + tools orchestration
│   │   │   ├── tools.py               # 5 triage tools
│   │   │   ├── rag.py                 # Clinical guidelines RAG (from DocMind)
│   │   │   ├── session_manager.py     # Redis session state
│   │   │   └── audit.py               # Audit logging
│   │   ├── db/
│   │   │   ├── pool.py                # asyncpg pool (from CareBot)
│   │   │   └── queries.py             # SQL queries
│   │   └── models/
│   │       └── schemas.py             # Pydantic models
│   ├── migrations/                    # SQL migration files
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                           # Next.js 14 App Router
│   │   ├── page.tsx                   # Queue (main)
│   │   ├── chat/[id]/page.tsx         # Chat history
│   │   ├── analytics/page.tsx         # Analytics
│   │   └── login/page.tsx             # Auth
│   ├── components/
│   │   ├── TriageCard.tsx             # Queue card component
│   │   ├── ChatHistory.tsx            # Message display
│   │   ├── SeverityBadge.tsx          # Green/Yellow/Red badge
│   │   └── AnalyticsCharts.tsx        # recharts components
│   ├── package.json
│   └── Dockerfile
├── widget/
│   ├── src/
│   │   └── ChatWidget.tsx             # Embeddable web chat
│   └── package.json
├── data/
│   └── clinical_guidelines/           # Pre-loaded PDFs
├── docker-compose.yml
└── README.md
```

## Build Plan

| Week | What | Details |
|------|------|---------|
| 1 | Core triage engine | Fork WhatsBot. Swap OpenAI for Claude + tools. Build 5 triage tools. Wire Twilio webhook to new engine. Test via WhatsApp. |
| 2 | RAG + Database | Add DocMind hybrid search with clinical guidelines. Set up PostgreSQL schema. Add audit logging. Session management via Redis. |
| 3 | Dashboard | Build receptionist queue page, chat history, confirm/reassign/reject actions. JWT auth. Real-time polling. |
| 4 | Web chat + Analytics + Polish | Build embeddable web chat widget. Analytics page. Testing. Docker Compose. README. Deploy. |

## Success Criteria

1. Patient sends symptoms on WhatsApp → gets triage response in under 30 seconds
2. Receptionist sees color-coded queue with AI summary → can confirm/reassign/reject
3. RED cases trigger immediate alert
4. All conversations + tool calls logged in audit table
5. Clinical guidelines searchable via RAG with citations
6. Web chat widget works on a sample clinic page
7. Docker Compose brings up entire system with one command
8. Demo-ready: Hasnain can show a live WhatsApp triage flow on a call with a healthcare CTO
