-- 036_switch_to_openai_embeddings.sql
-- Switches embedding model from sentence-transformers/all-MiniLM-L6-v2 (384 dims)
-- back to OpenAI text-embedding-3-small (1536 dims) for faster API-based embeddings.
--
-- IMPORTANT: This clears all existing embeddings — re-upload your PDFs after running.
-- Run this in the Supabase SQL Editor.

-- 1. Drop the HNSW index (must drop before altering column type)
DROP INDEX IF EXISTS idx_snc_embedding;

-- 2. Clear existing rows (old 384-dim vectors are incompatible with 1536-dim column)
TRUNCATE TABLE snc_knowledge_base;

-- 3. Change the embedding column from 384 to 1536 dimensions
ALTER TABLE snc_knowledge_base
    ALTER COLUMN embedding TYPE VECTOR(1536);

-- 4. Recreate the HNSW index for the new dimension
CREATE INDEX idx_snc_embedding
    ON snc_knowledge_base
    USING hnsw (embedding vector_cosine_ops);

-- 5. Replace the RPC function with the 1536-dim signature
CREATE OR REPLACE FUNCTION match_snc_documents(
    query_embedding    VECTOR(1536),
    grade_level_filter INT,
    match_count        INT DEFAULT 5
)
RETURNS TABLE (
    id          UUID,
    content     TEXT,
    metadata    JSONB,
    similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        snc_knowledge_base.id,
        snc_knowledge_base.content,
        snc_knowledge_base.metadata,
        1 - (snc_knowledge_base.embedding <=> query_embedding) AS similarity
    FROM snc_knowledge_base
    WHERE (snc_knowledge_base.metadata->>'grade_level')::int = grade_level_filter
    ORDER BY snc_knowledge_base.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_snc_documents TO authenticated;
