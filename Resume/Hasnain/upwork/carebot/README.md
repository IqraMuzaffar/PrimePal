# CareBot — AI-Powered Clinic Management System

CareBot is a full-stack clinic management system where patients interact with an AI assistant (OpenAI API) to book appointments, check lab results, review prescriptions, and get symptom triage — all through natural language chat. Clinic staff manage the full operational picture through a separate admin dashboard.

---

## What It Is

- **Patient-facing AI chat** powered by OpenAI API (GPT-4o-mini) with 16 registered tools
- **Appointment booking, rescheduling, and cancellation** via chat or the booking UI
- **Lab management** — order tracking, result entry, color-coded status, and PDF download
- **Prescription tracking** — active medications and refill requests
- **Clinic admin dashboard** — real-time stats, department breakdown, doctor utilization charts
- **Full audit trail** — every AI tool call and admin action is logged

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend                    │
│  Landing · Patient Portal · Booking · Chat · Admin Dashboard│
└──────────────────────────┬─────────────────────────────────┘
                           │ REST (JSON)
┌──────────────────────────▼─────────────────────────────────┐
│               FastAPI Backend  (Python 3.12)                │
│  14 Router Modules · JWT Auth · asyncpg · Lifespan Pool     │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
┌──────────▼──────────┐        ┌──────────▼──────────┐
│  PostgreSQL 15      │        │   OpenAI API         │
│  17 Tables          │        │   16 Tools           │
│  asyncpg pool       │        │   gpt-4o-mini         │
└─────────────────────┘        └─────────────────────┘
```

---

## 7 Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | **Public APIs** | Clinic info, doctor list, department list, available slots — no auth required |
| 2 | **Patient Self-Service** | Patient login (JWT), profile, appointments, medications, lab results |
| 3 | **Staff Admin** | Staff login, admin dashboard, appointment management, patient management |
| 4 | **AI Chat** | Claude-powered conversational interface with 16 tool functions |
| 5 | **Notifications** | In-system notifications for confirmations, refills, reminders, escalations |
| 6 | **Reports** | Lab PDF reports, admin stats, revenue summaries, doctor utilization |
| 7 | **Audit** | Immutable audit log of every patient and staff action |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend language | Python 3.12 / FastAPI |
| Database | PostgreSQL 15 with asyncpg connection pool |
| Frontend | Next.js 14 (App Router) |
| AI | OpenAI API (gpt-4o-mini) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Charts | Chart.js / react-chartjs-2 |
| Auth | JWT (PyJWT) for patients, bcrypt for staff |
| Containerization | Docker Compose |

---

## Quick Start (5 steps)

### Prerequisites
- Docker + Docker Compose
- Python 3.12+
- Node.js 18+
- An OpenAI API key

### Step 1 — Clone
```bash
git clone <repo-url>
cd carebot
```

### Step 2 — Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set:
#   DATABASE_URL=postgresql://carebot:carebot@localhost:5432/carebot
#   OPENAI_API_KEY=sk-your-openai-key-here
#   SECRET_KEY=your-random-secret
```

### Step 3 — Start the database
```bash
docker-compose up -d
# This starts PostgreSQL 15 on port 5432
# Wait ~10 seconds for the DB to be ready
```

### Step 4 — Install backend and seed the database
```bash
cd backend
pip install -r requirements.txt
# Run migrations (creates all 17 tables)
psql postgresql://carebot:carebot@localhost:5432/carebot -f ../supabase/migrations/*.sql
# Load seed data (8 patients, 6 doctors, 30 appointments, lab results)
psql postgresql://carebot:carebot@localhost:5432/carebot -f ../seed/seed.sql
cd ..
```

### Step 5 — Start backend and frontend
```bash
# Terminal 1: backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: frontend
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 16 AI Tools

The Claude agent has access to 16 tool functions. All are async and return structured JSON.

| # | Tool Name | Description |
|---|-----------|-------------|
| 1 | `triage_symptoms` | Assess symptoms, suggest department and urgency level; includes patient allergy/condition context |
| 2 | `book_appointment` | Book a new appointment with a doctor at a validated time slot |
| 3 | `reschedule_appointment` | Cancel an existing appointment and create a new one with the same doctor |
| 4 | `cancel_appointment` | Cancel an appointment with a reason |
| 5 | `get_my_appointments` | Return upcoming and recent appointments for the logged-in patient |
| 6 | `get_my_profile` | Return the patient's full profile (blood type, allergies, chronic conditions, insurance) |
| 7 | `update_my_contact` | Update phone, email, or address fields for the patient |
| 8 | `get_my_medications` | Return active prescriptions with drug name, dosage, frequency, and instructions |
| 9 | `get_my_lab_results` | Return recent lab orders with test results and normal/abnormal flags |
| 10 | `explain_lab_results` | Fetch a specific lab order and format results so Claude can explain them in plain language |
| 11 | `get_doctors` | List doctors at the clinic, optionally filtered by department; includes next available slot |
| 12 | `get_clinic_info` | Return clinic name, address, hours, phone, and department list |
| 13 | `search_health_faq` | Keyword search across the clinic's curated health FAQ database |
| 14 | `request_prescription_refill` | Submit a refill request for an active prescription; notifies the prescribing doctor |
| 15 | `request_lab_report_pdf` | Return the download URL for a completed lab report PDF |
| 16 | `escalate_to_staff` | Create a staff notification and audit log entry for urgent patient concerns |

---

## API Summary

| Category | Endpoints |
|----------|-----------|
| Health check | 1 |
| Public (clinic info, doctors, slots) | 4 |
| Patient auth (register, login, refresh) | 3 |
| Patient self-service (profile, appointments, labs, meds) | 8 |
| Staff auth (login) | 1 |
| Admin dashboard | 1 |
| Admin appointments | 4 |
| Admin patients | 4 |
| Admin labs | 5 |
| Admin prescriptions | 4 |
| Admin doctors | 4 |
| Admin FAQs | 4 |
| Admin audit log | 2 |
| AI chat | 1 |
| **Total** | **46** |

---

## Database — 17 Tables

| Table | Purpose |
|-------|---------|
| `clinics` | Clinic profile and operating hours |
| `departments` | Specialization departments (General Medicine, Cardiology, Dermatology, Pediatrics) |
| `doctors` | Doctor profiles, scheduling config, fees |
| `patients` | Patient demographics, allergies, chronic conditions |
| `staff` | Admin/receptionist/lab technician accounts |
| `appointments` | All appointment records with status lifecycle |
| `chat_sessions` | Chat session tracking per patient |
| `chat_messages` | Full conversation history including tool calls |
| `prescriptions` | Prescription headers per doctor visit |
| `prescription_items` | Individual drug lines per prescription |
| `lab_orders` | Lab test orders |
| `lab_results` | Individual test results with reference ranges and normal/abnormal flag |
| `notifications` | In-system notifications (appointment, refill, escalation) |
| `health_faqs` | Clinic-curated health FAQ content |
| `audit_logs` | Immutable action audit trail |
| `doctor_schedules` | Override/exception schedule entries |
| `departments` | (see above) |

---

## Seed Data

Running `seed/seed.sql` loads a realistic dataset for City Health Clinic, Lahore:

| Entity | Count | Notes |
|--------|-------|-------|
| Clinics | 1 | City Health Clinic, Gulberg III, Lahore |
| Departments | 4 | General Medicine, Cardiology, Dermatology, Pediatrics |
| Doctors | 6 | Dr. Ahmed Khan, Dr. Fatima Naz, Dr. Omar Rashid, Dr. Ayesha Malik, Dr. Hassan Ali, Dr. Sana Iqbal |
| Patients | 8 | Hamza Tariq (diabetes/hypertension), Aisha Bibi, Tariq Mehmood, and 5 others |
| Staff accounts | 3 | admin@carebot.pk, reception@carebot.pk, lab@carebot.pk |
| Appointments | 30 | 20 completed, 5 scheduled, 3 cancelled, 2 no-show |
| Prescriptions | Several | Hamza has Metformin + Lisinopril (active) |
| Lab orders | Several | Hamza HbA1c = 6.5%, lipid panel |
| Health FAQs | Several | Diabetes, hypertension, general health topics |

**Demo login — patient:** `hamza@email.com` / `Test1234`
**Demo login — admin:** `admin@carebot.pk` / `Admin1234`

---

## Screenshots / Demo Pages

| Page | Route |
|------|-------|
| Landing page | `http://localhost:3000` |
| Patient portal login | `http://localhost:3000/portal` |
| AI chat | `http://localhost:3000/chat` |
| Appointment booking | `http://localhost:3000/book` |
| Admin dashboard | `http://localhost:3000/admin` |
| Admin appointments | `http://localhost:3000/admin/appointments` |
| Admin lab management | `http://localhost:3000/admin/labs` |
| Admin audit log | `http://localhost:3000/admin/audit` |

See `DEMO-SCRIPT.md` for a guided 2-minute walkthrough.

---

## Project Structure

```
carebot/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + router registration
│   │   ├── auth.py           # JWT helpers for patient + staff
│   │   ├── config.py         # Environment settings (pydantic-settings)
│   │   ├── database.py       # asyncpg pool, query/execute helpers
│   │   ├── models/schemas.py # Pydantic request/response models
│   │   ├── routers/          # 14 router modules
│   │   └── services/
│   │       ├── ai_engine.py  # OpenAI API integration
│   │       ├── tools.py      # 16 AI tool implementations
│   │       ├── triage.py     # Symptom → department mapping
│   │       ├── audit.py      # Audit log helper
│   │       ├── notifications.py
│   │       └── scheduler.py  # Slot generation
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # UI components (chat, booking, admin)
│   └── lib/                  # API client, auth utilities
├── seed/seed.sql             # Demo data
├── supabase/                 # SQL migrations (17 tables)
├── docs/                     # Edge cases and validation rules
└── docker-compose.yml        # PostgreSQL service
```
