-- LLM call metrics for monitoring and cost tracking
CREATE TABLE IF NOT EXISTS llm_metrics (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    endpoint VARCHAR(100) NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
    prompt_tokens INT,
    completion_tokens INT,
    total_tokens INT,
    latency_ms INT NOT NULL DEFAULT 0,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error TEXT,
    student_id UUID,
    classroom_id UUID
);

CREATE INDEX IF NOT EXISTS idx_llm_metrics_created_at ON llm_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_metrics_endpoint ON llm_metrics (endpoint);
