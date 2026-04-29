-- 023_snc_topics_and_active_topics.sql

-- Predefined SNC English topics (global, grade-scoped)
CREATE TABLE IF NOT EXISTS snc_topics (
  id SERIAL PRIMARY KEY,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 5),
  topic_name TEXT NOT NULL
);

-- Per-classroom topic activation
-- If no rows exist for a classroom → treat ALL grade topics as active
CREATE TABLE IF NOT EXISTS classroom_active_topics (
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES snc_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (classroom_id, topic_id)
);

-- Seed: Grade 1
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (1, 'Phonics'),
  (1, 'Colors'),
  (1, 'Numbers'),
  (1, 'Animals'),
  (1, 'Family'),
  (1, 'Body Parts'),
  (1, 'Greetings');

-- Seed: Grade 2
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (2, 'Nouns'),
  (2, 'Verbs'),
  (2, 'Adjectives'),
  (2, 'Food & Drink'),
  (2, 'Community'),
  (2, 'Simple Sentences'),
  (2, 'Rhyming');

-- Seed: Grade 3
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (3, 'Prepositions'),
  (3, 'Tenses'),
  (3, 'Reading Comprehension'),
  (3, 'Vocabulary'),
  (3, 'Punctuation'),
  (3, 'Story Sequencing');

-- Seed: Grade 4
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (4, 'Grammar'),
  (4, 'Composition'),
  (4, 'Idioms'),
  (4, 'Letter Writing'),
  (4, 'Synonyms & Antonyms'),
  (4, 'Paragraphs');

-- Seed: Grade 5
INSERT INTO snc_topics (grade_level, topic_name) VALUES
  (5, 'Complex Sentences'),
  (5, 'Literature'),
  (5, 'Technical Vocabulary'),
  (5, 'Essay Writing'),
  (5, 'Figurative Language'),
  (5, 'Debate');

-- RLS: teachers can read all topics (no insert/delete — admin-only via SQL)
ALTER TABLE snc_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select_all" ON snc_topics FOR SELECT USING (true);

-- RLS: teachers can manage their own classroom's active topics
ALTER TABLE classroom_active_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_topics_select" ON classroom_active_topics
  FOR SELECT USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "active_topics_insert" ON classroom_active_topics
  FOR INSERT WITH CHECK (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "active_topics_delete" ON classroom_active_topics
  FOR DELETE USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );
