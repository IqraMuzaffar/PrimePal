-- Feature: Spelling Bee
-- Add spelling_bee interaction type to student_interactions

ALTER TABLE student_interactions
  DROP CONSTRAINT IF EXISTS student_interactions_interaction_type_check;

ALTER TABLE student_interactions
  ADD CONSTRAINT student_interactions_interaction_type_check
  CHECK (interaction_type IN ('chat', 'mission_mc', 'mission_fill', 'spelling_bee'));
