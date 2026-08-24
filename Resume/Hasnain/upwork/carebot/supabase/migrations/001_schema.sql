-- CareBot Database Schema
-- 17 tables for AI-powered clinic management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. clinics
-- ============================================================
CREATE TABLE clinics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    address         TEXT,
    phone           TEXT,
    email           TEXT,
    operating_hours JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. departments
-- ============================================================
CREATE TABLE departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id),
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. doctors
-- ============================================================
CREATE TABLE doctors (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id         UUID NOT NULL REFERENCES clinics(id),
    department_id     UUID REFERENCES departments(id),
    name              TEXT NOT NULL,
    specialization    TEXT,
    qualification     TEXT,
    registration_number TEXT,
    bio               TEXT,
    photo_url         TEXT,
    available_days    TEXT[],
    slot_duration_min INT DEFAULT 30,
    slots_start       TIME DEFAULT '09:00',
    slots_end         TIME DEFAULT '17:00',
    consultation_fee  NUMERIC(10,2),
    is_active         BOOLEAN DEFAULT true,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. patients
-- ============================================================
CREATE SEQUENCE patient_number_seq START 1;

CREATE TABLE patients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id           UUID NOT NULL REFERENCES clinics(id),
    patient_number      TEXT UNIQUE,
    name                TEXT NOT NULL,
    email               TEXT,
    phone               TEXT,
    date_of_birth       DATE,
    gender              TEXT CHECK (gender IN ('male','female','other')),
    blood_type          TEXT,
    address             TEXT,
    allergies           TEXT[],
    chronic_conditions  TEXT[],
    emergency_contact   JSONB,
    insurance           JSONB,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. staff
-- ============================================================
CREATE TABLE staff (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id     UUID NOT NULL REFERENCES clinics(id),
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT CHECK (role IN ('admin','receptionist','lab_technician')) NOT NULL,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. appointments
-- ============================================================
CREATE TABLE appointments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id           UUID NOT NULL REFERENCES clinics(id),
    patient_id          UUID NOT NULL REFERENCES patients(id),
    doctor_id           UUID NOT NULL REFERENCES doctors(id),
    date                DATE NOT NULL,
    time_slot           TIME NOT NULL,
    duration_min        INT DEFAULT 30,
    status              TEXT CHECK (status IN ('scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show')) DEFAULT 'scheduled',
    reason              TEXT,
    cancellation_reason TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. waitlist
-- ============================================================
CREATE TABLE waitlist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    doctor_id       UUID REFERENCES doctors(id),
    preferred_date  DATE,
    reason          TEXT,
    status          TEXT CHECK (status IN ('waiting','scheduled','cancelled')) DEFAULT 'waiting',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. visit_notes
-- ============================================================
CREATE TABLE visit_notes (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id        UUID NOT NULL UNIQUE REFERENCES appointments(id),
    doctor_id             UUID NOT NULL REFERENCES doctors(id),
    chief_complaint       TEXT,
    examination_findings  TEXT,
    diagnosis             TEXT,
    treatment_plan        TEXT,
    follow_up_instructions TEXT,
    follow_up_days        INT,
    created_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. prescriptions
-- ============================================================
CREATE TABLE prescriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    doctor_id       UUID NOT NULL REFERENCES doctors(id),
    appointment_id  UUID REFERENCES appointments(id),
    status          TEXT CHECK (status IN ('active','completed','cancelled')) DEFAULT 'active',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. prescription_items
-- ============================================================
CREATE TABLE prescription_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    drug_name       TEXT NOT NULL,
    dosage          TEXT,
    frequency       TEXT,
    duration        TEXT,
    instructions    TEXT
);

-- ============================================================
-- 11. lab_orders
-- ============================================================
CREATE TABLE lab_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    doctor_id       UUID NOT NULL REFERENCES doctors(id),
    appointment_id  UUID REFERENCES appointments(id),
    test_panel      TEXT NOT NULL,
    priority        TEXT CHECK (priority IN ('routine','urgent','stat')) DEFAULT 'routine',
    status          TEXT CHECK (status IN ('ordered','processing','completed','cancelled')) DEFAULT 'ordered',
    ordered_at      TIMESTAMPTZ DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- 12. lab_results
-- ============================================================
CREATE TABLE lab_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_order_id    UUID NOT NULL REFERENCES lab_orders(id),
    test_name       TEXT NOT NULL,
    value           TEXT,
    unit            TEXT,
    reference_range TEXT,
    status          TEXT CHECK (status IN ('normal','abnormal','critical')) DEFAULT 'normal',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. health_faqs
-- ============================================================
CREATE TABLE health_faqs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id),
    category    TEXT NOT NULL,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
    source      TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 14. notifications
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    type            TEXT CHECK (type IN ('appointment_confirmation','appointment_reminder_24h','appointment_reminder_2h','appointment_cancelled','lab_results_ready','critical_lab_alert','follow_up_reminder','prescription_refill','staff_escalation')) NOT NULL,
    channel         TEXT CHECK (channel IN ('in_app','sms','email')) DEFAULT 'in_app',
    subject         TEXT,
    body            TEXT NOT NULL,
    status          TEXT CHECK (status IN ('pending','sent','failed','read')) DEFAULT 'pending',
    scheduled_for   TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 15. chat_sessions
-- ============================================================
CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    patient_id      UUID NOT NULL REFERENCES patients(id),
    started_at      TIMESTAMPTZ DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    message_count   INT DEFAULT 0,
    tools_used      TEXT[],
    escalated       BOOLEAN DEFAULT false
);

-- ============================================================
-- 16. chat_messages
-- ============================================================
CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            TEXT CHECK (role IN ('user','assistant','system','tool')) NOT NULL,
    content         TEXT NOT NULL,
    tool_name       TEXT,
    tool_input      JSONB,
    tool_result     JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 17. audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id),
    user_type       TEXT CHECK (user_type IN ('patient','doctor','staff','system')) NOT NULL,
    user_id         UUID,
    action          TEXT NOT NULL,
    resource        TEXT,
    resource_id     UUID,
    details         JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_appointments_clinic_date     ON appointments(clinic_id, date);
CREATE INDEX idx_appointments_doctor_date     ON appointments(doctor_id, date);
CREATE INDEX idx_appointments_patient         ON appointments(patient_id);
CREATE INDEX idx_lab_orders_patient            ON lab_orders(patient_id);
CREATE INDEX idx_lab_results_order             ON lab_results(lab_order_id);
CREATE INDEX idx_notifications_patient_status  ON notifications(patient_id, status);
CREATE INDEX idx_notifications_scheduled       ON notifications(scheduled_for);
CREATE INDEX idx_audit_clinic_created          ON audit_logs(clinic_id, created_at);
CREATE INDEX idx_audit_patient                 ON audit_logs(user_id);
CREATE INDEX idx_chat_sessions_patient         ON chat_sessions(patient_id);
CREATE INDEX idx_chat_messages_session         ON chat_messages(session_id);
