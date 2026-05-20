-- 039: Teacher Evaluation Forms (pre/post study questionnaire)
-- Stores one row per teacher submission. Multiple teachers share one login,
-- so identity fields are collected on every submission.

CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (collected each submission since shared account)
  teacher_name TEXT NOT NULL,
  teacher_email TEXT,
  gender TEXT CHECK (gender IN ('female', 'male', 'prefer_not_to_say')),
  qualification TEXT CHECK (qualification IN ('inter', 'bachelor', 'master', 'mphil', 'phd', 'other')),
  years_teaching TEXT CHECK (years_teaching IN ('<1', '1-2', '3-5', '6-10', '10+')),
  grades_taught JSONB, -- array of integers [1,2,3,4,5]
  snc_training BOOLEAN,
  ai_training BOOLEAN,

  -- Metadata
  timepoint TEXT NOT NULL CHECK (timepoint IN ('pre', 'post')),
  group_type TEXT NOT NULL CHECK (group_type IN ('treatment', 'control')),
  submitted_by UUID, -- teacher account UUID (from auth)

  -- Section 2: Classroom Context
  avg_class_size TEXT CHECK (avg_class_size IN ('<20', '20-30', '31-40', '41-50', '50+')),
  student_device_access TEXT CHECK (student_device_access IN ('most', 'some', 'few')),
  internet_stability TEXT CHECK (internet_stability IN ('stable', 'unstable')),
  main_constraints JSONB, -- array of strings ['size','time','devices','internet','electricity','parents']

  -- Section 3: Student English Skills (5-pt Likert, 1-5)
  skill_listening_speaking INTEGER CHECK (skill_listening_speaking BETWEEN 1 AND 5),
  skill_reading_writing INTEGER CHECK (skill_reading_writing BETWEEN 1 AND 5),
  skill_vocabulary INTEGER CHECK (skill_vocabulary BETWEEN 1 AND 5),
  skill_confidence INTEGER CHECK (skill_confidence BETWEEN 1 AND 5),

  -- Section 4: Student Learning Readiness (5-pt Likert)
  readiness_hesitation INTEGER CHECK (readiness_hesitation BETWEEN 1 AND 5),
  readiness_fear INTEGER CHECK (readiness_fear BETWEEN 1 AND 5),
  readiness_avoidance INTEGER CHECK (readiness_avoidance BETWEEN 1 AND 5),
  readiness_urdu_support INTEGER CHECK (readiness_urdu_support BETWEEN 1 AND 5),

  -- Section 5: Pedagogical Visibility (5-pt Likert)
  visibility_identify_weaknesses INTEGER CHECK (visibility_identify_weaknesses BETWEEN 1 AND 5),
  visibility_personalize INTEGER CHECK (visibility_personalize BETWEEN 1 AND 5),
  visibility_monitor_beyond INTEGER CHECK (visibility_monitor_beyond BETWEEN 1 AND 5),

  -- Section 6: Teaching Confidence (5-pt Likert)
  confidence_explain INTEGER CHECK (confidence_explain BETWEEN 1 AND 5),
  confidence_design_activities INTEGER CHECK (confidence_design_activities BETWEEN 1 AND 5),
  confidence_safe_environment INTEGER CHECK (confidence_safe_environment BETWEEN 1 AND 5),

  -- Section 7: PrimePal Usefulness (5-pt Likert, post-only, nullable)
  usefulness_improves_learning INTEGER CHECK (usefulness_improves_learning BETWEEN 1 AND 5),
  usefulness_notice_weaknesses INTEGER CHECK (usefulness_notice_weaknesses BETWEEN 1 AND 5),
  usefulness_home_realistic INTEGER CHECK (usefulness_home_realistic BETWEEN 1 AND 5),

  -- Section 8: PrimePal Impact (post-only, nullable)
  impact_helped_students INTEGER CHECK (impact_helped_students BETWEEN 1 AND 5),
  impact_helped_identify_weaknesses INTEGER CHECK (impact_helped_identify_weaknesses BETWEEN 1 AND 5),
  impact_would_recommend INTEGER CHECK (impact_would_recommend BETWEEN 1 AND 5),
  impact_most_valuable JSONB, -- array of strings (checkboxes)
  impact_improvements JSONB, -- array of strings (checkboxes)

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_timepoint ON teacher_evaluations(timepoint);
CREATE INDEX IF NOT EXISTS idx_teacher_evaluations_submitted_by ON teacher_evaluations(submitted_by);

-- RLS
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON teacher_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers can read all evaluations" ON teacher_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can insert evaluations" ON teacher_evaluations FOR INSERT TO authenticated WITH CHECK (true);
