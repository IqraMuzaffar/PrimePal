-- 005_feature5_chat_rpc.sql
-- Feature 5: The Guardrailed Tutor — grade-filtered vector similarity search
-- Run this in the Supabase SQL Editor after 004_feature4_pgvector.sql

-- match_snc_documents: performs cosine similarity search on snc_knowledge_base,
-- pre-filtered by grade_level BEFORE vector math so Grade 3 students never
-- receive Grade 5 vocabulary chunks.
--
-- Args:
--   query_embedding   — the embedded student message (1536-dim vector)
--   grade_level_filter — the student's classroom grade (1–6); hard guardrail
--   match_count       — number of chunks to return (default 5)
--
-- Returns rows ordered by cosine similarity (most relevant first).
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

-- Grant execute to authenticated users (backend uses service_role which bypasses this,
-- but this keeps the permission model explicit).
GRANT EXECUTE ON FUNCTION match_snc_documents TO authenticated;
