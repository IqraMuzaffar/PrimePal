-- 034_add_skill_to_topics.sql
-- Add skill/pillar column to snc_topics and reorganize topics by LSRW

-- Step 1: Add skill column
ALTER TABLE snc_topics
ADD COLUMN IF NOT EXISTS skill VARCHAR(20) CHECK (skill IN ('listening', 'speaking', 'reading', 'writing'));

-- Step 2: Clear existing topics (we'll reorganize them)
DELETE FROM snc_topics;

-- Step 3: Reorganize topics by grade and skill (4-5 topics per skill)

-- ============================================================================
-- GRADE 1 Topics (Beginner Level)
-- ============================================================================

-- Grade 1 - Listening (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (1, 'listening', 'Listen to Greetings'),
  (1, 'listening', 'Follow Simple Instructions'),
  (1, 'listening', 'Identify Animals by Sound'),
  (1, 'listening', 'Listen to Numbers'),
  (1, 'listening', 'Recognize Family Words');

-- Grade 1 - Speaking (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (1, 'speaking', 'Say Greetings'),
  (1, 'speaking', 'Name Colors'),
  (1, 'speaking', 'Count Numbers 1-10'),
  (1, 'speaking', 'Name Body Parts'),
  (1, 'speaking', 'Introduce Family Members');

-- Grade 1 - Reading (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (1, 'reading', 'Phonics - Letter Sounds'),
  (1, 'reading', 'Read Color Words'),
  (1, 'reading', 'Read Number Words'),
  (1, 'reading', 'Simple CVC Words'),
  (1, 'reading', 'Match Pictures to Words');

-- Grade 1 - Writing (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (1, 'writing', 'Write Letters A-Z'),
  (1, 'writing', 'Write Numbers 1-10'),
  (1, 'writing', 'Copy Simple Words'),
  (1, 'writing', 'Trace and Write Name'),
  (1, 'writing', 'Complete Simple Sentences');

-- ============================================================================
-- GRADE 2 Topics (Elementary Level)
-- ============================================================================

-- Grade 2 - Listening (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (2, 'listening', 'Listen to Short Stories'),
  (2, 'listening', 'Follow Two-Step Instructions'),
  (2, 'listening', 'Identify Rhyming Words'),
  (2, 'listening', 'Listen for Nouns and Verbs'),
  (2, 'listening', 'Understand Food Vocabulary');

-- Grade 2 - Speaking (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (2, 'speaking', 'Describe Objects'),
  (2, 'speaking', 'Use Action Verbs'),
  (2, 'speaking', 'Talk About Food'),
  (2, 'speaking', 'Make Simple Sentences'),
  (2, 'speaking', 'Ask and Answer Questions');

-- Grade 2 - Reading (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (2, 'reading', 'Read Sight Words'),
  (2, 'reading', 'Identify Nouns'),
  (2, 'reading', 'Identify Verbs'),
  (2, 'reading', 'Read Short Sentences'),
  (2, 'reading', 'Simple Comprehension');

-- Grade 2 - Writing (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (2, 'writing', 'Write Simple Sentences'),
  (2, 'writing', 'Use Capital Letters'),
  (2, 'writing', 'Use Full Stops'),
  (2, 'writing', 'Spell Common Words'),
  (2, 'writing', 'Write About Pictures');

-- ============================================================================
-- GRADE 3 Topics (Intermediate Level)
-- ============================================================================

-- Grade 3 - Listening (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (3, 'listening', 'Listen to Passages'),
  (3, 'listening', 'Identify Main Ideas'),
  (3, 'listening', 'Follow Multi-Step Directions'),
  (3, 'listening', 'Listen for Adjectives'),
  (3, 'listening', 'Understand Time Concepts');

-- Grade 3 - Speaking (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (3, 'speaking', 'Use Adjectives'),
  (3, 'speaking', 'Express Preferences'),
  (3, 'speaking', 'Describe Events'),
  (3, 'speaking', 'Use Prepositions'),
  (3, 'speaking', 'Tell Short Stories');

-- Grade 3 - Reading (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (3, 'reading', 'Read Paragraphs'),
  (3, 'reading', 'Identify Adjectives'),
  (3, 'reading', 'Reading Comprehension'),
  (3, 'reading', 'Understand Story Sequence'),
  (3, 'reading', 'Vocabulary Building');

-- Grade 3 - Writing (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (3, 'writing', 'Write Paragraphs'),
  (3, 'writing', 'Use Punctuation'),
  (3, 'writing', 'Write Descriptive Sentences'),
  (3, 'writing', 'Use Past Tense'),
  (3, 'writing', 'Write Short Stories');

-- ============================================================================
-- GRADE 4 Topics (Upper-Intermediate Level)
-- ============================================================================

-- Grade 4 - Listening (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (4, 'listening', 'Listen to Narratives'),
  (4, 'listening', 'Identify Details'),
  (4, 'listening', 'Understand Dialogues'),
  (4, 'listening', 'Listen for Tenses'),
  (4, 'listening', 'Follow Complex Instructions');

-- Grade 4 - Speaking (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (4, 'speaking', 'Express Opinions'),
  (4, 'speaking', 'Use Different Tenses'),
  (4, 'speaking', 'Have Conversations'),
  (4, 'speaking', 'Describe Processes'),
  (4, 'speaking', 'Present Information');

-- Grade 4 - Reading (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (4, 'reading', 'Read Short Stories'),
  (4, 'reading', 'Identify Themes'),
  (4, 'reading', 'Understand Tenses'),
  (4, 'reading', 'Read for Information'),
  (4, 'reading', 'Critical Reading');

-- Grade 4 - Writing (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (4, 'writing', 'Write Essays'),
  (4, 'writing', 'Use Complex Sentences'),
  (4, 'writing', 'Write Letters'),
  (4, 'writing', 'Use Conjunctions'),
  (4, 'writing', 'Edit and Revise');

-- ============================================================================
-- GRADE 5 Topics (Advanced Level)
-- ============================================================================

-- Grade 5 - Listening (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (5, 'listening', 'Listen to Reports'),
  (5, 'listening', 'Identify Arguments'),
  (5, 'listening', 'Understand Speeches'),
  (5, 'listening', 'Listen for Inference'),
  (5, 'listening', 'Critical Listening');

-- Grade 5 - Speaking (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (5, 'speaking', 'Debate Topics'),
  (5, 'speaking', 'Give Presentations'),
  (5, 'speaking', 'Use Idioms'),
  (5, 'speaking', 'Persuasive Speaking'),
  (5, 'speaking', 'Discuss Complex Ideas');

-- Grade 5 - Reading (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (5, 'reading', 'Read Longer Texts'),
  (5, 'reading', 'Analyze Characters'),
  (5, 'reading', 'Understand Context'),
  (5, 'reading', 'Read Poetry'),
  (5, 'reading', 'Advanced Vocabulary');

-- Grade 5 - Writing (5 topics)
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (5, 'writing', 'Write Reports'),
  (5, 'writing', 'Creative Writing'),
  (5, 'writing', 'Write Persuasive Essays'),
  (5, 'writing', 'Use Advanced Grammar'),
  (5, 'writing', 'Research Writing');

-- Step 4: Create index on skill column
CREATE INDEX IF NOT EXISTS idx_snc_topics_skill ON snc_topics(skill);
CREATE INDEX IF NOT EXISTS idx_snc_topics_grade_skill ON snc_topics(grade_level, skill);

-- Step 5: Update schema to make skill NOT NULL
ALTER TABLE snc_topics ALTER COLUMN skill SET NOT NULL;
