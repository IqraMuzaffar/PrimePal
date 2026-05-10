-- 030_snc_uploads_status.sql
-- Add pipeline status tracking to snc_uploads for admin RAG management UI.
-- Run in Supabase SQL Editor after 029_grade_topic_selections.sql

ALTER TABLE snc_uploads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success'
  CHECK (status IN ('pending', 'extracting', 'chunking', 'embedding', 'success', 'failed'));
ALTER TABLE snc_uploads ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE snc_uploads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Allow admins (service_role) to manage all uploads
-- The existing RLS policies only allow teacher self-access; admin endpoints use service_role key
-- which bypasses RLS, so no additional policies needed.
