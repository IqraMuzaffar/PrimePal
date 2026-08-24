# CareBot — Edge Cases, Validation Rules & Error Handling

This document covers every edge case, validation rule, and error scenario for each module. Every developer implementing any task MUST handle these cases.

---

## Module 1: Appointment Management — Edge Cases

### Booking Validation Rules

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| Doctor exists | doctor_id must be a valid UUID in doctors table | 404: "Doctor not found" |
| Doctor is active | doctor.is_active must be true | 400: "This doctor is not currently available" |
| Doctor works that day | Check date's day-of-week against doctor.available_days | 400: "Dr. {name} does not work on {day_name}s. Available: {days}" |
| Clinic is open | Check date's day-of-week against clinic.operating_hours | 400: "Clinic is closed on {day_name}s" |
| Not in the past | date must be >= today | 400: "Cannot book appointments in the past" |
| Not too far ahead | date must be <= today + 90 days | 400: "Cannot book more than 90 days ahead" |
| Slot is valid | time_slot must be one of the doctor's generated slots | 400: "Invalid time slot. Available slots: {list}" |
| No double-booking (doctor) | No existing appointment for same doctor + date + time_slot with status in (scheduled, confirmed, checked_in, in_progress) | 409: "This slot is already booked. Next available: {slot}" |
| No double-booking (patient) | No existing appointment for same patient on same date with overlapping time | 409: "You already have an appointment on {date} at {time}" |
| Patient belongs to clinic | patient.clinic_id must match doctor.clinic_id | 403: "Access denied" |
| Reason is not empty | reason must be at least 3 characters | 400: "Please provide a reason for your visit" |
| Rate limiting | Max 3 appointments per patient per week | 429: "You can book a maximum of 3 appointments per week" |

### Cancellation Rules

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| Appointment exists | appointment_id valid | 404: "Appointment not found" |
| Patient owns appointment | appointment.patient_id == current patient | 403: "You can only cancel your own appointments" |
| Cancellable status | status must be in (scheduled, confirmed) | 400: "Cannot cancel an appointment with status '{status}'. Only scheduled or confirmed appointments can be cancelled." |
| Not too late | If clinic has grace period (e.g., 2 hours): appointment datetime must be > now + grace_period | 400: "Cannot cancel within 2 hours of appointment. Please call the clinic." |
| Reason required | cancellation_reason must be provided | 400: "Please provide a reason for cancellation" |

### Rescheduling Rules

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| All booking rules apply | Same as booking validation | Same errors |
| Old appointment cancellable | Original must be scheduled/confirmed | 400: "Cannot reschedule a {status} appointment" |
| Different slot | New date/time must differ from original | 400: "New time is the same as current appointment" |
| Link maintained | rescheduled_from points to old appointment_id | — |

### Status Transition Rules (Admin)

```
Valid transitions:
  scheduled   → confirmed, checked_in, cancelled, no_show, rescheduled
  confirmed   → checked_in, cancelled, no_show, rescheduled
  checked_in  → in_progress, cancelled
  in_progress → completed
  completed   → (terminal — no transitions)
  cancelled   → (terminal — no transitions)
  no_show     → (terminal — no transitions)
  rescheduled → (terminal — no transitions)
```

| Invalid Transition | Error Response |
|-------------------|----------------|
| completed → anything | 400: "Completed appointments cannot be modified" |
| cancelled → anything | 400: "Cancelled appointments cannot be modified" |
| scheduled → completed | 400: "Patient must check in before marking complete. Transition: scheduled → checked_in → in_progress → completed" |
| Any invalid jump | 400: "Invalid status transition: {current} → {requested}. Valid options: {valid_list}" |

### Waitlist Edge Cases

| Case | Handling |
|------|---------|
| Slot opens up (cancellation) | Query waitlist for matching doctor + preferred_date. If found, create notification "A slot has opened up with Dr. {name} on {date}. Book now: {link}". Update waitlist status → offered. |
| Waitlist entry expires | If preferred_date < today, mark status → expired |
| Patient already on waitlist for same doctor/date | 409: "You are already on the waitlist for this doctor and date" |
| Patient books the slot they were waitlisted for | Update waitlist status → booked |

### Slot Generation Edge Cases

| Case | Handling |
|------|---------|
| Doctor has no available days for requested date | Return empty array, not error |
| Doctor has 0 remaining slots (all booked) | Return empty array with message: "Dr. {name} is fully booked on {date}. Try another date or join the waitlist." |
| Slot crosses clinic closing time | Don't generate slot if slot_start + duration > clinic closing time |
| Buffer time between appointments | If buffer = 10min, a 20-min slot at 10:00 blocks 10:00-10:30. Next available: 10:30 |
| Weekend/holiday | Check clinic.operating_hours for that day-of-week. If null/closed, return empty |

---

## Module 2: Patient Records — Edge Cases

### Patient Registration

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| Email unique per clinic | No other patient with same email in same clinic_id | 409: "A patient with this email already exists" |
| Phone format | Must be valid phone format (E.164 or local) | 400: "Invalid phone number format" |
| DOB valid | Must be a valid past date, not in future | 400: "Date of birth cannot be in the future" |
| DOB reasonable | Age between 0 and 150 | 400: "Invalid date of birth" |
| Name not empty | At least 2 characters | 400: "Name is required" |
| Gender valid | Must be one of: male, female, other | 400: "Gender must be male, female, or other" |
| Blood type valid | If provided, must be one of: A+, A-, B+, B-, AB+, AB-, O+, O- | 400: "Invalid blood type" |
| Patient number auto-generated | System generates CH-0001, CH-0002, etc. | Never user-provided |

### Patient Profile Update (by patient)

| Allowed Fields | Blocked Fields (patient cannot change) |
|---------------|---------------------------------------|
| phone, email, address, emergency_contact | name, date_of_birth, gender, blood_type, allergies, chronic_conditions, medical history |

Error if patient tries to update blocked field: 400: "You cannot update {field}. Please ask clinic staff to update your medical records."

### Patient Login Edge Cases

| Case | Handling |
|------|---------|
| Email not found | 401: "Invalid credentials" (don't reveal which field is wrong) |
| Email found but DOB doesn't match | 401: "Invalid credentials" |
| Multiple patients with same email (different clinics) | Match on email + clinic context (for demo, use the single demo clinic) |
| Account locked (future) | 403: "Account locked. Please contact the clinic." |
| SQL injection in email | Parameterized queries prevent this. Pydantic validates email format. |

---

## Module 3: Lab Management — Edge Cases

### Lab Order Creation

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| Patient exists | patient_id valid | 404: "Patient not found" |
| Doctor exists | doctor_id valid and is_active | 404: "Doctor not found" |
| Test panel valid | Must be one of defined panels: CBC, Lipid Panel, HbA1c, Thyroid Panel, Urinalysis, Liver Function, Kidney Function, Blood Sugar | 400: "Unknown test panel: {name}. Valid options: {list}" |
| Priority valid | Must be routine, urgent, or stat | 400: "Priority must be routine, urgent, or stat" |
| No duplicate order | No existing order for same patient + test_panel with status in (ordered, collected, processing) | 409: "Patient already has a pending {test_panel} order" |

### Lab Result Entry

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| Order exists | lab_order_id valid | 404: "Lab order not found" |
| Order status allows results | Status must be ordered, collected, or processing | 400: "Cannot enter results for an order with status '{status}'" |
| Result value not empty | Each test must have a value | 400: "Result value is required for {test_name}" |
| Reference range provided | Must include reference range | 400: "Reference range is required" |
| Status classification | normal: value within range. abnormal: outside range. critical: dangerously outside range | Auto-classified based on value vs range |

### Critical Result Detection

```python
CRITICAL_THRESHOLDS = {
    "Hemoglobin": {"low": 7.0, "high": 20.0, "unit": "g/dL"},
    "Glucose": {"low": 40, "high": 500, "unit": "mg/dL"},
    "Potassium": {"low": 2.5, "high": 6.5, "unit": "mEq/L"},
    "Sodium": {"low": 120, "high": 160, "unit": "mEq/L"},
    "Platelet Count": {"low": 50000, "high": 1000000, "unit": "/uL"},
}
```

When a critical value is detected:
1. Mark result status as "critical"
2. Create `critical_lab_alert` notification for the ordering doctor
3. Log audit event with severity "critical"
4. Return warning in API response: `"warnings": ["CRITICAL: {test_name} value {value} is outside safe range"]`

### Lab Status Transition Rules

```
Valid transitions:
  ordered    → collected, cancelled
  collected  → processing, cancelled
  processing → completed
  completed  → reviewed
  reviewed   → delivered
```

---

## Module 4: Notifications — Edge Cases

| Case | Handling |
|------|---------|
| Patient has no email | Skip email notification, SMS only (if phone exists) |
| Patient has no phone | Skip SMS, email only |
| Patient has neither | Create in-app notification only, log warning |
| Scheduled notification for past time | Send immediately instead of scheduling |
| Duplicate notification (same type, same appointment, same channel) | Check for existing, don't create duplicate |
| Notification send fails (Twilio/email error) | Mark status as "failed", log error, don't retry in demo (production: retry 3x with exponential backoff) |
| Appointment cancelled after reminder scheduled | When appointment cancelled, find pending notifications for that appointment_id and mark them "cancelled" |

---

## Module 5: Reports — Edge Cases

| Case | Handling |
|------|---------|
| Lab order has no results yet | Return error: "Lab results are not yet available for this order" |
| Patient has no visit history | Generate summary with "No visits recorded" section |
| Prescription has no items | Return error: "This prescription has no medications" |
| Very long doctor name or clinic name | Truncate in PDF header if > 50 chars |
| Unicode/Urdu characters in patient names | Ensure PDF engine handles UTF-8 |
| Missing doctor for lab order (deleted doctor) | Use "Former Physician" as fallback |

---

## Module 6: Prescriptions — Edge Cases

### Allergy Check

```python
async def check_drug_allergies(patient_id: str, drug_name: str) -> list[str]:
    """Compare drug name against patient.allergies array.
    Returns list of warning strings."""
    patient = await get_patient(patient_id)
    warnings = []
    drug_lower = drug_name.lower()
    for allergy in (patient.get("allergies") or []):
        allergy_lower = allergy.lower()
        # Direct match
        if allergy_lower in drug_lower or drug_lower in allergy_lower:
            warnings.append(f"WARNING: Patient is allergic to '{allergy}'. '{drug_name}' may contain this allergen.")
        # Common cross-reactivity
        CROSS_REACTIVE = {
            "penicillin": ["amoxicillin", "ampicillin", "augmentin"],
            "sulfa": ["sulfamethoxazole", "bactrim", "septra"],
            "aspirin": ["ibuprofen", "naproxen"],  # NSAID cross-reactivity
        }
        for allergen, drugs in CROSS_REACTIVE.items():
            if allergen in allergy_lower and any(d in drug_lower for d in drugs):
                warnings.append(f"WARNING: Patient is allergic to '{allergy}'. '{drug_name}' may cause cross-reactive allergy.")
    return warnings
```

### Prescription Validation

| Rule | What to Check | Error Response |
|------|--------------|----------------|
| At least one medication | prescription_items must not be empty | 400: "Prescription must have at least one medication" |
| Drug name not empty | Each item.drug_name required | 400: "Drug name is required" |
| Dosage not empty | Each item.dosage required | 400: "Dosage is required for {drug_name}" |
| Frequency valid | Must be recognizable: "once daily", "twice daily", "three times daily", "every 8 hours", "as needed", "at bedtime" | 400: "Invalid frequency format" |
| Duration valid | If provided, must be positive number + unit: "7 days", "2 weeks", "1 month", "ongoing" | 400: "Invalid duration format" |
| Allergy warnings | Run allergy check, return warnings (don't block — doctor overrides) | 200 with `"allergy_warnings": [...]` |
| Duplicate active prescription | Check if patient already has active prescription with same drug | Warning: "Patient already has an active prescription for {drug}. Creating a new one will not cancel the old one." |

### Refill Requests

| Case | Handling |
|------|---------|
| Prescription is expired (end_date passed) | 400: "This prescription has expired. Please book a follow-up appointment." |
| Prescription already cancelled | 400: "This prescription has been cancelled" |
| Already requested refill for this prescription | 409: "A refill request is already pending for this prescription" |
| Refill approved by doctor (future) | Update prescription end_date, create new notification |

---

## Module 7: AI Chat — Edge Cases

### Emergency Detection (highest priority)

```python
EMERGENCY_KEYWORDS = [
    # Cardiac
    "chest pain", "heart attack", "cardiac arrest",
    # Respiratory
    "can't breathe", "cannot breathe", "difficulty breathing",
    "shortness of breath", "choking",
    # Neurological
    "stroke", "seizure", "unconscious", "loss of consciousness",
    "severe head injury", "can't move", "paralysis",
    # Bleeding
    "severe bleeding", "bleeding won't stop", "hemorrhage",
    # Allergic
    "allergic reaction", "anaphylaxis", "throat swelling",
    # Mental health
    "suicidal", "want to die", "kill myself", "self-harm",
    "overdose", "took too many pills",
    # Pregnancy
    "heavy bleeding pregnant", "water broke", "premature labor",
    # Pediatric
    "baby not breathing", "child unconscious", "infant choking",
]

EMERGENCY_RESPONSE = """🚨 **EMERGENCY**

Based on what you've described, this could be a medical emergency.

**Please take immediate action:**
- **Call Emergency Services: 1122 (Rescue) or 115 (Edhi)**
- **Or go to the nearest Emergency Room immediately**
- **Do NOT wait for an appointment**

If someone is with you, ask them to call while you stay with the patient.

_This is an automated safety response. CareBot has alerted our clinic staff._
"""
```

**Emergency flow:**
1. Before calling Claude, check message for emergency keywords
2. If detected → return EMERGENCY_RESPONSE immediately (no Claude call)
3. Call `escalate_to_staff()` → creates urgent notification
4. Log audit with action "emergency_detected"
5. Store in chat_messages so it appears in history

### Safety Guardrails (in Claude system prompt)

```python
SYSTEM_PROMPT = """You are CareBot, a patient assistant for {clinic_name}.

ABSOLUTE RULES — NEVER BREAK THESE:

1. NEVER DIAGNOSE. Never say "you have X" or "this is X."
   INSTEAD say: "Based on your symptoms, I recommend consulting with our {department} department."

2. NEVER PRESCRIBE OR CHANGE MEDICATION. Never say "take X" or "increase your dose."
   INSTEAD say: "Please discuss medication changes with your doctor."

3. NEVER PROVIDE SPECIFIC MEDICAL ADVICE.
   INSTEAD say: "For personalized medical advice, please consult your healthcare provider."

4. ALWAYS ADD DISCLAIMER to any health-related response:
   "⚕️ This is general information only. Please consult your healthcare provider for personalized medical advice."

5. If asked about another patient's data:
   RESPOND: "I can only access your own medical records. I cannot share information about other patients."

6. If unsure about ANYTHING medical:
   RESPOND: "I'm not sure about that. Let me connect you with our staff." Then call escalate_to_staff.

7. If the patient seems distressed or in pain:
   ACKNOWLEDGE their concern first, then suggest appropriate action.

You have access to the following tools that query {patient_name}'s medical records...
"""
```

### Chat Edge Cases

| Case | Handling |
|------|---------|
| Empty message | 400: "Please type a message" |
| Very long message (>5000 chars) | 400: "Message is too long. Please keep it under 5000 characters." |
| Non-English message (Urdu/Arabic) | Claude handles multilingual. System prompt includes: "Respond in the same language the patient uses." |
| Patient asks about someone else's data | Guardrail #5 blocks this. Tools only query by current patient_id. |
| Claude API timeout | Return: "I'm having trouble connecting right now. Please try again in a moment, or call our clinic at {phone}." Log error. |
| Claude API rate limit | Return: "Our AI assistant is busy helping other patients. Please try again in a minute." |
| Claude returns no content | Return: "I wasn't able to generate a response. Let me connect you with our staff." + escalate_to_staff() |
| Tool function throws error | Catch exception, return: "I had trouble looking up that information. Our staff has been notified." + log error + escalate |
| Patient asks to delete their data | "I cannot delete medical records. Please contact our clinic administration at {phone}." |
| Patient asks for another patient's appointment | Tools only query by patient_id from JWT — cannot access other patients |
| Session timeout (no message for 30 min) | End session (set ended_at), next message starts new session |
| Concurrent messages from same patient | Queue/lock on patient_id to prevent race conditions in tool calls |

### Triage Edge Cases

| Symptom Input | Expected Triage |
|--------------|----------------|
| "headache for 3 days" | Routine → General Medicine |
| "chest pain" | EMERGENCY → skip triage, emergency response |
| "rash on arms for a week" | Routine → Dermatology |
| "my child has fever 104°F" | Urgent → Pediatrics |
| "feeling sad and anxious" | Routine → Mental Health (with sensitivity) |
| "pregnant and bleeding" | EMERGENCY → emergency response |
| "twisted my ankle" | Urgent → Orthopedics/General |
| "tooth pain" | Routine → "We recommend a dental clinic. We don't have a dental department." |
| "I want a checkup" | Wellness → General Medicine |
| Empty symptoms | 400: "Please describe your symptoms" |
| Vague: "I don't feel good" | AI asks clarifying questions before triaging |

---

## Authentication — Edge Cases

### JWT Security

| Case | Handling |
|------|---------|
| Missing Authorization header | 401: "Authentication required" |
| Malformed token (not Bearer format) | 401: "Invalid authentication format. Expected: Bearer <token>" |
| Expired token (>24h) | 401: "Session expired. Please log in again." |
| Token signed with wrong secret | 401: "Invalid token" |
| Token for deleted patient | 401: "Account not found" (re-verify patient exists on each request) |
| Staff accessing patient endpoint | 403: "This endpoint is for patients only" |
| Patient accessing admin endpoint | 403: "This endpoint requires staff access" |
| Admin-only action by regular staff | 403: "This action requires admin privileges" |

### Role Hierarchy

```
admin   → can do everything
doctor  → can create prescriptions, view patients, add visit notes
nurse   → can update appointment status, view patients
receptionist → can manage appointments, register patients
lab_tech → can manage lab orders and results
patient → can only access own data via patient endpoints
```

---

## Database — Edge Cases

### Referential Integrity

| Scenario | Handling |
|----------|---------|
| Delete doctor with appointments | Soft delete (is_active = false). Don't cascade delete appointments. |
| Delete patient with records | Not allowed in API. 400: "Cannot delete patient with existing records. Deactivate instead." |
| Delete department with doctors | Not allowed. 400: "Cannot delete department with active doctors." |
| Delete FAQ that's been cited in chat | Allow delete. Chat history keeps the answer text. |

### Concurrent Access

| Scenario | Handling |
|----------|---------|
| Two patients book same last slot simultaneously | Use `SELECT ... FOR UPDATE` or unique constraint on (doctor_id, date, time_slot) + catch IntegrityError → 409: "This slot was just booked. Please choose another." |
| Admin updates appointment status while patient cancels | Last write wins. Both operations are valid individually. Audit log captures both. |
| Lab results entered twice for same order | Unique constraint on (lab_order_id, test_name). Second insert fails → 409: "Results already entered for {test_name}" |

### Data Sanitization

| Field | Sanitization |
|-------|-------------|
| Patient name | Strip leading/trailing whitespace, capitalize first letters |
| Email | Lowercase, strip whitespace, validate format |
| Phone | Strip spaces and dashes, validate length |
| Free-text fields (reason, notes, diagnosis) | Strip HTML tags to prevent XSS. Allow alphanumeric + basic punctuation. |
| SQL injection | All queries use parameterized statements ($1, $2). Never string interpolation. |
| JSONB fields (allergies, conditions, emergency_contact) | Validate structure with Pydantic models before inserting |

---

## Frontend — Edge Cases

### Chat UI

| Case | Handling |
|------|---------|
| Network error during chat | Show: "Connection lost. Please check your internet and try again." with retry button |
| Response takes > 10 seconds | Show: "Still thinking..." after 5s. Timeout at 30s with: "Request timed out. Please try again." |
| Emergency response | Show full-width red EmergencyBanner at top of chat. Banner persists until dismissed. Play alert sound (optional). |
| Very long AI response | Scroll to bottom automatically. Max height with overflow-y: auto. |
| Markdown in AI response | Render basic markdown: bold, lists, headings. Sanitize HTML. |
| Multiple rapid messages | Disable input while waiting for response. Show "Sending..." state. |
| Session expired during chat | On 401 response, show login modal. Don't lose the chat history (keep in React state). |

### Booking Flow

| Case | Handling |
|------|---------|
| No doctors available in selected department | Show: "No doctors available in {department}. Please try another department or call us." |
| All slots booked for selected date | Show: "No available slots on {date}. Try another date." with calendar highlighting available dates. |
| Patient selects date in the past | Calendar disables past dates |
| Patient selects Sunday (clinic closed) | Calendar disables closed days |
| Network error during booking | Show error with retry. Don't create duplicate booking (backend handles idempotency via conflict check). |
| Back button during wizard | Preserve selections. Going back doesn't lose chosen department/doctor. |

### Admin Dashboard

| Case | Handling |
|------|---------|
| No appointments today | Show: "No appointments scheduled for today" instead of empty chart |
| Division by zero (no-show rate with 0 appointments) | Return 0% not NaN |
| Very long patient list (100+ patients) | Paginate: 20 per page with "Load more" or page numbers |
| Audit log very large | Paginate: 50 per page. Date range filter defaults to last 7 days. |

---

## API Error Response Format

All errors follow this consistent format:

```json
{
  "error": {
    "code": "SLOT_NOT_AVAILABLE",
    "message": "This slot is already booked. Next available: 10:30 AM",
    "details": {
      "doctor_id": "uuid",
      "date": "2026-08-01",
      "requested_slot": "10:00",
      "next_available": "10:30"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | When |
|------|-------------|------|
| VALIDATION_ERROR | 400 | Pydantic validation fails |
| INVALID_CREDENTIALS | 401 | Login fails |
| TOKEN_EXPIRED | 401 | JWT expired |
| UNAUTHORIZED | 401 | Missing/invalid token |
| FORBIDDEN | 403 | Wrong role for endpoint |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Duplicate or conflicting state |
| SLOT_NOT_AVAILABLE | 409 | Appointment slot taken |
| RATE_LIMITED | 429 | Too many requests |
| AI_ERROR | 502 | Claude API failure |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Slow dashboard stats (many JOINs) | Single SQL query with CTEs, not multiple round-trips |
| Chat session history grows large | Only load last 20 messages for Claude context. Full history paginated. |
| Slot generation for 30-min slots over 8-hour day = 16 slots | Pre-compute is fast. No caching needed. |
| Large audit log table | Index on (clinic_id, created_at). Paginate all queries. |
| Claude API latency (2-5 seconds) | Show loading spinner in UI. Stream response if possible (future optimization). |
| Multiple concurrent chat requests | asyncio handles this naturally in FastAPI. Each request gets its own Claude call. |
