# Hasnain's Portfolio Projects — Updated July 2026

## Job Market Analysis (from 30+ live Upwork listings)

### Highest Demand Categories (ranked by frequency + pay)

| # | Category | Jobs Seen | Pay Range | Proposals | Competition |
|---|----------|-----------|-----------|-----------|-------------|
| 1 | **AI Agents + Agentic Automation** | 8+ jobs | $25-70/hr | 20-50+ | HIGH but so is demand |
| 2 | **RAG + LLM Integration** | 6+ jobs | $19-50/hr | 50+ | Saturated but constant |
| 3 | **Healthcare AI / Clinic Systems** | 5+ jobs | $35-100/hr | 10-20 | LOW — domain expertise required |
| 4 | **AI Automation (n8n/Make/Zapier)** | 5+ jobs | $10-60/hr | 20-50 | Medium |
| 5 | **Voice AI Agents (Vapi/Twilio)** | 4+ jobs | $15-70/hr | 10-20 | LOW competition |
| 6 | **MCP Servers / Claude API** | 3+ jobs | $10-50/hr | 5-20 | VERY LOW - emerging |
| 7 | **Full-Stack AI SaaS** | 5+ jobs | $25-50/hr | 50+ | High |
| 8 | **AI Audit / Consulting** | 3+ jobs | $25-75/hr | 5-15 | Low, high trust needed |
| 9 | **Browser Agents** | 2+ jobs | $50-100 fixed | 20-50 | Medium |

### Key Insight
**Healthcare AI**, **Voice AI**, and **MCP servers** have the lowest competition but highest pay. Healthcare especially — domain knowledge is a barrier to entry that most freelancers can't fake.

---

## Portfolio Status

### Built & Deployed (6 projects)

| # | Project | GitHub | What It Proves |
|---|---------|--------|---------------|
| 1 | **LeadFlow AI** | [leadflow-ai](https://github.com/IqraMuzaffar123/leadflow-ai) | Lead scoring, CRM automation, n8n workflows |
| 2 | **DocMind RAG** | [docmind-rag](https://github.com/IqraMuzaffar123/docmind-rag) | RAG pipeline, document Q&A, cited answers |
| 3 | **WhatsBot Pro** | [whatsbot-pro](https://github.com/IqraMuzaffar123/whatsbot-pro) | WhatsApp AI chatbot, Twilio, Redis queues |
| 4 | **n8n AI Workflows** | [n8n-ai-workflows](https://github.com/IqraMuzaffar123/n8n-ai-workflows) | Email triage, invoice OCR, lead qualification |
| 5 | **FinancePal** | [financepal](https://github.com/IqraMuzaffar123/financepal) | MCP server (14 tools), Claude API, finance dashboard |
| 6 | **CareBot** | carebot (building next) | Healthcare clinic management, 16 AI tools, appointments, labs, prescriptions |

### What These Cover
- RAG / document retrieval (DocMind)
- Lead scoring / CRM automation (LeadFlow)
- n8n workflow automation (n8n-workflows)
- WhatsApp chatbot with Twilio (WhatsBot)
- MCP server + Claude API tool-use (FinancePal)
- **Healthcare AI + clinic operations (CareBot)**
- Full-stack: Next.js + FastAPI/Express + PostgreSQL
- Charts, PDF reports, audit logging

### What's Still MISSING
1. **Voice AI Agent** — No voice project yet
2. **Multi-Agent Orchestration (LangGraph)** — No multi-agent coordination demo
3. **Browser Automation Agent** — No Playwright/Puppeteer AI agent

---

## Build Queue — What's Next

### NOW BUILDING: Project 6 — CareBot (Healthcare AI)

**Full implementation plan at:** `carebot/docs/superpowers/plans/2026-07-29-carebot-implementation.md`

**7 Modules:**
1. Appointment Management (booking, calendar, waitlist, conflict prevention, no-show tracking)
2. Patient Records (demographics, medical history, visit timeline, documents)
3. Lab Management (orders → collection → results → review → delivery, trend charts, PDF reports)
4. Notifications (appointment reminders, lab alerts, follow-up reminders, critical value alerts)
5. Reports (6 PDF types: lab, prescription, visit summary, patient summary, medical certificate, monthly clinic)
6. Prescriptions (create, track, refill requests, allergy checks)
7. AI Chat (16 tools connecting all modules, symptom triage, emergency detection, safety guardrails)

**17 database tables, 40+ API endpoints, 16 AI tools, 14 frontend pages**

**Seed data:** City Health Clinic Lahore, 6 doctors, 8 patients (diabetes, heart disease, pregnancy, asthma, etc.), realistic lab values, 30 appointments, 40 health FAQs

**19 implementation tasks across 7 phases:**

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| 1. Infrastructure | 1-3 | PostgreSQL + 17 tables + rich seed data |
| 2. Backend APIs | 4-8 | 40+ REST endpoints, JWT auth, audit logging |
| 3. AI Chat Engine | 9 | Claude + 16 tools, emergency detection, guardrails |
| 4. Patient Frontend | 10-12 | Landing, AI chat, patient portal, booking flow |
| 5. Admin Frontend | 13-15 | Dashboard, appointments, patients, labs, prescriptions, doctors, FAQs, audit |
| 6. Notifications + PDFs | 16-17 | 8 notification templates + 4 PDF report types |
| 7. Testing + Docs | 18-19 | 20-test suite, README, TESTING-GUIDE, DEMO-SCRIPT, HIPAA notes |

**Jobs this wins:**
- "AI Healthcare Chatbot" — $25-50/hr
- "Clinic Management System" — $35-70/hr
- "Healthcare SaaS Developer" — $40-100/hr
- "Patient Portal Development" — $30-60/hr
- "HIPAA-compliant AI" — $50-80/hr
- "Appointment Booking System" — $25-50/hr
- "Medical Document Automation" — $35-70/hr

---

### NEXT: Project 7 — VoiceFlow AI (Voice Receptionist)

**Why:** Lowest competition category. Most freelancers can't demo a working voice agent.

**What to build:**
- Inbound call answering with AI (Vapi or Twilio + ElevenLabs)
- FAQ handling, appointment booking, call routing
- Real-time transcription (Whisper)
- Dashboard: call logs, transcripts, analytics
- Webhook integration for CRM

**Stack:** Vapi/Twilio Voice, ElevenLabs, Whisper, FastAPI, Next.js, PostgreSQL

**Demo:** A real phone number anyone can call → AI answers, books appointment, logs transcript

**Jobs this wins:**
- "AI Voice Agent and Receptionist Engineer" ($15-35/hr)
- "AI Agent Developer for Insurance Agency" ($50-70/hr)
- "Conversational AI Voice Bot Developer" ($19-40/hr)

---

### THEN: Project 8 — AgentForge (Multi-Agent LangGraph)

**Why:** Most requested framework in AI job listings. Shows architectural depth.

**What to build:**
- 3 cooperating AI agents: Researcher → Analyst → Writer
- LangGraph state machine orchestrating handoffs
- Tool calling (web search, DB queries, file generation)
- Human-in-the-loop approval checkpoints
- Dashboard showing agent state + reasoning trace

**Stack:** LangGraph, Claude/OpenAI, FastAPI, Next.js, PostgreSQL, Tavily

**Jobs this wins:**
- "AI Engineer - Agentic Automation" ($35-50/hr)
- "Senior AI Developer" ($25-47/hr)
- "AI Agent Developer - OpenAI/Claude" ($10-30/hr)
- "Lead Engineer — AI systems" ($25-47/hr)

---

### LATER: Project 9 — BrowseBot (Browser Automation)

**Why:** Unique differentiator. Very few freelancers have a working browser agent.

**What to build:**
- AI agent operating inside real browsers (Playwright)
- Navigate, fill forms, take screenshots, classify content
- Configurable task definitions
- Human-in-the-loop approval
- Dashboard with task runs + screenshots

**Stack:** Playwright, LangGraph, Claude Vision API, FastAPI, Next.js

---

## Master Build Order

| # | Project | Status | Category | Est. Time |
|---|---------|--------|----------|-----------|
| 1 | LeadFlow AI | DONE | CRM + Lead Scoring | — |
| 2 | DocMind RAG | DONE | RAG + Document Q&A | — |
| 3 | WhatsBot Pro | DONE | WhatsApp Chatbot | — |
| 4 | n8n AI Workflows | DONE | Automation + n8n | — |
| 5 | FinancePal | DONE | MCP Server + Finance | — |
| **6** | **CareBot** | **BUILDING NOW** | **Healthcare AI + Clinic Mgmt** | **5-7 days** |
| 7 | VoiceFlow AI | NEXT | Voice AI Agent | 3-4 days |
| 8 | AgentForge | QUEUE | Multi-Agent (LangGraph) | 4-5 days |
| 9 | BrowseBot | QUEUE | Browser Automation | 4-5 days |

---

## Job Coverage Matrix (after all 9 projects)

| Job Type | Project(s) |
|----------|-----------|
| AI Agent Developer | AgentForge, CareBot, LeadFlow, WhatsBot |
| RAG / LLM Integration | DocMind, FinancePal, CareBot |
| Healthcare AI | **CareBot** |
| Clinic Management / SaaS | **CareBot** |
| n8n / Automation | n8n-workflows, LeadFlow |
| Voice AI Agent | **VoiceFlow** |
| MCP Server Developer | FinancePal |
| Claude API / Anthropic | FinancePal, CareBot, DocMind |
| Full-Stack AI SaaS | All projects |
| Browser Automation | **BrowseBot** |
| Multi-Agent Orchestration | **AgentForge** |
| WhatsApp / Chatbot | WhatsBot Pro |
| CRM + Lead Scoring | LeadFlow AI |
| Invoice / Document Processing | n8n-workflows, FinancePal |
| AI Finance / Analytics | FinancePal |
| Patient Portal | **CareBot** |
| Appointment Booking | **CareBot** |
| Medical Document Automation | **CareBot** |
| HIPAA-compliant AI | **CareBot** |

**After all 9: Hasnain covers 19 job categories with working demos.**

---

## Proposal Templates

### Healthcare jobs:
> "I built CareBot — a complete clinic management system with AI. 7 modules: appointments, patient records, labs, prescriptions, notifications, reports, and an AI chat assistant with 16 tools. Includes symptom triage, emergency detection, and HIPAA-aware audit logging. Here's the GitHub: [link], demo: [Loom]"

### Voice AI jobs:
> "I built VoiceFlow AI — an AI voice receptionist. Call this number to test it: [phone]. It handles FAQs, books appointments, and logs full transcripts. GitHub: [link]"

### MCP / Claude jobs:
> "I built FinancePal — a TypeScript MCP server with 14 finance tools. Works in Claude Desktop and via a Next.js chat dashboard. 22-test suite, SQL injection protection, anomaly detection. GitHub: [link]"

### RAG / LLM jobs:
> "I built DocMind — a RAG system with ChromaDB. Upload PDFs/DOCX/TXT, get cited answers with confidence scores. GitHub: [link]"

### Automation / n8n jobs:
> "I built n8n AI Workflows — 3 production workflows (email triage, invoice processing, lead scoring) with a monitoring dashboard. GitHub: [link]"

### Multi-agent jobs:
> "I built AgentForge — 3 cooperating AI agents (Researcher → Analyst → Writer) using LangGraph. Full reasoning trace visible in dashboard. GitHub: [link]"

### Always include:
1. GitHub repo link
2. 2-min Loom video
3. 1-sentence of what it does
4. Tech stack match to their job posting
