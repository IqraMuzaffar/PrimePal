# CareBot — 2-Minute Demo Recording Script

A narrated walkthrough for screen recording. Total runtime: ~2 minutes.
Start the backend and frontend before recording.

---

## Pre-Recording Checklist

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Seed data loaded (Hamza's account and history present)
- [ ] Browser window: 1280x800 or wider
- [ ] Browser zoom at 100%
- [ ] Close DevTools and any notification popups
- [ ] Tab 1: `http://localhost:3000` (landing)
- [ ] Tab 2 ready to open: `http://localhost:3000/admin`

---

## Scene 1 — Landing Page (0:00 – 0:05)

**Action:** Open `http://localhost:3000`. Let the page fully render.

**Narration:**
> "CareBot is an AI-powered clinic management system. Patients book appointments and get health guidance through natural language chat. Let's see it in action."

**What to show:** Hero section, clinic name "City Health Clinic", the "Patient Portal" and "Admin" navigation links.

---

## Scene 2 — Patient Login (0:05 – 0:10)

**Action:** Click "Patient Portal" → login page opens. Type `hamza@email.com` and `Test1234`. Click Login.

**Narration:**
> "Hamza Tariq, a diabetes and hypertension patient, logs in with his credentials."

**What to show:** Login form fills in, redirect to the chat page, Hamza's name appears in the header.

---

## Scene 3 — Symptom Triage via Chat (0:10 – 0:25)

**Action:** In the chat input, type:
> "I've been feeling dizzy and my vision has been blurry for the past two days."

Press Enter. Wait for the AI response (~3-5 seconds).

**Narration:**
> "Hamza describes his symptoms. CareBot's AI — powered by Claude — triages them against Hamza's medical history. He has Type 2 Diabetes and Hypertension, so blurry vision warrants attention."

**What to show:** The AI response recommending the General Medicine or Cardiology department, showing urgency level, and including the disclaimer that this is not a diagnosis.

---

## Scene 4 — Book Appointment via Chat (0:25 – 0:40)

**Action:** Follow up in chat with:
> "Can you book me an appointment with Dr. Khan for this Monday at 9 AM?"

Wait for the AI response.

**Narration:**
> "Without leaving the chat, Hamza books directly through conversation. The AI checks slot availability and creates the appointment in real time."

**What to show:** The AI confirms the booking — doctor name, date, time slot. Mention that a notification was also created.

---

## Scene 5 — Medication Check (0:40 – 0:50)

**Action:** Type in chat:
> "What medications am I currently taking?"

**Narration:**
> "Hamza asks about his prescriptions. The AI retrieves his active medications from the database."

**What to show:** AI response listing Metformin 500mg (for diabetes) and Lisinopril 10mg (for hypertension), with dosage, frequency, and prescribing doctor.

---

## Scene 6 — Lab Results (0:50 – 1:05)

**Action:** Type in chat:
> "Show me my recent lab results."

**Narration:**
> "Next, lab results. The AI retrieves Hamza's latest panel and can explain any values that look unusual."

**What to show:** HbA1c 6.5% shown as normal (within diabetic target), lipid panel results with reference ranges, normal/abnormal flags.

---

## Scene 7 — Emergency Guardrail (1:05 – 1:15)

**Action:** Type in chat:
> "I'm having severe chest pain and my left arm is numb."

**Narration:**
> "Safety first. When a patient reports a potential emergency, CareBot immediately redirects to emergency services — no appointment booking, no triage delay."

**What to show:** The AI response prominently directing Hamza to call emergency services immediately (1122 or 115). The response should be urgent in tone and not attempt to continue normal conversation.

---

## Scene 8 — Admin Dashboard (1:15 – 1:25)

**Action:** Open a new tab to `http://localhost:3000/admin`. Log in as `admin@carebot.pk` / `Admin1234`. The dashboard loads.

**Narration:**
> "Switching to the admin side. Staff see today's appointments, monthly revenue, department breakdown, and doctor utilization — all live from the database."

**What to show:** Stats cards (appointments today, revenue, new patients), the department bar chart, and doctor utilization table.

---

## Scene 9 — Admin Appointments (1:25 – 1:30)

**Action:** Click "Appointments" in the admin sidebar.

**Narration:**
> "Staff can view every appointment, filter by date or status, and update appointment status through the workflow."

**What to show:** The appointments table with patient name, doctor, date, time slot, and color-coded status badges (scheduled, completed, cancelled, no-show).

---

## Scene 10 — Admin Lab Management (1:30 – 1:40)

**Action:** Click "Labs" in the admin sidebar.

**Narration:**
> "The lab management panel lets technicians enter results directly. Values outside the reference range are automatically flagged in red."

**What to show:** Lab orders table, at least one row showing a completed lab with color-coded results — green for normal, red for critical or abnormal values.

---

## Scene 11 — Admin Audit Log (1:40 – 1:45)

**Action:** Click "Audit Log" in the admin sidebar.

**Narration:**
> "Every patient and staff action is written to an immutable audit log — timestamps, user IDs, tool calls, and resource details — ready for compliance review."

**What to show:** Audit log table with columns: timestamp, user type, action (e.g., `chat_tool_call`, `book_appointment`), resource, and details.

---

## Closing (1:45 – 2:00)

**Action:** Return to the landing page or show a split-screen of chat + admin dashboard.

**Narration:**
> "CareBot combines a natural language patient interface with a full clinic operations backend. FastAPI, PostgreSQL, Next.js 14, and Claude API — all working together. Thank you for watching."

---

## Recording Tips

- Use Loom, OBS, or QuickTime for screen recording
- Microphone narration preferred over subtitles — it reads faster
- If the AI response takes more than 5 seconds, pause the timer — cut in post-production
- Keep the browser font at default size so UI components are legible
- Cursor highlight recommended (KeyCastr on Mac, Cursor Highlighter on Windows)
