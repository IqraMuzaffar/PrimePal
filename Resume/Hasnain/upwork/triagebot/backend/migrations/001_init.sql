CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

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

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES triage_sessions(id),
    role VARCHAR(15) NOT NULL CHECK (role IN ('patient', 'ai', 'receptionist', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES triage_sessions(id),
    action VARCHAR(50) NOT NULL,
    tool_used VARCHAR(50),
    input JSONB,
    output JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (name, description) VALUES
    ('General Practice', 'General health concerns, routine checkups'),
    ('Cardiology', 'Heart and cardiovascular issues'),
    ('Pediatrics', 'Children health concerns'),
    ('Orthopedics', 'Bone, joint, and muscle issues'),
    ('Dermatology', 'Skin conditions and rashes'),
    ('ENT', 'Ear, nose, and throat issues'),
    ('Ophthalmology', 'Eye problems and vision'),
    ('Gynecology', 'Women health concerns'),
    ('Neurology', 'Brain, nerve, and headache issues'),
    ('Gastroenterology', 'Stomach, digestive issues'),
    ('Psychiatry', 'Mental health and emotional concerns'),
    ('Emergency', 'Life-threatening emergencies'),
    ('Pulmonology', 'Breathing and lung issues'),
    ('Urology', 'Urinary and kidney issues');

CREATE INDEX idx_sessions_status ON triage_sessions(status);
CREATE INDEX idx_sessions_severity ON triage_sessions(severity);
CREATE INDEX idx_sessions_created ON triage_sessions(created_at DESC);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_audit_session ON audit_log(session_id);
