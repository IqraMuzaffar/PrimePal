# n8n AI Workflow Automation — Build Plan

## Project Overview

A portfolio project demonstrating AI-powered business automation using n8n (visual workflow engine). Includes 3 production-ready workflows, a FastAPI backend for AI processing, and a Next.js dashboard for monitoring.

**Purpose:** Win Upwork clients who need AI + automation (5+ active jobs, $30-100/hr).

**Target completion:** 3 days (20 hours of work)

---

## Architecture

```
                    ┌──────────────────────┐
                    │    n8n Workflow       │
                    │    Engine (Docker)    │
                    │                      │
                    │  ┌────────────────┐  │
                    │  │ Email Triage   │  │
                    │  │ Invoice Proc.  │  │
                    │  │ Lead Qualifier │  │
                    │  └────────────────┘  │
                    └──────┬───────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
     ┌─────────────┐ ┌──────────┐  ┌──────────────┐
     │  FastAPI     │ │  Gmail   │  │  Slack       │
     │  Backend     │ │  API     │  │  Webhooks    │
     │  (AI calls)  │ │          │  │              │
     └──────┬──────┘ └──────────┘  └──────────────┘
            │
     ┌──────┼──────────────┐
     │      │              │
     ▼      ▼              ▼
┌────────┐ ┌────────┐ ┌──────────┐
│OpenAI  │ │Postgre │ │Google    │
│GPT-4o  │ │SQL     │ │Sheets    │
│mini    │ │        │ │          │
└────────┘ └───┬────┘ └──────────┘
               │
               ▼
        ┌─────────────┐
        │  Next.js     │
        │  Dashboard   │
        │  (monitoring)│
        └─────────────┘
```

---

## Final Directory Structure

```
n8n-ai-workflows/
├── docker-compose.yml              # n8n + PostgreSQL + Redis
├── .env.example                    # All required env vars
├── .env                            # Actual config (gitignored)
├── .gitignore
│
├── workflows/                      # Exportable n8n workflow JSONs
│   ├── 01-email-triage.json
│   ├── 02-invoice-processor.json
│   └── 03-lead-qualifier.json
│
├── backend/                        # FastAPI helper API
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app, CORS, health check
│       ├── config.py               # Env vars, settings
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── email.py            # POST /api/classify-email
│       │   ├── invoice.py          # POST /api/extract-invoice
│       │   └── leads.py            # POST /api/score-lead
│       ├── services/
│       │   ├── __init__.py
│       │   ├── ai_client.py        # OpenAI wrapper (classify, extract, score)
│       │   ├── pdf_extractor.py    # Extract text from PDF
│       │   └── enrichment.py       # Company data lookup (Apollo mock)
│       └── models/
│           ├── __init__.py
│           └── schemas.py          # Pydantic models for all endpoints
│
├── frontend/                       # Next.js 14 dashboard
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── app/
│   │   ├── layout.tsx              # Dark theme shell + sidebar
│   │   ├── globals.css             # Dark theme styles
│   │   ├── page.tsx                # Dashboard home (stats overview)
│   │   ├── workflows/
│   │   │   └── page.tsx            # Workflow list + run history
│   │   └── results/
│   │       ├── page.tsx            # All processed items
│   │       ├── emails/
│   │       │   └── page.tsx        # Email classifications
│   │       ├── invoices/
│   │       │   └── page.tsx        # Extracted invoice data
│   │       └── leads/
│   │           └── page.tsx        # Scored leads
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── AppShell.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx      # 4 stat cards
│   │   │   ├── RecentActivity.tsx  # Latest processed items
│   │   │   └── WorkflowStatus.tsx  # Which workflows are active
│   │   └── ui/                     # Shared components
│   └── lib/
│       ├── api.ts                  # Backend API calls
│       └── utils.ts
│
├── sample-data/                    # Test files for demo
│   ├── emails/
│   │   ├── urgent-client.txt
│   │   ├── sales-inquiry.txt
│   │   ├── support-request.txt
│   │   └── newsletter-spam.txt
│   ├── invoices/
│   │   ├── invoice-001.pdf
│   │   ├── invoice-002.pdf
│   │   └── invoice-003.pdf
│   └── leads/
│       ├── hot-lead.json
│       ├── warm-lead.json
│       └── cold-lead.json
│
├── README.md                       # Setup guide + screenshots
├── DEMO-SCRIPT.md                  # Step-by-step demo recording guide
└── TESTING-GUIDE.md                # How to test each workflow
```

---

## Phase 1: Infrastructure (2 hours)

### Goal
Get n8n, PostgreSQL, and the FastAPI backend running with one command.

### Tasks

#### 1.1 Docker Compose Setup
- n8n service (port 5678)
- PostgreSQL 15 (port 5432)
- FastAPI backend (port 8000)
- Shared network so n8n can call the backend

```yaml
# docker-compose.yml services:
# - postgres: data storage for dashboard + n8n
# - n8n: workflow engine with basic auth
# - backend: FastAPI AI processing API
# - frontend: Next.js dashboard (optional, can run with npm dev)
```

#### 1.2 Environment Variables
```env
# .env.example
OPENAI_API_KEY=sk-proj-your-key-here
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
POSTGRES_USER=n8nuser
POSTGRES_PASSWORD=n8npass
POSTGRES_DB=n8n_workflows
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx  (optional)
GOOGLE_SHEETS_CREDENTIALS={}  (optional)
```

#### 1.3 FastAPI Skeleton
- Health check endpoint: GET /health
- CORS configured for n8n + frontend
- OpenAI client initialization
- Database connection (asyncpg)

#### 1.4 Database Schema
```sql
CREATE TABLE processed_emails (
    id SERIAL PRIMARY KEY,
    subject TEXT,
    sender TEXT,
    body_preview TEXT,
    category VARCHAR(20),       -- urgent / sales_lead / support / spam
    confidence FLOAT,
    ai_summary TEXT,
    action_taken TEXT,
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processed_invoices (
    id SERIAL PRIMARY KEY,
    filename TEXT,
    vendor TEXT,
    amount DECIMAL(12,2),
    currency VARCHAR(3),
    invoice_date DATE,
    due_date DATE,
    line_items JSONB,
    needs_approval BOOLEAN,
    status VARCHAR(20),         -- extracted / pending_approval / approved
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processed_leads (
    id SERIAL PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    company TEXT,
    job_title TEXT,
    message TEXT,
    ai_score INTEGER,           -- 0-100
    ai_category VARCHAR(10),    -- hot / warm / cold
    ai_reasoning TEXT,
    emails_generated INTEGER,
    crm_synced BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_runs (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(50),  -- email_triage / invoice_processor / lead_qualifier
    status VARCHAR(20),         -- success / failed / running
    items_processed INTEGER,
    duration_ms INTEGER,
    error_message TEXT,
    run_at TIMESTAMP DEFAULT NOW()
);
```

### Acceptance Criteria
- `docker-compose up` starts all services
- http://localhost:5678 shows n8n editor
- http://localhost:8000/health returns `{"status": "ok"}`
- Database tables created on startup

---

## Phase 2: FastAPI AI Endpoints (4 hours)

### Goal
Build the 3 AI processing endpoints that n8n workflows will call.

### Tasks

#### 2.1 Email Classification Endpoint
```
POST /api/classify-email
Body: { "subject": "...", "sender": "...", "body": "..." }
Response: {
    "category": "urgent" | "sales_lead" | "support" | "spam",
    "confidence": 0.95,
    "summary": "Client requesting urgent contract review by EOD",
    "suggested_action": "Notify team on Slack immediately",
    "key_entities": ["contract", "EOD deadline", "legal review"]
}
```

**AI Prompt Strategy:**
- System prompt defines the 4 categories with clear rules
- Few-shot examples for each category
- Structured JSON output via function calling
- Confidence score based on how clearly it fits one category

#### 2.2 Invoice Extraction Endpoint
```
POST /api/extract-invoice
Body: multipart form with PDF file
Response: {
    "vendor": "Acme Corp",
    "amount": 4500.00,
    "currency": "USD",
    "invoice_number": "INV-2024-0847",
    "invoice_date": "2024-07-15",
    "due_date": "2024-08-15",
    "line_items": [
        {"description": "Web Development", "qty": 1, "unit_price": 3000.00, "total": 3000.00},
        {"description": "Hosting (annual)", "qty": 1, "unit_price": 1500.00, "total": 1500.00}
    ],
    "needs_approval": false,
    "confidence": 0.92
}
```

**Implementation:**
- PyPDF2 extracts text from PDF
- If text extraction fails, use OpenAI Vision API (send PDF page as image)
- AI extracts structured fields from the text
- `needs_approval = true` if amount > $5000 (configurable threshold)

#### 2.3 Lead Scoring Endpoint
```
POST /api/score-lead
Body: {
    "first_name": "Sarah",
    "last_name": "Johnson",
    "email": "sarah@techcorp.io",
    "company": "TechCorp",
    "job_title": "VP of Marketing",
    "message": "We need AI automation for our 50-person sales team. Budget approved for Q3."
}
Response: {
    "score": 92,
    "category": "hot",
    "reasoning": "Senior decision-maker at mid-size company with explicit budget approval and clear need. High intent signals: specific team size, timeline (Q3), and budget confirmation.",
    "key_signals": ["VP title", "budget approved", "specific team size", "Q3 timeline"],
    "suggested_followup": "Schedule a discovery call within 24 hours. Reference their Q3 timeline and 50-person team.",
    "draft_email": {
        "subject": "AI Automation for TechCorp's Sales Team",
        "body": "Hi Sarah, ..."
    }
}
```

**Scoring Logic (AI prompt):**
- 75-100 = HOT: Decision maker + budget signal + clear need + timeline
- 40-74 = WARM: Some interest but missing budget/authority/timeline
- 0-39 = COLD: Vague inquiry, no company, generic question

#### 2.4 Stats Endpoint (for dashboard)
```
GET /api/stats
Response: {
    "total_processed": 147,
    "emails": { "total": 89, "urgent": 7, "sales_lead": 23, "support": 41, "spam": 18 },
    "invoices": { "total": 34, "total_amount": 127500.00, "pending_approval": 3 },
    "leads": { "total": 24, "hot": 5, "warm": 11, "cold": 8 },
    "today": { "emails": 12, "invoices": 3, "leads": 4 },
    "recent_activity": [...]
}
```

#### 2.5 List/Detail Endpoints
```
GET /api/emails          — list all classified emails
GET /api/invoices        — list all extracted invoices
GET /api/leads           — list all scored leads
GET /api/workflow-runs   — list all workflow executions
```

### Acceptance Criteria
- All 3 AI endpoints return correct structured JSON
- Invoice endpoint handles PDF upload
- Stats endpoint returns aggregated data
- All results saved to PostgreSQL
- Error handling: invalid PDF, API timeout, malformed input

---

## Phase 3: n8n Workflows (6 hours)

### Goal
Build 3 visual workflows in n8n that call the FastAPI endpoints and connect to external services.

### Important
Each workflow will be exported as JSON so it can be imported into any n8n instance. This is key for the portfolio — clients can see the actual workflow.

---

### 3.1 Workflow 1: AI Email Triage (2 hours)

```
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────────┐
│  Gmail   │───▶│  HTTP    │───▶│  Switch      │───▶│  Actions    │
│  Trigger │    │  Request │    │  (category)  │    │             │
│          │    │  to API  │    │              │    │             │
└──────────┘    └──────────┘    └──────────────┘    └─────────────┘
                                     │
                    ┌────────────────┼────────────────┐──────────┐
                    ▼                ▼                ▼          ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐ ┌────────┐
              │  Slack:   │    │  Google   │    │  DB:     │ │Archive │
              │  "URGENT  │    │  Sheets:  │    │  Create  │ │  email │
              │  email    │    │  Add lead │    │  ticket  │ │        │
              │  from..." │    │  row      │    │          │ │        │
              └──────────┘    └──────────┘    └──────────┘ └────────┘
```

**n8n Nodes:**
1. **Gmail Trigger** — polls every 2 minutes for new emails (or use IMAP)
2. **HTTP Request** — POST to `http://backend:8000/api/classify-email` with subject, sender, body
3. **Switch** — routes based on `category` field in response
4. **Urgent branch:** Slack message to #alerts channel
5. **Sales Lead branch:** Add row to Google Sheet + send template auto-reply via Gmail
6. **Support branch:** Insert into `support_tickets` in PostgreSQL
7. **Spam branch:** Archive email (Gmail archive action)
8. **Log Run** — POST to `/api/log-run` to record workflow execution

**For demo without Gmail:**
- Use a **Webhook Trigger** instead of Gmail
- POST sample email JSON to the webhook URL
- Same workflow logic applies

---

### 3.2 Workflow 2: AI Invoice Processor (2 hours)

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────────┐
│  Webhook  │───▶│  HTTP    │───▶│  IF amount   │───▶│  Actions    │
│  (file    │    │  Request │    │  > $5000?    │    │             │
│  upload)  │    │  to API  │    │              │    │             │
└──────────┘    └──────────┘    └──────────────┘    └─────────────┘
                                     │
                         ┌───────────┼───────────┐
                         ▼                       ▼
                   ┌──────────┐           ┌──────────┐
                   │  Slack:   │           │  Google   │
                   │  "Invoice │           │  Sheets:  │
                   │  $7,200   │           │  Add row  │
                   │  needs    │           │  (auto    │
                   │  approval"│           │  approved)│
                   └──────────┘           └──────────┘
```

**n8n Nodes:**
1. **Webhook** — receives PDF file upload
2. **HTTP Request** — POST file to `http://backend:8000/api/extract-invoice` (multipart)
3. **IF** — check if `needs_approval` is true (amount > $5000)
4. **Approval branch:** Slack message with invoice details + "Approve?" button
5. **Auto-approve branch:** Add to Google Sheet directly
6. **Both branches:** Save to PostgreSQL `processed_invoices` table
7. **Summary email** — weekly cron trigger that sends a summary of all invoices processed

---

### 3.3 Workflow 3: AI Lead Qualifier (2 hours)

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────────┐
│  Webhook  │───▶│  HTTP    │───▶│  Switch      │───▶│  Actions    │
│  (form    │    │  Request │    │  (hot/warm/  │    │             │
│  submit)  │    │  to API  │    │   cold)      │    │             │
└──────────┘    └──────────┘    └──────────────┘    └─────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  Slack:   │    │  Google   │    │  DB:     │
              │  "HOT     │    │  Sheets:  │    │  Log     │
              │  LEAD!"   │    │  Add to   │    │  cold    │
              │  + draft  │    │  nurture  │    │  lead    │
              │  email    │    │  list     │    │          │
              └──────────┘    └──────────┘    └──────────┘
```

**n8n Nodes:**
1. **Webhook** — receives lead data (name, email, company, message)
2. **HTTP Request** — POST to `http://backend:8000/api/score-lead`
3. **Switch** — route based on `category` (hot/warm/cold)
4. **Hot branch:** Slack alert with score + reasoning + draft email → Add to Google Sheet "Hot Leads"
5. **Warm branch:** Add to Google Sheet "Nurture List" → Schedule follow-up email in 3 days
6. **Cold branch:** Save to DB only, no action
7. **All branches:** Log to PostgreSQL `processed_leads` table

---

### Workflow Testing Strategy

For each workflow, create a **test button** in the n8n editor:
- Manual trigger node at the start
- Hardcoded test data (sample email, sample invoice, sample lead)
- Can be executed with one click in the n8n UI

### Acceptance Criteria
- All 3 workflows visible in n8n editor at http://localhost:5678
- Each workflow can be triggered manually with test data
- Results appear in PostgreSQL
- Slack notifications work (or log to console if no Slack configured)
- Each workflow exported as JSON file in `workflows/` directory

---

## Phase 4: Sample Data (1 hour)

### Goal
Create realistic test data so the demo looks professional.

### 4.1 Sample Emails (4 files)

**urgent-client.txt:**
```
From: michael.chen@globalventures.com
Subject: URGENT: Contract review needed by 5 PM today

Hi team,

Our board meeting is tomorrow morning and we need the revised
partnership agreement reviewed and approved before 5 PM today.
The legal team flagged two clauses that need immediate attention.
Please prioritize this.

Thanks,
Michael Chen
VP of Operations, Global Ventures
```

**sales-inquiry.txt:**
```
From: priya.sharma@retailnext.io
Subject: AI automation for our customer service team

Hello,

We're a mid-size e-commerce company (200 employees) looking to
automate our customer service workflows. We currently handle
500+ tickets/day manually and want to reduce response times.

Budget is approved for Q3 implementation. Can we schedule a
call this week to discuss?

Best,
Priya Sharma
Director of Operations, RetailNext
```

**support-request.txt:**
```
From: john.doe@acmecorp.com
Subject: Cannot access dashboard - Error 403

Hi Support,

I've been getting a 403 Forbidden error when trying to access
the analytics dashboard since this morning. I've tried clearing
my browser cache and using incognito mode but the issue persists.

My account email is john.doe@acmecorp.com
Browser: Chrome 120

Can you help?

Thanks,
John
```

**newsletter-spam.txt:**
```
From: noreply@marketingblast.io
Subject: 🚀 10X Your Revenue with Our New AI Tool!

AMAZING OFFER - LIMITED TIME ONLY!!!

Dear Valued Professional,

You've been selected to receive an EXCLUSIVE discount on our
revolutionary AI marketing platform. Join 50,000+ businesses
who have already 10X'd their revenue!

Click here to claim your FREE trial: [link]

Unsubscribe: [link]
```

### 4.2 Sample Invoices (3 PDF files)
Create simple PDF invoices using Python (reportlab or fpdf2):
- Invoice 001: Acme Web Services, $3,200 (auto-approve)
- Invoice 002: CloudHost Pro, $7,500 (needs approval — over $5000)
- Invoice 003: DesignStudio, $1,800 (auto-approve)

### 4.3 Sample Leads (3 JSON files)
- Hot lead: VP at mid-size company, budget approved, specific need
- Warm lead: Marketing manager, interested but no budget mentioned
- Cold lead: Gmail address, no company, vague question "what is AI?"

### Acceptance Criteria
- All sample files in `sample-data/` directory
- Sample PDFs are valid and parseable
- Running each workflow with sample data produces correct results

---

## Phase 5: Next.js Dashboard (4 hours)

### Goal
Build a monitoring dashboard that shows what the workflows have processed.

### 5.1 Layout & Navigation (30 min)
- Dark theme matching AskDocs style (reuse globals.css)
- Sidebar: Dashboard, Workflows, Emails, Invoices, Leads
- App name: "n8n AI Workflows" with automation icon

### 5.2 Dashboard Home Page (1.5 hours)
**4 stat cards in a row:**
- Total Processed (all items across workflows)
- Emails Classified (with breakdown: urgent/lead/support/spam)
- Invoices Extracted (with total dollar amount)
- Leads Scored (with breakdown: hot/warm/cold)

**Recent Activity feed:**
- Last 10 processed items across all workflows
- Each item shows: type icon, description, category/score, time

**Workflow Status:**
- 3 cards (one per workflow) showing: name, last run time, items processed, status indicator

### 5.3 Emails Page (45 min)
- Table: sender, subject, category (color-coded badge), confidence, summary, time
- Filter by category (All / Urgent / Sales Lead / Support / Spam)
- Click row to expand and see full AI analysis

### 5.4 Invoices Page (45 min)
- Table: vendor, amount, invoice date, due date, status (extracted/pending/approved), time
- Highlight rows needing approval (amount > $5000)
- Click row to expand and see line items
- Total amount processed shown at top

### 5.5 Leads Page (45 min)
- Table: name, company, email, score (color bar), category (badge), time
- Filter by category (All / Hot / Warm / Cold)
- Click row to expand: AI reasoning, key signals, draft follow-up email
- Score shown as colored bar (green = hot, yellow = warm, red = cold)

### Font Sizes (Learned from AskDocs)
- Page titles: 32px
- Section headers: 18px
- Table headers: 14px uppercase
- Table body text: 16px
- Stat card numbers: 40px mono
- Stat card labels: 14px uppercase
- Badges/tags: 13px
- Minimum text anywhere: 13px

### Acceptance Criteria
- Dashboard shows real data from PostgreSQL via FastAPI
- All pages load without errors
- Tables are sortable and filterable
- Responsive on narrow screens (card layout below 1024px)
- Dark theme consistent with AskDocs

---

## Phase 6: Testing, Documentation & Demo (3 hours)

### 6.1 End-to-End Testing (1 hour)
Test each workflow completely:

**Email Triage Test:**
1. POST each sample email to the webhook
2. Verify correct classification (urgent/lead/support/spam)
3. Verify Slack notification for urgent
4. Verify Google Sheet row for sales lead
5. Verify DB entry for support
6. Check dashboard shows the results

**Invoice Processor Test:**
1. POST each sample PDF to the webhook
2. Verify correct extraction (vendor, amount, dates, line items)
3. Verify approval flag for $7,500 invoice
4. Verify auto-approve for < $5,000
5. Check dashboard shows extracted data

**Lead Qualifier Test:**
1. POST each sample lead to the webhook
2. Verify correct scoring (hot/warm/cold)
3. Verify Slack alert for hot lead
4. Verify draft email generated for hot lead
5. Check dashboard shows scored leads

### 6.2 README.md (30 min)
```markdown
# n8n AI Workflow Automation

AI-powered business automation using n8n + OpenAI + FastAPI.

## What It Does
- Email Triage: AI classifies emails as Urgent/Lead/Support/Spam
- Invoice Processor: Extracts structured data from PDF invoices
- Lead Qualifier: Scores leads as Hot/Warm/Cold with reasoning

## Quick Start
1. Clone the repo
2. Copy .env.example to .env, add your OpenAI key
3. docker-compose up -d
4. Open http://localhost:5678 (n8n)
5. Open http://localhost:3000 (dashboard)
6. Import workflows from workflows/ folder

## Screenshots
[6 screenshots here]

## Tech Stack
n8n, FastAPI, OpenAI GPT-4o-mini, PostgreSQL, Next.js 14, Docker
```

### 6.3 DEMO-SCRIPT.md (30 min)
Step-by-step recording guide:
1. Show n8n editor with visual workflows (10 sec)
2. Trigger email triage with sample emails (20 sec)
3. Show Slack notification appearing (5 sec)
4. Upload sample invoice, show extraction (15 sec)
5. Submit hot lead, show scoring + draft email (15 sec)
6. Show dashboard with all results (15 sec)
7. Close with stats: "Processed 10 items in under 30 seconds" (5 sec)

Total demo: 90 seconds

### 6.4 TESTING-GUIDE.md (30 min)
Curl commands to test each endpoint:
```bash
# Test email classification
curl -X POST http://localhost:8000/api/classify-email \
  -H "Content-Type: application/json" \
  -d '{"subject": "URGENT: ...", "sender": "...", "body": "..."}'

# Test invoice extraction
curl -X POST http://localhost:8000/api/extract-invoice \
  -F "file=@sample-data/invoices/invoice-001.pdf"

# Test lead scoring
curl -X POST http://localhost:8000/api/score-lead \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Sarah", ...}'
```

### Acceptance Criteria
- All 3 workflows pass end-to-end tests
- README has setup instructions + screenshots
- Demo script produces a compelling 90-second video
- Testing guide lets anyone verify the system works

---

## Phase Summary

| Phase | What | Hours | Depends On |
|-------|------|-------|------------|
| 1 | Infrastructure (Docker, DB, FastAPI skeleton) | 2 | Nothing |
| 2 | AI Endpoints (classify, extract, score) | 4 | Phase 1 |
| 3 | n8n Workflows (3 visual workflows) | 6 | Phase 2 |
| 4 | Sample Data (emails, invoices, leads) | 1 | Nothing |
| 5 | Next.js Dashboard (monitoring UI) | 4 | Phase 2 |
| 6 | Testing, Docs, Demo Script | 3 | Phase 3 + 5 |
| **Total** | | **20 hours** | |

**Phases 4 and 5 can run in parallel with Phase 3.**

---

## Environment Variables (Complete List)

```env
# Required
OPENAI_API_KEY=sk-proj-...              # For AI classification/extraction/scoring

# Database (auto-configured by Docker)
POSTGRES_USER=n8nuser
POSTGRES_PASSWORD=n8npass
POSTGRES_DB=n8n_workflows
DATABASE_URL=postgresql://n8nuser:n8npass@postgres:5432/n8n_workflows

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
N8N_PORT=5678

# Backend
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5678

# Optional (for full demo)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
GOOGLE_SHEETS_CREDENTIALS={}            # Service account JSON
GOOGLE_SHEET_ID=your-sheet-id

# Optional (for lead enrichment)
APOLLO_API_KEY=your-apollo-key          # Free tier: 10K credits/month
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gmail API requires OAuth setup | Can't demo email trigger | Use Webhook trigger instead — POST sample data manually |
| Slack not configured | No notification demo | Log to console + show in dashboard instead |
| Google Sheets not configured | No spreadsheet export | Save to PostgreSQL + show in dashboard |
| OpenAI API key expired | AI endpoints fail | Have fallback mock responses for demo |
| PDF extraction fails | Invoice workflow broken | Include both text PDFs and test with Vision API fallback |

**Key principle:** Every external integration has a fallback. The demo must work with ONLY an OpenAI key — everything else is optional enhancement.

---

## Upwork Jobs This Project Answers

After building this, Hasnain can apply to these types of jobs:

1. "n8n AI Workflow Automation Developer" — direct match
2. "AI Email Processing / Triage" — email workflow
3. "Invoice/Document Extraction" — invoice workflow
4. "Lead Scoring / CRM Automation" — lead workflow
5. "AI Automation Specialist" — all 3 workflows
6. "ChatGPT/AI Integration" — AI API usage
7. "Business Process Automation" — general automation
8. "FastAPI Developer" — backend skills
9. "Full-Stack AI Developer" — frontend + backend + AI

**One project, 9 types of proposals.**
