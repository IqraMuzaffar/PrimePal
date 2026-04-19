-- supabase/migrations/011_secret_pin.sql
-- Add secret_pin to students table for child-safe login authentication
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS secret_pin VARCHAR(4) NOT NULL DEFAULT '1234';
