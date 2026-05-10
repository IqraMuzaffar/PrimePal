-- Migration 025: Add RLS policy for students to read their own record
-- Fixes: GET /missions/me and other student endpoints that query their own data

-- Allow students to read their own record
CREATE POLICY "Students can read own record"
    ON students FOR SELECT
    USING (id = auth.uid());

-- Allow students to update their own avatar_style and theme_color
CREATE POLICY "Students can update own profile"
    ON students FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
