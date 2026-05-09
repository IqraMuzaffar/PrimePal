-- RPC function to get 24h LLM stats aggregates
CREATE OR REPLACE FUNCTION get_llm_stats_24h()
RETURNS TABLE (
    total_calls BIGINT,
    total_tokens BIGINT,
    avg_latency_ms DOUBLE PRECISION,
    cache_hit_rate DOUBLE PRECISION,
    error_count BIGINT
) LANGUAGE sql STABLE AS $$
    SELECT
        COUNT(*)::BIGINT AS total_calls,
        COALESCE(SUM(total_tokens), 0)::BIGINT AS total_tokens,
        COALESCE(AVG(CASE WHEN NOT cache_hit THEN latency_ms END), 0) AS avg_latency_ms,
        CASE WHEN COUNT(*) > 0
            THEN COUNT(*) FILTER (WHERE cache_hit)::FLOAT / COUNT(*)::FLOAT
            ELSE 0
        END AS cache_hit_rate,
        COUNT(*) FILTER (WHERE NOT success)::BIGINT AS error_count
    FROM llm_metrics
    WHERE created_at > now() - interval '24 hours';
$$;
