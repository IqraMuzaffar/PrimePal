-- Migration 026: Add performance indexes for student dashboard queries
-- These indexes cover the most common unindexed query patterns in rewards,
-- achievements, and weekly progress endpoints.

-- Used by: /rewards/daily-summary, /rewards/points-breakdown, /student/my-scores
-- Covers: WHERE student_id = ? AND correct = TRUE AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_interactions_student_correct_created
    ON student_interactions(student_id, correct, created_at);

-- Used by: /missions/me, achievements._get_student_stats
-- Covers: WHERE student_id = ? AND interaction_type LIKE 'mission%'
CREATE INDEX IF NOT EXISTS idx_interactions_student_type
    ON student_interactions(student_id, interaction_type);

-- Used by: /missions/weekly-progress, /student/my-scores
-- Covers: WHERE student_id = ? AND pillar IS NOT NULL AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_interactions_student_pillar_created
    ON student_interactions(student_id, pillar, created_at);

-- Used by: /missions/weekly-progress (active topic lookup)
-- Covers: WHERE classroom_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_syllabus_classroom_status
    ON classroom_syllabus(classroom_id, status);
