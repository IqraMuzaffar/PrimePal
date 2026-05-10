-- ============================================================
-- PrimePal Feature 1: Smart Auth & Role Management
-- Run this in the Supabase SQL Editor (project dashboard → SQL Editor)
-- ============================================================

-- 1. Teachers Table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Classrooms Table
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Students Table (ghost profiles, NOT Supabase Auth users)
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers can only read/write their own profile
CREATE POLICY "Teachers can manage own profile"
    ON teachers FOR ALL
    USING (auth.uid() = id);

-- Teachers can only manage classrooms they own
CREATE POLICY "Teachers can manage own classrooms"
    ON classrooms FOR ALL
    USING (auth.uid() = teacher_id);

-- Teachers can only manage students in their own classrooms
CREATE POLICY "Teachers can manage own students"
    ON students FOR ALL
    USING (
        classroom_id IN (
            SELECT id FROM classrooms WHERE teacher_id = auth.uid()
        )
    );

-- Public read of students and classrooms for the visual login screen
-- (students enter a class code and need to see avatars without being authenticated yet)
CREATE POLICY "Public read students for login"
    ON students FOR SELECT
    USING (true);

CREATE POLICY "Public read classrooms for login"
    ON classrooms FOR SELECT
    USING (true);
