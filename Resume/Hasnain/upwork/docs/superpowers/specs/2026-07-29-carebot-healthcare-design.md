# CareBot — AI-Powered Clinic Management System

## What This Actually Is

Not a chatbot demo. A **complete clinic management platform** that a real healthcare practice would pay $500-2000/month to use. AI is the differentiator, but the system handles the full operational workflow a clinic needs.

**The core problem:** Small-to-medium clinics (5-50 doctors) run on chaos — paper forms, phone tag for appointments, lab results lost in email, no-shows eating revenue, front desk overwhelmed. Existing EHR systems (Epic, Cerner) cost $50K+ and are built for hospitals, not a 10-doctor clinic.

**The solution:** One platform that handles appointments, patient records, lab management, notifications, reports, and billing — with AI that actually makes the staff's life easier (not just a chatbot skin).

---

## The 7 Modules

### Module 1: Appointment Management System

This is the core revenue driver for any clinic. Every missed appointment = lost revenue.

**Booking Engine:**
- Online booking page (patients self-serve — no phone call needed)
- Doctor availability calendar with real-time slot management
- Slot types: Regular (20 min), Extended (40 min), Follow-up (10 min), Emergency (walk-in)
- Multi-doctor scheduling — patient picks department first, then doctor, then time
- Recurring appointments (e.g., weekly physiotherapy, monthly checkup)
- Waitlist: if preferred slot is full, patient joins waitlist → auto-notified when slot opens
- Buffer time between appointments (configurable: 5/10/15 min)
- Blocked slots: doctors can block time for lunch, surgery, personal

**Calendar Views:**
- Doctor's daily view: timeline with patient names, reasons, status
- Clinic-wide weekly view: all doctors, all slots, color-coded by status
- Patient history view: all past + upcoming appointments for a patient

**Status Workflow:**
```
Scheduled → Confirmed (patient confirmed via SMS/email)
         → Checked-In (patient arrived at clinic)
         → In-Progress (with doctor)
         → Completed (visit done)
         → No-Show (didn't arrive, no cancellation)
         → Cancelled (patient or clinic cancelled)
         → Rescheduled (moved to new slot)
```

**Conflict Prevention:**
- No double-booking same doctor/slot
- No booking outside operating hours
- No booking on doctor's off-days
- Grace period for cancellation (configurable: 2hr/4hr/24hr)

**AI Enhancement:**
- When patient books via chat, AI suggests the right department based on symptoms
- AI predicts no-show risk based on patient history (has cancelled 3 of last 5 → flag)
- Smart scheduling: AI suggests optimal time based on doctor workload balance

---

### Module 2: Patient Records Management

Not a full EHR — but everything a small clinic needs to track patients.

**Patient Profile:**
- Demographics: name, DOB, gender, phone, email, address, emergency contact
- Medical history: chronic conditions, allergies, blood type, past surgeries
- Insurance info: provider, policy number, coverage type
- Visit history: every appointment with date, doctor, reason, notes, diagnosis
- Documents: uploaded files (scans, referral letters, insurance cards)

**Visit Notes (per appointment):**
- Doctor fills in after each visit:
  - Chief complaint (what patient came for)
  - Examination findings
  - Diagnosis (ICD-10 codes optional for demo, free text primary)
  - Treatment plan
  - Prescriptions issued
  - Follow-up instructions
  - Next appointment recommendation

**Patient Timeline:**
A chronological view of everything:
```
2026-07-29  Lab Result: HbA1c 6.5% (borderline)
2026-07-25  Appointment: Dr. Ayesha Khan — Diabetes follow-up
2026-07-25  Prescription: Metformin 500mg increased to 1000mg
2026-07-20  Lab Order: HbA1c, Fasting Glucose, Lipid Panel
2026-07-10  Appointment: Dr. Ayesha Khan — Annual checkup
2026-07-10  Prescription: Metformin 500mg, Lisinopril 10mg
```

**Search & Filter:**
- Search patients by name, phone, email, patient ID
- Filter by: doctor, department, date range, condition, upcoming appointments

---

### Module 3: Lab & Diagnostic Management

Clinics either have in-house labs or send to external labs. Either way, they need to track orders and results.

**Lab Order Workflow:**
```
Doctor orders test → Lab order created (status: ordered)
                  → Sample collected (status: collected)
                  → Sent to lab (status: processing)
                  → Results received (status: completed)
                  → Doctor reviews (status: reviewed)
                  → Patient notified (status: delivered)
```

**Lab Order:**
- Ordered by (doctor), ordered for (patient)
- Test panel: CBC, Lipid Panel, HbA1c, Thyroid Panel, Urinalysis, etc.
- Individual tests within panel (e.g., CBC → WBC, RBC, Hemoglobin, Hematocrit, Platelets)
- Priority: Routine / Urgent / STAT
- Notes for lab technician
- Collection date, result date

**Lab Results:**
- Each test: name, value, unit, reference range, status (normal/abnormal/critical)
- Abnormal values highlighted in red
- Critical values trigger alert to doctor + patient notification
- Historical trend: show same test over time as a chart (e.g., HbA1c over 12 months)

**Lab Report PDF:**
- Auto-generated PDF with clinic letterhead
- Patient info, test date, results table, reference ranges
- Doctor's signature line
- Downloadable by patient and doctor

**AI Enhancement:**
- AI summarizes lab results in plain English: "Your blood sugar is slightly above normal range. Your cholesterol is high. Your kidney function is normal."
- AI flags concerning trends: "Your HbA1c has been rising over the last 3 tests (5.8 → 6.2 → 6.5). You may want to discuss this with Dr. Khan."
- When patient asks about lab results in chat, AI explains with proper medical context + disclaimers

---

### Module 4: Notification & Communication System

No-shows, missed follow-ups, and "I forgot my appointment" cost clinics thousands per month.

**Appointment Notifications (automated):**

| Trigger | Channel | Timing | Message |
|---------|---------|--------|---------|
| Appointment booked | Email + SMS | Immediate | Confirmation with date/time/doctor/location |
| Reminder | SMS | 24 hours before | "Reminder: You have an appointment with Dr. Khan tomorrow at 10:00 AM" |
| Reminder | SMS | 2 hours before | "Your appointment is in 2 hours. Reply C to confirm, R to reschedule" |
| No confirmation | SMS | 4 hours before | "We haven't heard from you. Reply C to confirm or your slot may be given to a waitlisted patient" |
| Appointment cancelled | Email | Immediate | "Your appointment has been cancelled. Book a new one at [link]" |
| Rescheduled | Email + SMS | Immediate | "Your appointment has been moved to [new date/time]" |

**Lab Notifications:**

| Trigger | Channel | Message |
|---------|---------|---------|
| Lab results ready | Email + SMS | "Your lab results are ready. View them in your patient portal or ask CareBot." |
| Critical result | SMS + Doctor alert | "URGENT: Critical lab value detected for [patient]. Please review immediately." |
| Results reviewed by doctor | Email | "Dr. Khan has reviewed your lab results. [Summary]. Book a follow-up if needed." |

**Medication Reminders:**
- Daily push/SMS reminders for active medications
- "Time to take your Metformin 500mg (morning dose with food)"
- Refill reminders: "Your Lisinopril prescription ends in 5 days. Book a follow-up to get a refill."

**Follow-up Reminders:**
- If doctor marks "follow-up in 2 weeks" → auto-reminder sent at day 12 with booking link
- Post-visit satisfaction survey (optional): "How was your visit with Dr. Khan? Rate 1-5"

**Staff Notifications:**
- New appointment booked → front desk notification
- Patient checked in → doctor notification
- Emergency escalation from AI chat → immediate alert to on-duty staff
- No-show detected → flag for follow-up call

---

### Module 5: Report & Analytics System

Clinic owners need to see how the business is running. Doctors need patient summaries.

**Clinical Reports:**

| Report | What It Shows | Who Uses It |
|--------|--------------|-------------|
| Patient Summary | Full history, meds, labs, visits for one patient | Doctor (before appointment) |
| Visit Summary | Single visit: complaint, findings, diagnosis, plan | Patient (after visit) |
| Lab Report | Test results with reference ranges | Patient + Doctor |
| Prescription Report | Current medications with dosages | Patient + Pharmacy |
| Referral Letter | Patient history + reason for referral to specialist | Doctor |
| Medical Certificate | Fit/unfit for work, with dates | Patient (for employer) |
| Discharge Summary | Inpatient/procedure summary | Patient + referring doctor |

**Each report is:**
- Auto-generated from structured data (not manual typing)
- Downloadable as PDF with clinic letterhead
- Printable
- Stored in patient's document history

**Business Analytics Dashboard:**

| Metric | What It Measures |
|--------|-----------------|
| Appointments today/week/month | Volume tracking |
| Revenue (appointments x fee) | Financial overview |
| No-show rate | Lost revenue indicator |
| Average wait time | Patient satisfaction indicator |
| Doctor utilization (% slots filled) | Capacity planning |
| Top departments by visits | Demand insight |
| New vs returning patients | Growth tracking |
| Cancellation rate | Booking friction indicator |
| AI chat usage | % of queries handled without staff |
| Escalation rate | How often AI hands off to human |
| Patient satisfaction (if survey enabled) | Quality indicator |
| Lab turnaround time | Lab efficiency |

**Charts:**
- Line chart: appointments per week (trend over 3 months)
- Bar chart: appointments by department
- Pie chart: appointment status breakdown (completed/no-show/cancelled)
- Bar chart: revenue by doctor
- Line chart: patient lab value trends (per patient)

---

### Module 6: Prescription & Medication Management

**Prescription Creation (by doctor):**
- Select patient → add medications
- Each medication: drug name, dosage, frequency, duration, instructions
- Drug interaction warning (AI-powered): "Warning: Aspirin + Warfarin may increase bleeding risk"
- Allergy check: if patient has allergy listed, flag it
- Digital signature
- Generate prescription PDF

**Medication Tracking (patient-facing):**
- Current medications with dosage schedule
- "Morning: Metformin 500mg (with food), Lisinopril 10mg"
- "Evening: Metformin 500mg (with food)"
- Refill countdown: "12 days remaining on Metformin"
- Adherence tracking (optional): patient marks "taken" → adherence % shown

**AI in Medication:**
- Patient asks "what are my medications?" → AI lists them with plain-English instructions
- Patient asks "can I take ibuprofen with my current meds?" → AI gives general guidance + "ask your doctor" disclaimer
- Patient asks "I missed my morning dose" → AI gives general guidance (don't double up, take when remembered if not close to next dose)

---

### Module 7: AI Chat Assistant (ties everything together)

This is the patient-facing AI that connects all 6 modules above via tool calls.

**16 AI Tools:**

| # | Tool | Connects To |
|---|------|------------|
| 1 | `triage_symptoms` | Module 1 (suggests department + booking) |
| 2 | `book_appointment` | Module 1 |
| 3 | `reschedule_appointment` | Module 1 |
| 4 | `cancel_appointment` | Module 1 |
| 5 | `get_my_appointments` | Module 1 |
| 6 | `get_my_profile` | Module 2 |
| 7 | `update_my_contact` | Module 2 (phone, email, address only — not medical) |
| 8 | `get_my_medications` | Module 6 |
| 9 | `get_my_lab_results` | Module 3 |
| 10 | `explain_lab_results` | Module 3 (AI summarizes in plain English) |
| 11 | `get_doctors` | Module 1 (list + filter by department) |
| 12 | `get_clinic_info` | Module 1 (hours, location, phone) |
| 13 | `search_health_faq` | Knowledge base search |
| 14 | `request_prescription_refill` | Module 6 (creates refill request for doctor) |
| 15 | `request_lab_report_pdf` | Module 3 (generates downloadable PDF) |
| 16 | `escalate_to_staff` | Module 4 (sends alert to front desk) |

**Safety Guardrails (non-negotiable):**
1. NEVER diagnoses — always "consult your doctor"
2. NEVER changes prescriptions — "discuss with your doctor"
3. Emergency keywords → immediate "Call 911/1122/ER" message, stop everything
4. Every response about health ends with disclaimer
5. Patient can only access their own data
6. Full audit log of every interaction

---

## Complete Data Model (17 tables)

```sql
-- Core
clinics, departments

-- People
doctors, patients, staff

-- Appointments
appointments, appointment_slots, waitlist

-- Medical
visit_notes, prescriptions, prescription_items

-- Lab
lab_orders, lab_results

-- Knowledge
health_faqs

-- Communication
notifications, chat_sessions, chat_messages

-- System
audit_logs
```

### Table Details

**clinics** — id, name, address, phone, email, logo_url, operating_hours (jsonb), settings (jsonb), created_at

**departments** — id, clinic_id (FK), name (General Medicine, Cardiology, etc.), description, created_at

**doctors** — id, clinic_id (FK), department_id (FK), name, specialization, qualification, bio, photo_url, available_days (jsonb), slot_duration_min, slots_start (time), slots_end (time), consultation_fee (numeric), is_active, created_at

**patients** — id, clinic_id (FK), patient_number (auto-generated: CH-0001), name, email (unique per clinic), phone, date_of_birth, gender, blood_type, allergies (text[]), chronic_conditions (text[]), emergency_contact (jsonb), insurance (jsonb), created_at

**staff** — id, clinic_id (FK), name, email, role (admin/receptionist/nurse/lab_tech), created_at

**appointments** — id, clinic_id (FK), patient_id (FK), doctor_id (FK), date, time_slot (time), duration_min, type (regular/extended/follow_up/emergency), reason, status (scheduled/confirmed/checked_in/in_progress/completed/no_show/cancelled/rescheduled), triage_urgency, cancellation_reason, rescheduled_from (FK self-ref, nullable), created_at

**waitlist** — id, clinic_id (FK), patient_id (FK), doctor_id (FK), preferred_date, preferred_time_range, reason, status (waiting/offered/booked/expired), created_at

**visit_notes** — id, appointment_id (FK), chief_complaint, examination_findings, diagnosis, treatment_plan, follow_up_instructions, follow_up_days (integer, nullable), created_by (FK doctors), created_at

**prescriptions** — id, patient_id (FK), doctor_id (FK), appointment_id (FK, nullable), notes, status (active/completed/cancelled), issued_date, created_at

**prescription_items** — id, prescription_id (FK), drug_name, dosage, frequency, duration, instructions, created_at

**lab_orders** — id, clinic_id (FK), patient_id (FK), doctor_id (FK), appointment_id (FK, nullable), test_panel (text — "CBC", "Lipid Panel", etc.), priority (routine/urgent/stat), status (ordered/collected/processing/completed/reviewed/delivered), notes, ordered_at, completed_at

**lab_results** — id, lab_order_id (FK), test_name, result_value, unit, reference_range, status (normal/abnormal/critical), notes, created_at

**health_faqs** — id, clinic_id (FK), category, question, answer, source, created_at

**notifications** — id, clinic_id (FK), patient_id (FK, nullable), type (appointment_reminder/lab_ready/prescription_refill/follow_up/general), channel (email/sms/in_app), subject, body, status (pending/sent/failed/read), scheduled_for (timestamptz), sent_at, created_at

**chat_sessions** — id, clinic_id (FK), patient_id (FK), started_at, ended_at, message_count, tools_used (text[]), escalated (boolean), satisfaction_rating (integer 1-5, nullable)

**chat_messages** — id, session_id (FK), role (user/assistant/system), content, tool_calls (jsonb), created_at

**audit_logs** — id, clinic_id (FK), user_type (patient/doctor/staff/system), user_id (uuid), action (text), resource (text — "appointment", "lab_result", etc.), resource_id (uuid), details (jsonb), ip_address, created_at

---

## Seed Data — "City Health Clinic, Lahore"

### Clinic
- Name: City Health Clinic
- Address: 45-B Gulberg III, Main Boulevard, Lahore
- Phone: +92-42-3578-1234
- Hours: Mon-Fri 8:00-18:00, Sat 9:00-14:00, Sun closed
- 4 departments: General Medicine, Cardiology, Dermatology, Pediatrics

### Doctors (6)
| Name | Department | Days | Fee | Slots |
|------|-----------|------|-----|-------|
| Dr. Ayesha Khan | General Medicine | Mon-Fri | Rs. 2,000 | 9:00-17:00, 20min |
| Dr. Usman Ali | Cardiology | Mon/Wed/Fri | Rs. 3,500 | 10:00-16:00, 30min |
| Dr. Fatima Zahra | Dermatology | Tue/Thu | Rs. 2,500 | 9:00-15:00, 15min |
| Dr. Ahmed Raza | General Medicine | Mon-Fri | Rs. 2,000 | 9:00-17:00, 20min |
| Dr. Sana Malik | Pediatrics | Mon-Sat | Rs. 1,800 | 9:00-14:00, 15min |
| Dr. Bilal Hussain | Cardiology | Tue/Thu/Sat | Rs. 3,500 | 11:00-17:00, 30min |

### Patients (8)
| Name | Age | Conditions | Meds |
|------|-----|-----------|------|
| Hamza Ahmed | 45 | Type 2 Diabetes, Hypertension | Metformin 1000mg, Lisinopril 10mg |
| Aisha Siddiqui | 32 | Pregnant (28 weeks) | Folic Acid, Iron supplement, Calcium |
| Tariq Mehmood | 60 | CAD, Hyperlipidemia | Aspirin 75mg, Atorvastatin 40mg, Metoprolol 50mg |
| Zainab Fatima | 25 | Acne, Eczema | Tretinoin cream, Cetirizine 10mg |
| Ali Hassan | 8 | Asthma | Salbutamol inhaler, Montelukast 5mg |
| Nadia Khanum | 55 | Hypothyroidism, Osteoporosis | Levothyroxine 50mcg, Calcium + Vit D |
| Fahad Iqbal | 38 | Healthy (annual checkup) | None |
| Rabia Noor | 42 | Migraine, Anxiety | Propranolol 40mg, Escitalopram 10mg |

### Lab Results (realistic values)
**Hamza (diabetic):**
- HbA1c: 6.5% (ref: <5.7% normal, 5.7-6.4 pre-diabetic, >6.5 diabetic) → abnormal
- Fasting Glucose: 135 mg/dL (ref: 70-100) → abnormal
- Creatinine: 1.1 mg/dL (ref: 0.7-1.3) → normal
- Total Cholesterol: 210 (ref: <200) → abnormal
- BP log: 140/90 (ref: <120/80) → high

**Tariq (heart patient):**
- Total Cholesterol: 245 (ref: <200) → abnormal
- LDL: 165 (ref: <100) → abnormal
- HDL: 32 (ref: >40) → abnormal
- Triglycerides: 210 (ref: <150) → abnormal
- ECG: Sinus rhythm, old inferior MI changes

**Aisha (pregnant):**
- Hemoglobin: 10.8 g/dL (ref: 12-16) → low
- Blood Group: B+
- Glucose (OGTT): 125 mg/dL (ref: <140) → normal
- Platelet count: 220,000 (ref: 150,000-400,000) → normal

### Appointments (30 total)
- 20 completed (past 2 months, with visit notes)
- 5 scheduled (next 2 weeks)
- 3 cancelled
- 2 no-shows

### Health FAQs (40 entries)
Categories: General Health (10), Diabetes (8), Heart Health (6), Pregnancy (6), Pediatrics (4), Skin Care (3), Mental Health (3)

Each with: question, answer (2-4 sentences), source (WHO, clinic policy, medical textbook reference)

### Notifications (sample)
- 10 sent appointment reminders
- 3 lab results ready notifications
- 2 follow-up reminders
- 1 critical lab alert (Tariq's LDL)

---

## Frontend Pages (14 total)

### Patient-Facing (4 pages)
1. **`/`** — Landing page: clinic info, "Chat with AI" CTA, features, trust signals
2. **`/chat`** — AI chat: full-screen, starter questions, inline appointment cards, med lists, lab results, emergency banner
3. **`/portal`** — Patient dashboard: upcoming appointments, active meds, recent labs, visit history, documents
4. **`/book`** — Direct booking page: pick department → doctor → date → time → confirm (no AI needed)

### Admin/Staff-Facing (10 pages)
5. **`/admin`** — Dashboard: today's stats, revenue, appointment volume, AI chat usage, alerts
6. **`/admin/appointments`** — Calendar view + list view. Filter by doctor, date, status. Check-in button. Reschedule/cancel.
7. **`/admin/appointments/[id]`** — Single appointment detail: patient info, visit notes form, prescriptions, lab orders
8. **`/admin/patients`** — Patient list with search. Click → full patient profile with timeline
9. **`/admin/patients/[id]`** — Patient detail: demographics, medical history, visit history, meds, labs, documents
10. **`/admin/labs`** — Lab management: orders list, status tracking, result entry form, report generation
11. **`/admin/prescriptions`** — Prescription list, refill requests, create new prescription
12. **`/admin/doctors`** — Doctor management: profiles, availability, fee setting
13. **`/admin/faqs`** — Health FAQ management: add/edit/delete, categories
14. **`/admin/audit`** — Audit log: searchable, filterable, exportable

---

## API Endpoints (complete)

### Patient APIs
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/patient/login` | none | Email + DOB login |
| GET | `/api/patient/profile` | patient | Get own profile |
| PATCH | `/api/patient/profile` | patient | Update contact info |
| GET | `/api/patient/appointments` | patient | Own appointments |
| POST | `/api/patient/appointments` | patient | Book appointment |
| PATCH | `/api/patient/appointments/:id/cancel` | patient | Cancel own appointment |
| GET | `/api/patient/medications` | patient | Active medications |
| GET | `/api/patient/lab-results` | patient | Own lab results |
| GET | `/api/patient/lab-results/:id/pdf` | patient | Download lab report PDF |
| POST | `/api/patient/chat` | patient | Chat with AI |
| GET | `/api/patient/chat/history` | patient | Chat history |

### Admin/Staff APIs
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/staff/login` | none | Email + password |
| GET | `/api/admin/dashboard/stats` | staff | Dashboard metrics |
| GET | `/api/admin/appointments` | staff | All appointments (filterable) |
| PATCH | `/api/admin/appointments/:id` | staff | Update status, add notes |
| GET | `/api/admin/patients` | staff | Patient list |
| GET | `/api/admin/patients/:id` | staff | Full patient record |
| POST | `/api/admin/patients` | staff | Register new patient |
| GET | `/api/admin/labs` | staff | Lab orders list |
| POST | `/api/admin/labs` | staff | Create lab order |
| PATCH | `/api/admin/labs/:id` | staff | Update status, enter results |
| POST | `/api/admin/prescriptions` | doctor | Create prescription |
| GET | `/api/admin/prescriptions` | staff | Prescription list |
| GET | `/api/admin/doctors` | staff | Doctor list |
| POST | `/api/admin/doctors` | admin | Add doctor |
| PATCH | `/api/admin/doctors/:id` | admin | Update doctor |
| GET | `/api/admin/faqs` | staff | FAQ list |
| POST | `/api/admin/faqs` | staff | Add FAQ |
| PATCH | `/api/admin/faqs/:id` | staff | Edit FAQ |
| DELETE | `/api/admin/faqs/:id` | admin | Delete FAQ |
| GET | `/api/admin/audit` | admin | Audit logs |
| GET | `/api/admin/notifications` | staff | Notification history |

### Public APIs
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/clinic/info` | Clinic name, hours, departments |
| GET | `/api/clinic/doctors` | Public doctor list |
| GET | `/api/clinic/departments` | Department list |
| GET | `/api/booking/slots?doctor_id=&date=` | Available slots |
| GET | `/api/health` | Server health check |

---

## Notification Implementation

For the demo, notifications are stored in the `notifications` table and shown in-app. For production, plug in:

**Email:** Resend API or SendGrid
**SMS:** Twilio (already in WhatsBot Pro — reusable code)

**Notification triggers (automated via backend):**
```python
# After booking appointment
create_notification(patient_id, type="appointment_confirmation", channel="email")
create_notification(patient_id, type="appointment_reminder", channel="sms", scheduled_for=appointment_date - 24hr)
create_notification(patient_id, type="appointment_reminder", channel="sms", scheduled_for=appointment_date - 2hr)

# After lab results entered
create_notification(patient_id, type="lab_results_ready", channel="email+sms")
if any_critical_results:
    create_notification(doctor_id, type="critical_lab_alert", channel="sms", priority="urgent")

# After visit with follow-up
if visit_notes.follow_up_days:
    create_notification(patient_id, type="follow_up_reminder", channel="sms",
                       scheduled_for=appointment_date + follow_up_days - 2)
```

---

## Report Generation

**PDF reports generated server-side** using PDFKit or WeasyPrint:

1. **Lab Report PDF** — Clinic header, patient info, test results table with color-coded status, reference ranges, doctor signature line, date
2. **Prescription PDF** — Clinic header, patient info, medication table (drug, dosage, frequency, duration, instructions), doctor signature, date
3. **Visit Summary PDF** — Clinic header, appointment info, chief complaint, diagnosis, treatment plan, follow-up instructions
4. **Patient Summary PDF** — Full patient history compiled: demographics, conditions, allergies, all visit notes, current meds, recent labs
5. **Medical Certificate PDF** — Patient name, diagnosis (brief), fitness status, dates, doctor signature
6. **Monthly Clinic Report PDF** — Appointments count, revenue, no-show rate, department breakdown, top conditions seen

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI (Python) |
| Database | PostgreSQL 15 |
| AI | Claude API (Anthropic) |
| Frontend | Next.js 14 + Tailwind + shadcn/ui |
| Charts | Chart.js + react-chartjs-2 |
| PDF Generation | WeasyPrint or ReportLab |
| Auth | JWT (patient: email+DOB, staff: email+password) |
| Notifications | In-app (demo) + Twilio SMS + Resend email (production) |
| Deployment | Docker Compose |

---

## Build Phases

| Phase | What | Deliverable |
|-------|------|-------------|
| **1** | DB schema + seed data + Docker | PostgreSQL with 17 tables, 8 patients, 6 doctors, full demo data |
| **2** | Backend core APIs | Patient + Admin CRUD endpoints, auth |
| **3** | AI chat engine with 16 tools | Claude integration, symptom triage, all tool functions |
| **4** | Frontend: Patient chat + portal | Chat interface, patient dashboard, direct booking page |
| **5** | Frontend: Admin dashboard + pages | Calendar, patient management, lab management, prescriptions |
| **6** | Notifications + PDF reports | Notification system, 6 PDF report types |
| **7** | Testing + documentation | Test suite, TESTING-GUIDE, DEMO-SCRIPT, HIPAA notes, README |

---

## What Makes This Win Proposals

**For the client:** This isn't "I built a chatbot." This is "I built a complete clinic management system with AI. Here's the appointment system, the lab management, the notification engine, the report generator, the audit trail, and the AI assistant that ties it all together."

**Differentiation from competition:**
- Most freelancers show a chatbot. You show a full operational system.
- Most demos have fake data. Your seed data has realistic Pakistani medical data (Lahore clinic, Rs. pricing, local doctor names, ICD-relevant conditions).
- HIPAA compliance notes show you understand the regulatory landscape.
- The notification system shows you understand clinic operations, not just code.
- The audit log shows you understand healthcare data governance.

**Upwork jobs this wins:**
- "AI Healthcare Chatbot" — obviously
- "Clinic Management System" — full CRUD + scheduling
- "Healthcare SaaS" — multi-module platform
- "Medical Document Automation" — lab reports, prescriptions, visit summaries
- "Patient Portal Development" — self-service patient features
- "HIPAA-compliant AI" — audit logs, guardrails, compliance notes
- "Appointment Booking System" — standalone or part of bigger system
- "Healthcare Notification System" — automated reminders
