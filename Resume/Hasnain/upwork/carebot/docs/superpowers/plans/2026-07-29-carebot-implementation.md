# CareBot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CareBot — a complete AI-powered clinic management system with appointments, patient records, labs, prescriptions, notifications, reports, and an AI chat assistant with 16 tools and medical safety guardrails.

**Architecture:** FastAPI backend with PostgreSQL (17 tables), Claude API integration with 16 tool functions for patient chat, Next.js 14 frontend with 14 pages (4 patient-facing, 10 admin). JWT auth for both patients (email+DOB) and staff (email+password). PDF report generation via HTML templates. Notification system with in-app + email/SMS hooks.

**Tech Stack:** Python 3.12, FastAPI, PostgreSQL 15, Anthropic Claude API, Next.js 14, Tailwind CSS, shadcn/ui, Chart.js, react-chartjs-2, lucide-react, Docker Compose

---

## File Structure

```
carebot/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, startup
│   │   ├── config.py               # Settings from env
│   │   ├── database.py             # PostgreSQL pool + query helper
│   │   ├── auth.py                 # JWT creation/validation, patient+staff auth
│   │   ├── routers/
│   │   │   ├── health.py           # GET /api/health
│   │   │   ├── public.py           # Clinic info, doctors, departments, booking slots
│   │   │   ├── patient_auth.py     # POST /api/auth/patient/login
│   │   │   ├── staff_auth.py       # POST /api/auth/staff/login
│   │   │   ├── patient.py          # Patient self-service APIs
│   │   │   ├── chat.py             # POST /api/patient/chat (Claude + 16 tools)
│   │   │   ├── admin_dashboard.py  # GET /api/admin/dashboard/stats
│   │   │   ├── admin_appointments.py # Appointment CRUD for staff
│   │   │   ├── admin_patients.py   # Patient management for staff
│   │   │   ├── admin_labs.py       # Lab order + result management
│   │   │   ├── admin_prescriptions.py # Prescription CRUD
│   │   │   ├── admin_doctors.py    # Doctor management
│   │   │   ├── admin_faqs.py       # FAQ CRUD
│   │   │   └── admin_audit.py      # Audit log viewer
│   │   ├── services/
│   │   │   ├── ai_engine.py        # Claude API + tool definitions + tool-use loop
│   │   │   ├── tools.py            # 16 tool function implementations
│   │   │   ├── triage.py           # Symptom triage logic + emergency detection
│   │   │   ├── scheduler.py        # Slot generation, availability check, conflict prevention
│   │   │   ├── notifications.py    # Create + send notifications
│   │   │   ├── reports.py          # PDF generation (6 report types)
│   │   │   └── audit.py            # Audit log helper
│   │   └── models/
│   │       └── schemas.py          # Pydantic request/response models
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Landing page
│   │   ├── layout.tsx              # Root layout
│   │   ├── globals.css             # Dark medical theme
│   │   ├── chat/page.tsx           # Patient AI chat
│   │   ├── portal/page.tsx         # Patient dashboard
│   │   ├── book/page.tsx           # Direct appointment booking
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Admin layout with sidebar
│   │   │   ├── page.tsx            # Admin dashboard
│   │   │   ├── appointments/page.tsx
│   │   │   ├── patients/page.tsx
│   │   │   ├── patients/[id]/page.tsx
│   │   │   ├── labs/page.tsx
│   │   │   ├── prescriptions/page.tsx
│   │   │   ├── doctors/page.tsx
│   │   │   ├── faqs/page.tsx
│   │   │   └── audit/page.tsx
│   │   └── api/
│   │       └── chat/route.ts       # Proxy to backend chat API
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── AppointmentCard.tsx
│   │   │   ├── MedicationList.tsx
│   │   │   ├── LabResultCard.tsx
│   │   │   └── EmergencyBanner.tsx
│   │   ├── admin/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   └── DataTable.tsx
│   │   └── booking/
│   │       ├── DepartmentPicker.tsx
│   │       ├── DoctorPicker.tsx
│   │       ├── SlotPicker.tsx
│   │       └── BookingConfirmation.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── hooks/
│   │       └── useChat.ts
│   ├── package.json
│   └── tailwind.config.ts
├── supabase/migrations/
│   └── 001_schema.sql
├── seed/
│   └── seed.sql
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── TESTING-GUIDE.md
├── DEMO-SCRIPT.md
└── HIPAA-COMPLIANCE-NOTES.md
```

---

## Phase 1: Infrastructure + Database + Seed Data

### Task 1: Project Scaffold

**Files:**
- Create: `carebot/.gitignore`
- Create: `carebot/.env.example`
- Create: `carebot/docker-compose.yml`

- [ ] **Step 1: Create .gitignore**

```gitignore
node_modules/
dist/
__pycache__/
*.pyc
.env
.env.local
*.log
.next/
.DS_Store
reports/generated/
.venv/
```

- [ ] **Step 2: Create .env.example**

```env
# Database
POSTGRES_USER=carebot
POSTGRES_PASSWORD=carebot_dev
POSTGRES_DB=carebot
DATABASE_URL=postgresql://carebot:carebot_dev@localhost:5432/carebot

# AI
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Backend
BACKEND_PORT=8000
JWT_SECRET=carebot-dev-secret-change-in-production
CORS_ORIGINS=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: carebot
      POSTGRES_PASSWORD: carebot_dev
      POSTGRES_DB: carebot
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U carebot"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 4: Initialize git repo and commit**

```bash
cd carebot && git init && git checkout -b main
git add .gitignore .env.example docker-compose.yml
git commit -m "feat: initialize carebot project scaffold"
```

---

### Task 2: Database Schema (17 tables)

**Files:**
- Create: `carebot/supabase/migrations/001_schema.sql`

- [ ] **Step 1: Write the complete schema**

Create all 17 tables with proper constraints, FKs, indexes, CHECK constraints, and defaults. Tables in order of dependency:

1. `clinics` — root table
2. `departments` — FK → clinics
3. `doctors` — FK → clinics, departments
4. `patients` — FK → clinics, with patient_number sequence
5. `staff` — FK → clinics
6. `appointments` — FK → clinics, patients, doctors
7. `waitlist` — FK → clinics, patients, doctors
8. `visit_notes` — FK → appointments, doctors
9. `prescriptions` — FK → patients, doctors, appointments
10. `prescription_items` — FK → prescriptions
11. `lab_orders` — FK → clinics, patients, doctors, appointments
12. `lab_results` — FK → lab_orders
13. `health_faqs` — FK → clinics
14. `notifications` — FK → clinics, patients
15. `chat_sessions` — FK → clinics, patients
16. `chat_messages` — FK → chat_sessions
17. `audit_logs` — FK → clinics (loose FK on user_id since it can be patient/doctor/staff)

Key indexes:
- `appointments(clinic_id, date)`, `appointments(doctor_id, date)`, `appointments(patient_id)`
- `lab_orders(patient_id)`, `lab_results(lab_order_id)`
- `notifications(patient_id, status)`, `notifications(scheduled_for)`
- `audit_logs(clinic_id, created_at)`, `audit_logs(patient_id)`
- `chat_sessions(patient_id)`, `chat_messages(session_id)`

Patient number: use a sequence `patient_number_seq` and format as `CH-0001`, `CH-0002`, etc. via a trigger or application-level.

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with 17 tables"
```

---

### Task 3: Seed Data — City Health Clinic

**Files:**
- Create: `carebot/seed/seed.sql`

- [ ] **Step 1: Write comprehensive seed data**

All data from the spec:

**Clinic + Departments (1 + 4):**
- City Health Clinic, Lahore, with operating_hours jsonb
- 4 departments: General Medicine, Cardiology, Dermatology, Pediatrics

**Doctors (6):** With all fields — specialization, available_days, slot_duration, start/end times, consultation_fee in PKR

**Patients (8):** With realistic Pakistani demographics, DOBs (to derive ages), allergies (text[]), chronic_conditions (text[]), blood types, emergency contacts (jsonb), insurance (jsonb)

**Staff (3):** Admin, Receptionist, Lab Technician

**Medications per patient:** All prescription + prescription_items for active patients (Hamza 2 meds, Aisha 3 meds, Tariq 3 meds, Zainab 2, Ali 2, Nadia 2, Rabia 2)

**Lab Orders + Results:**
- Hamza: CBC, HbA1c, Lipid Panel, Fasting Glucose, Creatinine (5 tests across 2 orders)
- Tariq: Lipid Panel full (Cholesterol, LDL, HDL, Triglycerides), ECG report
- Aisha: CBC (Hemoglobin), Blood Group, OGTT, Platelet count

**Appointments (30):**
- 20 completed (past 2 months) with visit_notes for each
- 5 scheduled (next 2 weeks)
- 3 cancelled (with cancellation_reason)
- 2 no-shows

**Visit Notes (20):** One for each completed appointment — chief_complaint, examination_findings, diagnosis, treatment_plan, follow_up_instructions, follow_up_days

**Health FAQs (40):** 10 General, 8 Diabetes, 6 Heart, 6 Pregnancy, 4 Pediatrics, 3 Skin, 3 Mental Health. Each with question, answer (2-4 sentences), source.

**Notifications (16):**
- 10 appointment reminders (sent)
- 3 lab_results_ready (sent)
- 2 follow_up_reminder (sent)
- 1 critical_lab_alert (sent, for Tariq's LDL)

**Audit Logs (10):** Sample entries for appointments booked, labs viewed, chat sessions

Use fixed UUIDs for main entities (clinic, doctors, patients) so they're referenceable. Use `ON CONFLICT DO NOTHING` for idempotent re-runs.

- [ ] **Step 2: Commit**

```bash
git add seed/
git commit -m "feat: add seed data — City Health Clinic with 8 patients, 6 doctors, 30 appointments, labs, prescriptions"
```

---

## Phase 2: Backend Core APIs

### Task 4: FastAPI Skeleton + Database Connection

**Files:**
- Create: `carebot/backend/requirements.txt`
- Create: `carebot/backend/app/main.py`
- Create: `carebot/backend/app/config.py`
- Create: `carebot/backend/app/database.py`
- Create: `carebot/backend/app/auth.py`
- Create: `carebot/backend/app/models/schemas.py`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
asyncpg==0.30.0
pyjwt==2.9.0
anthropic==0.42.0
python-multipart==0.0.12
pydantic==2.10.0
python-dotenv==1.0.1
```

- [ ] **Step 2: Create config.py** — Settings class reading from env vars

- [ ] **Step 3: Create database.py** — asyncpg pool with `get_pool()`, `query()`, `query_one()`, `execute()` helpers

- [ ] **Step 4: Create auth.py** — JWT encode/decode, `create_token(user_id, role)`, `verify_token()`, FastAPI dependencies `get_current_patient()`, `get_current_staff()`

- [ ] **Step 5: Create schemas.py** — All Pydantic models for request/response bodies across all endpoints

- [ ] **Step 6: Create main.py** — FastAPI app with CORS, lifespan (pool init/close), health check router

- [ ] **Step 7: Verify server starts**

```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Visit http://localhost:8000/api/health → {"status": "ok"}
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: FastAPI skeleton with database, auth, and health check"
```

---

### Task 5: Public APIs + Patient Auth

**Files:**
- Create: `carebot/backend/app/routers/public.py`
- Create: `carebot/backend/app/routers/patient_auth.py`
- Create: `carebot/backend/app/services/scheduler.py`

- [ ] **Step 1: Create public.py** — 4 endpoints:
- `GET /api/clinic/info` → clinic name, address, phone, hours, departments
- `GET /api/clinic/doctors` → public doctor list (name, specialization, bio, photo, fee)
- `GET /api/clinic/departments` → department list
- `GET /api/booking/slots?doctor_id=&date=` → available time slots for a doctor on a date

- [ ] **Step 2: Create scheduler.py** — Slot generation logic:
- Given a doctor (slots_start, slots_end, slot_duration_min, available_days)
- Generate all slots for a given date
- Subtract already-booked appointments
- Return available slots as list of time strings

- [ ] **Step 3: Create patient_auth.py** — `POST /api/auth/patient/login`
- Body: `{email, date_of_birth}`
- Look up patient by email + DOB in same clinic
- Return JWT token with patient_id + clinic_id

- [ ] **Step 4: Test with curl**

```bash
# Get clinic info
curl http://localhost:8000/api/clinic/info

# Get doctors
curl http://localhost:8000/api/clinic/doctors

# Get available slots
curl "http://localhost:8000/api/booking/slots?doctor_id=<uuid>&date=2026-08-01"

# Patient login
curl -X POST http://localhost:8000/api/auth/patient/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hamza@email.com","date_of_birth":"1981-03-15"}'
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add public APIs (clinic info, doctors, slots) and patient auth"
```

---

### Task 6: Patient Self-Service APIs

**Files:**
- Create: `carebot/backend/app/routers/patient.py`
- Create: `carebot/backend/app/services/audit.py`

- [ ] **Step 1: Create audit.py** — `log_audit(clinic_id, user_type, user_id, action, resource, resource_id, details, ip)` → inserts into audit_logs

- [ ] **Step 2: Create patient.py** — All patient endpoints (require JWT with patient role):
- `GET /api/patient/profile` → own demographics, medical history
- `PATCH /api/patient/profile` → update phone, email, address only
- `GET /api/patient/appointments` → own appointments (upcoming + past, sorted)
- `POST /api/patient/appointments` → book appointment (doctor_id, date, time_slot, reason)
  - Validate: slot available, not double-booked, within hours, doctor available that day
  - Create appointment with status=scheduled
  - Create notification (confirmation)
  - Log audit
- `PATCH /api/patient/appointments/:id/cancel` → cancel own appointment (with reason)
  - Only if status is scheduled/confirmed
  - Log audit
- `GET /api/patient/medications` → active prescriptions + items
- `GET /api/patient/lab-results` → all lab results with order info
- `GET /api/patient/chat/history` → past chat sessions + messages

- [ ] **Step 3: Test all patient endpoints with curl using the JWT from login**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add patient self-service APIs (profile, appointments, meds, labs)"
```

---

### Task 7: Staff Auth + Admin APIs (Appointments, Patients, Dashboard)

**Files:**
- Create: `carebot/backend/app/routers/staff_auth.py`
- Create: `carebot/backend/app/routers/admin_dashboard.py`
- Create: `carebot/backend/app/routers/admin_appointments.py`
- Create: `carebot/backend/app/routers/admin_patients.py`

- [ ] **Step 1: Create staff_auth.py** — `POST /api/auth/staff/login` (email + password, simple bcrypt check or plain for demo)

- [ ] **Step 2: Create admin_dashboard.py** — `GET /api/admin/dashboard/stats`
Returns all business metrics:
- appointments_today, appointments_this_week, appointments_this_month
- revenue_today, revenue_this_month (sum of consultation_fee for completed appointments)
- no_show_rate (no_shows / total * 100)
- cancellation_rate
- doctor_utilization (per doctor: filled_slots / total_slots * 100)
- new_patients_this_month
- chat_sessions_today, escalation_rate
- department_breakdown (appointments by department)

- [ ] **Step 3: Create admin_appointments.py**
- `GET /api/admin/appointments` → all appointments, filterable by doctor_id, date, status
- `PATCH /api/admin/appointments/:id` → update status (check_in, in_progress, completed, no_show), add visit_notes

- [ ] **Step 4: Create admin_patients.py**
- `GET /api/admin/patients` → patient list with search (name, phone, email, patient_number)
- `GET /api/admin/patients/:id` → full patient record: demographics + appointments + meds + labs + timeline
- `POST /api/admin/patients` → register new patient

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add staff auth, admin dashboard stats, appointment and patient management APIs"
```

---

### Task 8: Admin APIs (Labs, Prescriptions, Doctors, FAQs, Audit)

**Files:**
- Create: `carebot/backend/app/routers/admin_labs.py`
- Create: `carebot/backend/app/routers/admin_prescriptions.py`
- Create: `carebot/backend/app/routers/admin_doctors.py`
- Create: `carebot/backend/app/routers/admin_faqs.py`
- Create: `carebot/backend/app/routers/admin_audit.py`

- [ ] **Step 1: Create admin_labs.py**
- `GET /api/admin/labs` → lab orders list with results, filterable by status, patient
- `POST /api/admin/labs` → create lab order (patient_id, doctor_id, test_panel, priority)
- `PATCH /api/admin/labs/:id` → update status, enter results
  - When status → completed: auto-create notification (lab_results_ready)
  - When any result is critical: create critical_lab_alert notification for doctor

- [ ] **Step 2: Create admin_prescriptions.py**
- `GET /api/admin/prescriptions` → prescription list with items
- `POST /api/admin/prescriptions` → create prescription + items (doctor only)
  - Allergy check: compare drug names against patient.allergies → return warning if match
- `PATCH /api/admin/prescriptions/:id` → update status (active/completed/cancelled)

- [ ] **Step 3: Create admin_doctors.py**
- `GET /api/admin/doctors` → doctor list
- `POST /api/admin/doctors` → add doctor (admin only)
- `PATCH /api/admin/doctors/:id` → update doctor info, availability, fee

- [ ] **Step 4: Create admin_faqs.py**
- `GET /api/admin/faqs` → FAQ list by category
- `POST /api/admin/faqs` → add FAQ
- `PATCH /api/admin/faqs/:id` → edit FAQ
- `DELETE /api/admin/faqs/:id` → delete FAQ (admin only)

- [ ] **Step 5: Create admin_audit.py**
- `GET /api/admin/audit` → audit logs, filterable by action, user_type, resource, date range. Paginated (limit/offset).

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add admin APIs for labs, prescriptions, doctors, FAQs, audit"
```

---

## Phase 3: AI Chat Engine with 16 Tools

### Task 9: AI Engine + Tool Functions

**Files:**
- Create: `carebot/backend/app/services/ai_engine.py`
- Create: `carebot/backend/app/services/tools.py`
- Create: `carebot/backend/app/services/triage.py`
- Create: `carebot/backend/app/routers/chat.py`

- [ ] **Step 1: Create triage.py** — Emergency detection + symptom classification

```python
EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "difficulty breathing", "heart attack",
    "severe bleeding", "unconscious", "seizure", "stroke",
    "suicidal", "want to die", "self-harm", "overdose",
    "choking", "allergic reaction", "anaphylaxis",
    "severe head injury", "loss of consciousness",
]

def detect_emergency(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in EMERGENCY_KEYWORDS)
```

- [ ] **Step 2: Create tools.py** — 16 tool functions, each is an async function that queries the database:

1. `triage_symptoms(patient_id, symptoms, duration, severity)` → urgency, department, reasoning, disclaimer
2. `book_appointment(patient_id, clinic_id, doctor_id, date, time_slot, reason)` → validates + creates
3. `reschedule_appointment(patient_id, appointment_id, new_date, new_time_slot)` → cancels old, creates new
4. `cancel_appointment(patient_id, appointment_id, reason)` → updates status
5. `get_my_appointments(patient_id)` → upcoming + recent
6. `get_my_profile(patient_id)` → demographics, conditions, allergies
7. `update_my_contact(patient_id, phone?, email?, address?)` → update non-medical fields
8. `get_my_medications(patient_id)` → active prescriptions + items
9. `get_my_lab_results(patient_id, recent_count=5)` → recent results with status
10. `explain_lab_results(patient_id, lab_order_id)` → AI-friendly summary of results
11. `get_doctors(clinic_id, department?)` → doctor list
12. `get_clinic_info(clinic_id)` → hours, address, phone
13. `search_health_faq(clinic_id, query)` → ILIKE search on question + answer
14. `request_prescription_refill(patient_id, prescription_id)` → creates notification for doctor
15. `request_lab_report_pdf(patient_id, lab_order_id)` → returns download URL
16. `escalate_to_staff(clinic_id, patient_id, reason)` → creates notification + audit log

Each tool function returns a dict that gets JSON-serialized as the tool result.

- [ ] **Step 3: Create ai_engine.py** — Claude API integration:
- System prompt with all safety guardrails
- Tool definitions (Anthropic format) for all 16 tools
- `chat(patient_id, clinic_id, messages)` → runs Claude with tool-use loop
- Emergency pre-check: before calling Claude, check patient message for emergency keywords → if found, return emergency response immediately

- [ ] **Step 4: Create chat.py router** — `POST /api/patient/chat`
- Requires patient auth
- Body: `{message: string}`
- Creates/continues chat_session
- Saves user message to chat_messages
- Calls ai_engine.chat()
- Saves assistant response to chat_messages
- Updates session metadata (message_count, tools_used)
- Logs to audit
- Returns response content

- [ ] **Step 5: Test chat end-to-end with curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/patient/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hamza@email.com","date_of_birth":"1981-03-15"}' | jq -r .token)

# Symptom triage
curl -X POST http://localhost:8000/api/patient/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"I have been having headaches for 3 days and my vision is blurry"}'

# Check medications
curl -X POST http://localhost:8000/api/patient/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"What medications am I currently taking?"}'

# Emergency detection
curl -X POST http://localhost:8000/api/patient/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"I am having severe chest pain and cannot breathe"}'
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: AI chat engine with 16 tools, symptom triage, emergency detection, and safety guardrails"
```

---

## Phase 4: Frontend — Patient-Facing Pages

### Task 10: Next.js Setup + Landing Page

**Files:**
- Create: `carebot/frontend/` (via create-next-app)
- Create: `carebot/frontend/app/page.tsx` (landing page)
- Create: `carebot/frontend/app/globals.css` (medical dark theme)
- Create: `carebot/frontend/lib/api.ts`

- [ ] **Step 1: Initialize Next.js 14**

```bash
npx create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-git --use-npm
cd frontend && npm install lucide-react chart.js react-chartjs-2
npx shadcn@latest init -d
npx shadcn@latest add button card input textarea badge table tabs scroll-area separator dialog dropdown-menu
```

- [ ] **Step 2: Create medical dark theme (globals.css)**
Deep navy + teal/cyan primary (healthcare feel, distinct from FinancePal's emerald):
- Background: `220 50% 4%`
- Primary: `185 70% 45%` (medical teal)
- Card: `220 45% 7%`
- Destructive: red for critical/emergency

- [ ] **Step 3: Create landing page** — Clinic name, "Chat with CareBot" CTA button, feature highlights (AI Triage, Book Appointments, View Labs, 24/7 Support), trust signals (HIPAA-aware, audit logging)

- [ ] **Step 4: Create api.ts helper** — `apiFetch()` with auth header injection

- [ ] **Step 5: Build and verify**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: Next.js frontend with medical dark theme and landing page"
```

---

### Task 11: Patient Chat Interface

**Files:**
- Create: `carebot/frontend/app/chat/page.tsx`
- Create: `carebot/frontend/lib/hooks/useChat.ts`
- Create: `carebot/frontend/components/chat/ChatWindow.tsx`
- Create: `carebot/frontend/components/chat/MessageBubble.tsx`
- Create: `carebot/frontend/components/chat/AppointmentCard.tsx`
- Create: `carebot/frontend/components/chat/MedicationList.tsx`
- Create: `carebot/frontend/components/chat/LabResultCard.tsx`
- Create: `carebot/frontend/components/chat/EmergencyBanner.tsx`

- [ ] **Step 1: Create useChat.ts** — Hook managing messages, loading, API calls. Parses tool results to show inline cards (appointments, medications, lab results).

- [ ] **Step 2: Create chat components:**
- `ChatWindow.tsx` — Full chat UI with patient login (email+DOB), starter questions ("Check my symptoms", "Book appointment", "View medications", "View lab results", "Health question"), message list, input
- `MessageBubble.tsx` — User/assistant messages with proper styling
- `AppointmentCard.tsx` — Inline card showing booked appointment (doctor, date, time, status) with cancel button
- `MedicationList.tsx` — Inline medication display (drug, dosage, frequency, instructions)
- `LabResultCard.tsx` — Lab result with value, reference range, color-coded status badge
- `EmergencyBanner.tsx` — Full-width red banner: "EMERGENCY: Call 1122 or go to nearest ER immediately"

- [ ] **Step 3: Create chat/page.tsx** — Login gate → chat window

- [ ] **Step 4: Build and commit**

```bash
git commit -m "feat: patient chat interface with inline cards, emergency detection, and login"
```

---

### Task 12: Patient Portal + Booking Page

**Files:**
- Create: `carebot/frontend/app/portal/page.tsx`
- Create: `carebot/frontend/app/book/page.tsx`
- Create: `carebot/frontend/components/booking/DepartmentPicker.tsx`
- Create: `carebot/frontend/components/booking/DoctorPicker.tsx`
- Create: `carebot/frontend/components/booking/SlotPicker.tsx`
- Create: `carebot/frontend/components/booking/BookingConfirmation.tsx`

- [ ] **Step 1: Create portal/page.tsx** — Patient dashboard (requires login):
- 3 summary cards: upcoming appointments count, active medications count, recent lab results count
- Upcoming appointments list with status badges
- Active medications with dosage schedule
- Recent lab results with normal/abnormal badges
- Visit history table

- [ ] **Step 2: Create booking flow** (4-step wizard, no AI needed):
1. `DepartmentPicker` — Select department (General Medicine, Cardiology, etc.)
2. `DoctorPicker` — See available doctors in that department with bio, fee, availability
3. `SlotPicker` — Calendar date picker → available time slots for selected doctor
4. `BookingConfirmation` — Review (doctor, date, time, fee) → confirm → success message

- [ ] **Step 3: Create book/page.tsx** — Hosts the 4-step wizard

- [ ] **Step 4: Build and commit**

```bash
git commit -m "feat: patient portal dashboard and 4-step appointment booking flow"
```

---

## Phase 5: Frontend — Admin Pages

### Task 13: Admin Layout + Dashboard

**Files:**
- Create: `carebot/frontend/app/admin/layout.tsx`
- Create: `carebot/frontend/components/admin/Sidebar.tsx`
- Create: `carebot/frontend/app/admin/page.tsx`
- Create: `carebot/frontend/components/admin/StatsCards.tsx`

- [ ] **Step 1: Create admin Sidebar.tsx** — Navigation: Dashboard, Appointments, Patients, Labs, Prescriptions, Doctors, FAQs, Audit Log. Medical teal active state. CareBot logo with stethoscope icon.

- [ ] **Step 2: Create admin layout.tsx** — Sidebar + main content area. Staff login gate.

- [ ] **Step 3: Create admin dashboard page** —
- 4 top-level stat cards: Appointments Today, Revenue This Month, No-Show Rate, Active Patients
- Charts: appointments by department (bar), weekly appointment trend (line), status breakdown (pie)
- Recent activity feed: latest 10 appointments, lab results, chat escalations
- Doctor utilization table: each doctor's % slots filled today

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: admin layout with sidebar, dashboard stats, and charts"
```

---

### Task 14: Admin Appointments + Patient Management Pages

**Files:**
- Create: `carebot/frontend/app/admin/appointments/page.tsx`
- Create: `carebot/frontend/app/admin/patients/page.tsx`
- Create: `carebot/frontend/app/admin/patients/[id]/page.tsx`

- [ ] **Step 1: Create appointments page** —
- Toggle: Calendar view (daily timeline by doctor) / List view (table)
- Filters: date picker, doctor dropdown, status tabs (All/Scheduled/Confirmed/Completed/No-Show/Cancelled)
- Each appointment row: patient name, doctor, time, reason, status badge
- Actions: Check-In, Mark Complete, Mark No-Show, Cancel, Reschedule
- Click appointment → side panel with visit notes form

- [ ] **Step 2: Create patients list page** —
- Search bar (name, phone, email, patient number)
- Table: patient number, name, phone, conditions, last visit, upcoming appointment
- "Add Patient" button → modal form

- [ ] **Step 3: Create patient detail page** —
- Header: patient info (name, age, gender, blood type, allergies, conditions)
- Tabs: Timeline | Appointments | Medications | Lab Results | Documents
- Timeline: chronological list of all events (appointments, lab results, prescriptions)
- Each tab has the relevant data table

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: admin appointment management and patient detail pages"
```

---

### Task 15: Admin Labs, Prescriptions, Doctors, FAQs, Audit Pages

**Files:**
- Create: `carebot/frontend/app/admin/labs/page.tsx`
- Create: `carebot/frontend/app/admin/prescriptions/page.tsx`
- Create: `carebot/frontend/app/admin/doctors/page.tsx`
- Create: `carebot/frontend/app/admin/faqs/page.tsx`
- Create: `carebot/frontend/app/admin/audit/page.tsx`

- [ ] **Step 1: Create labs page** —
- Lab orders table: patient, test panel, priority (badge), status (color-coded: ordered→yellow, processing→blue, completed→green, critical→red), dates
- Status filter tabs
- Click order → expand: individual test results with values, reference ranges, status badges
- "New Lab Order" button → form (select patient, doctor, test panel, priority)
- "Enter Results" button for processing orders → result entry form (test name, value, unit, range, status)

- [ ] **Step 2: Create prescriptions page** —
- Prescription table: patient, doctor, date, status, medication count
- Click → expand: medication items (drug, dosage, frequency, duration, instructions)
- "New Prescription" form: select patient → add medication rows → save
- Refill requests section (if any from patient chat)

- [ ] **Step 3: Create doctors page** —
- Doctor cards grid: photo placeholder, name, department, specialization, fee, availability
- "Add Doctor" button → form
- Edit button → inline edit

- [ ] **Step 4: Create FAQs page** —
- FAQ list grouped by category
- Each FAQ: question, answer (truncated), source, edit/delete buttons
- "Add FAQ" button → form with category dropdown, question, answer, source

- [ ] **Step 5: Create audit page** —
- Full-width table: timestamp, user type (badge), action, resource, details (expandable), IP
- Filters: date range, user type, action type, resource type
- Sortable by timestamp (desc default)

- [ ] **Step 6: Build all admin pages and commit**

```bash
npm run build
git commit -m "feat: admin pages for labs, prescriptions, doctors, FAQs, and audit log"
```

---

## Phase 6: Notifications + PDF Reports

### Task 16: Notification System

**Files:**
- Create: `carebot/backend/app/services/notifications.py`

- [ ] **Step 1: Create notifications.py**

```python
async def create_notification(
    clinic_id: str, patient_id: str, type: str, channel: str,
    subject: str, body: str, scheduled_for: datetime | None = None
) -> str:
    """Insert notification into DB. For demo, status='sent' immediately.
    In production, a background worker would process 'pending' notifications
    via Twilio (SMS) and Resend (email)."""
```

Notification templates:
- `appointment_confirmation`: "Your appointment with {doctor} on {date} at {time} is confirmed."
- `appointment_reminder_24h`: "Reminder: You have an appointment with {doctor} tomorrow at {time}."
- `appointment_reminder_2h`: "Your appointment with {doctor} is in 2 hours."
- `appointment_cancelled`: "Your appointment on {date} has been cancelled."
- `lab_results_ready`: "Your lab results for {test_panel} are ready. View in your portal."
- `critical_lab_alert`: "URGENT: Critical lab value for patient {patient_name}. Please review."
- `follow_up_reminder`: "Dr. {doctor} recommended a follow-up. Book at {link}."
- `prescription_refill`: "Patient {patient_name} has requested a refill for {drug_name}."

- [ ] **Step 2: Wire notifications into existing endpoints**
- `patient.py: book_appointment()` → create confirmation + schedule reminders
- `admin_labs.py: update_lab_order()` → when completed, notify patient. If critical, alert doctor.
- `admin_appointments.py: update_status()` → when completed with follow_up_days, schedule follow-up reminder

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: notification system with 8 templates, auto-triggered on appointments and labs"
```

---

### Task 17: PDF Report Generation

**Files:**
- Create: `carebot/backend/app/services/reports.py`
- Add endpoint: `GET /api/patient/lab-results/:id/pdf`
- Add endpoint: `GET /api/admin/prescriptions/:id/pdf`

- [ ] **Step 1: Create reports.py** — HTML template → PDF generation using simple HTML strings (no external template engine needed for demo):

```python
def generate_lab_report_pdf(clinic, patient, lab_order, results) -> bytes:
    """Generate lab report as PDF bytes.
    Uses a simple HTML template rendered to PDF via weasyprint or returned as HTML for demo."""
```

PDF templates:
1. **Lab Report** — Clinic header (name, address, phone), patient info (name, age, gender, patient#), test date, results table (test, value, unit, range, status), doctor signature line
2. **Prescription** — Clinic header, patient info, Rx symbol, medication table (drug, dosage, frequency, duration, instructions), doctor name + signature, date
3. **Visit Summary** — Clinic header, appointment info (date, doctor), chief complaint, examination, diagnosis, treatment plan, follow-up
4. **Patient Summary** — Full compilation: demographics, conditions, allergies, all meds, recent labs, visit history

For the demo, generate HTML strings and return as downloadable HTML files (avoids WeasyPrint installation issues on Windows). Production would use WeasyPrint to convert to PDF.

- [ ] **Step 2: Add PDF endpoints to patient router and admin router**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: PDF report generation for lab reports, prescriptions, visit summaries"
```

---

## Phase 7: Testing + Documentation

### Task 18: End-to-End Test Script

**Files:**
- Create: `carebot/scripts/test-all.sh`

- [ ] **Step 1: Write comprehensive test script** — Tests all major flows:

```bash
# 1. Health check
# 2. Public APIs (clinic info, doctors, departments, slots)
# 3. Patient login (get JWT)
# 4. Patient APIs (profile, appointments, meds, labs)
# 5. Book appointment via API
# 6. Cancel appointment
# 7. Chat: symptom triage
# 8. Chat: check medications
# 9. Chat: emergency detection
# 10. Chat: book via AI
# 11. Staff login
# 12. Admin dashboard stats
# 13. Admin appointments list + update
# 14. Admin create lab order
# 15. Admin enter lab results
# 16. Admin create prescription
# 17. Admin FAQs CRUD
# 18. Admin audit log
# 19. Notification creation verification
# 20. Report generation
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: automated test script with 20 endpoint tests"
```

---

### Task 19: Documentation

**Files:**
- Create: `carebot/README.md`
- Create: `carebot/TESTING-GUIDE.md`
- Create: `carebot/DEMO-SCRIPT.md`
- Create: `carebot/HIPAA-COMPLIANCE-NOTES.md`

- [ ] **Step 1: Write README.md** — Complete README with:
- What it is (complete clinic management + AI)
- Architecture diagram
- 7 modules summary
- Quick start (5 steps)
- Tech stack table
- 16 AI tools table
- API reference summary
- Seed data description
- Cost analysis

- [ ] **Step 2: Write TESTING-GUIDE.md** — Full test guide with:
- Prerequisites
- All curl commands for every endpoint
- Expected responses
- Frontend page verification checklist
- Safety guardrail tests (emergency, no-diagnosis, disclaimer)

- [ ] **Step 3: Write DEMO-SCRIPT.md** — 2-minute demo recording script:
1. Landing page (5s)
2. Patient login as Hamza (diabetic) (5s)
3. Symptom triage: "dizzy + blurry vision" → AI connects to diabetes (15s)
4. Book appointment with Dr. Khan (15s)
5. Check medications → Metformin + Lisinopril (10s)
6. View lab results → HbA1c 6.5% with AI explanation (15s)
7. Emergency test: "chest pain" → emergency banner (10s)
8. Admin dashboard → stats + charts (10s)
9. Admin appointments → calendar view (5s)
10. Admin labs → results with color coding (10s)
11. Admin audit log (5s)

- [ ] **Step 4: Write HIPAA-COMPLIANCE-NOTES.md** — What the demo does right + what production needs:
- Audit logging (done)
- Role-based access (done)
- AI guardrails (done)
- Encryption at rest (needed for production)
- BAA with providers (needed)
- PHI retention policies (needed)
- Penetration testing (needed)

- [ ] **Step 5: Commit all documentation**

```bash
git add README.md TESTING-GUIDE.md DEMO-SCRIPT.md HIPAA-COMPLIANCE-NOTES.md scripts/
git commit -m "docs: add README, testing guide, demo script, HIPAA notes"
```

---

## Summary

| Phase | Tasks | What's Working After |
|-------|-------|---------------------|
| **1** | 1-3 | PostgreSQL with 17 tables + rich seed data (8 patients, 6 doctors, 30 appointments, labs, meds, FAQs) |
| **2** | 4-8 | Full REST API: public, patient, admin endpoints. JWT auth. Audit logging. |
| **3** | 9 | AI chat with 16 tools, emergency detection, safety guardrails, symptom triage |
| **4** | 10-12 | Patient: landing page, AI chat with inline cards, portal dashboard, 4-step booking flow |
| **5** | 13-15 | Admin: dashboard with charts, appointment calendar, patient management, labs, prescriptions, doctors, FAQs, audit |
| **6** | 16-17 | Notifications (8 templates, auto-triggered) + PDF reports (4 types) |
| **7** | 18-19 | Test suite (20 tests) + full documentation |

**Total: 19 tasks across 7 phases.**
