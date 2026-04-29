-- 004_feature4_pgvector.sql
-- Feature 4: Vector Storage & Curricular Tagging
-- Run this in the Supabase SQL Editor after 003_feature3_storage.sql

-- 1. Enable the pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Knowledge Base table
--    embedding VECTOR(1536) matches OpenAI text-embedding-3-small (1536 dimensions)
--    If you switch to a different embedding model, change the dimension here:
--      - all-MiniLM-L6-v2 (sentence-transformers) → VECTOR(384)
--      - text-embedding-ada-002 (OpenAI legacy) → VECTOR(1536)
--      - text-embedding-3-small (OpenAI current) → VECTOR(1536)  ← we use this
CREATE TABLE IF NOT EXISTS snc_knowledge_base (
    id          UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    content     TEXT                     NOT NULL,
    metadata    JSONB                    NOT NULL,
    embedding   VECTOR(1536),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. HNSW index for ultra-fast cosine similarity search
--    cosine distance (vector_cosine_ops) is the standard for OpenAI embeddings.
--    HNSW is preferred over IVFFlat for small-to-medium datasets (no training required).
CREATE INDEX IF NOT EXISTS idx_snc_embedding
    ON snc_knowledge_base
    USING hnsw (embedding vector_cosine_ops);

-- 4. GIN index on metadata JSONB for ultra-fast pre-filtering
--    This lets the query engine filter by {"grade_level": 3} BEFORE doing vector math,
--    preventing Grade 6 vocabulary from leaking into a Grade 2 chat session.
CREATE INDEX IF NOT EXISTS idx_snc_metadata
    ON snc_knowledge_base
    USING GIN (metadata);

-- 5. Row Level Security — all direct access requires authentication
ALTER TABLE snc_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Backend uses service_role key which bypasses RLS automatically.
-- This policy covers any direct queries made with a user JWT.
CREATE POLICY "Allow authenticated access"
    ON snc_knowledge_base
    FOR ALL
    USING (auth.role() = 'authenticated');
