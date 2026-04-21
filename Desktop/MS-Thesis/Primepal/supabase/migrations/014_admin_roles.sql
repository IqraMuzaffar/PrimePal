-- supabase/migrations/014_admin_roles.sql

-- Add role column to teachers table
ALTER TABLE teachers
ADD COLUMN role VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin'));

-- Index for admin lookups
CREATE INDEX idx_teachers_role ON teachers(role);

-- Admin invite codes table
CREATE TABLE IF NOT EXISTS admin_invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_admin_invite_codes_code ON admin_invite_codes(code);
CREATE INDEX idx_admin_invite_codes_expires_at ON admin_invite_codes(expires_at);

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE admin_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view invite codes
CREATE POLICY "Admins can view invite codes"
    ON admin_invite_codes FOR SELECT
    USING (auth.jwt_claims ->> 'role' = 'admin');

-- RLS: Admins can create invite codes
CREATE POLICY "Admins can create invite codes"
    ON admin_invite_codes FOR INSERT
    WITH CHECK (auth.jwt_claims ->> 'role' = 'admin');

-- RLS: Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON admin_audit_log FOR SELECT
    USING (auth.jwt_claims ->> 'role' = 'admin');

-- RLS: System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON admin_audit_log FOR INSERT
    WITH CHECK (auth.jwt_claims ->> 'role' = 'admin');

-- Update RLS for teachers table: admins see all, teachers see self
DROP POLICY IF EXISTS "Teachers can manage own profile" ON teachers;
CREATE POLICY "Admins see all teachers, teachers see self"
    ON teachers FOR SELECT
    USING (
        auth.jwt_claims ->> 'role' = 'admin'
        OR auth.uid() = id
    );

-- Update RLS for classrooms table: admins see all, teachers see own
DROP POLICY IF EXISTS "Teachers can manage own classrooms" ON classrooms;
CREATE POLICY "Admins see all classrooms, teachers see own"
    ON classrooms FOR SELECT
    USING (
        auth.jwt_claims ->> 'role' = 'admin'
        OR auth.uid() = teacher_id
    );
