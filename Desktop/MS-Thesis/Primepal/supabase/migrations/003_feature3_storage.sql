-- Feature 3: SNC Document Ingestion — Supabase Storage Setup
-- Run this in the Supabase SQL Editor after 002_feature2_classroom.sql

-- Create a private bucket for raw SNC PDF textbooks (for auditing/backup)
INSERT INTO storage.buckets (id, name, public)
VALUES ('snc-textbooks', 'snc-textbooks', false)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated teachers can upload curriculum files
CREATE POLICY "Teachers can upload textbooks"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'snc-textbooks'
    AND auth.role() = 'authenticated'
);

-- Only authenticated teachers can read curriculum files
CREATE POLICY "Teachers can view textbooks"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'snc-textbooks'
    AND auth.role() = 'authenticated'
);
