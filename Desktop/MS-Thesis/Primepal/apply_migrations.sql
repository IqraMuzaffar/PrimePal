-- Apply migrations 034 and 035 to fix reading/writing missions

-- ============================================================================
-- Migration 034: Add skill column to snc_topics
-- ============================================================================

-- Step 1: Add skill column
ALTER TABLE snc_topics
ADD COLUMN IF NOT EXISTS skill VARCHAR(20) CHECK (skill IN ('listening', 'speaking', 'reading', 'writing'));

-- Step 2: Clear existing topics (we'll reorganize them)
DELETE FROM classroom_active_topics;
DELETE FROM grade_topic_selections;
DELETE FROM snc_topics;

-- Reset sequence
ALTER SEQUENCE snc_topics_id_seq RESTART WITH 1;

-- ============================================================================
-- Migration 035: Real SNC topics organized by LSRW skills
-- ============================================================================

-- GRADE 1 Topics
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (1, 'listening', 'Story Sequencing'),
  (1, 'listening', 'Fact vs. Fiction'),
  (1, 'listening', 'Main Idea'),
  (1, 'listening', 'Rhyming Words'),
  (1, 'listening', 'Following Instructions'),
  (1, 'speaking', 'Nouns and Pronouns'),
  (1, 'speaking', 'Verbs'),
  (1, 'speaking', 'Adjectives'),
  (1, 'speaking', 'Synonyms and Antonyms'),
  (1, 'speaking', 'Compound Words'),
  (1, 'reading', 'Phonics (Letter Sounds)'),
  (1, 'reading', 'Sight Words'),
  (1, 'reading', 'Homophones'),
  (1, 'reading', 'Word Endings (-ing, -ed)'),
  (1, 'reading', 'Story Comprehension'),
  (1, 'writing', 'Punctuation'),
  (1, 'writing', 'Capitalization'),
  (1, 'writing', 'Spelling (CVC Words)'),
  (1, 'writing', 'Sentence Writing'),
  (1, 'writing', 'Letter Formation');

-- GRADE 2 Topics
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (2, 'listening', 'Story Sequencing'),
  (2, 'listening', 'Main Idea & Details'),
  (2, 'listening', 'Story Elements'),
  (2, 'listening', 'Context Clues'),
  (2, 'listening', 'Following Multi-Step Directions'),
  (2, 'speaking', 'Nouns (Plurals, Proper Nouns)'),
  (2, 'speaking', 'Verbs (Tenses)'),
  (2, 'speaking', 'Adjectives and Adverbs'),
  (2, 'speaking', 'Pronouns'),
  (2, 'speaking', 'Multiple Meaning Words'),
  (2, 'reading', 'Phonics (Vowel Teams, Blends)'),
  (2, 'reading', 'Sight Words'),
  (2, 'reading', 'Synonyms & Antonyms'),
  (2, 'reading', 'Homophones'),
  (2, 'reading', 'Compound Words'),
  (2, 'writing', 'Punctuation'),
  (2, 'writing', 'Capitalization'),
  (2, 'writing', 'Prefixes & Suffixes'),
  (2, 'writing', 'Shades of Meaning'),
  (2, 'writing', 'Word Scrambles');

-- GRADE 3 Topics
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (3, 'listening', 'Fact vs. Opinion'),
  (3, 'listening', 'Cause & Effect'),
  (3, 'listening', 'Inferences & Prediction'),
  (3, 'listening', 'Main Idea & Supporting Details'),
  (3, 'listening', 'Story Elements & Sequencing'),
  (3, 'speaking', 'Nouns (Regular, Irregular, Plurals)'),
  (3, 'speaking', 'Verbs (Tenses & Subject-Verb Agreement)'),
  (3, 'speaking', 'Adjectives & Adverbs'),
  (3, 'speaking', 'Idioms & Similes'),
  (3, 'speaking', 'Pronouns'),
  (3, 'reading', 'Consonant Digraphs & Trigraphs'),
  (3, 'reading', 'Vowel Diphthongs'),
  (3, 'reading', 'Silent Letters'),
  (3, 'reading', 'Compound Words'),
  (3, 'reading', 'Context Clues'),
  (3, 'writing', 'Punctuation & Capitalization'),
  (3, 'writing', 'Sentence Structure (Fragments vs. Complete)'),
  (3, 'writing', 'Prefixes & Suffixes'),
  (3, 'writing', 'Homophones (their/there/they''re)'),
  (3, 'writing', 'Multiple Meaning Words');

-- GRADE 4 Topics
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (4, 'listening', 'Author''s Purpose'),
  (4, 'listening', 'Making Inferences & Conclusions'),
  (4, 'listening', 'Fact vs. Opinion'),
  (4, 'listening', 'Compare & Contrast'),
  (4, 'listening', 'Cause & Effect'),
  (4, 'speaking', 'Verbs & Verb Tenses'),
  (4, 'speaking', 'Pronouns'),
  (4, 'speaking', 'Adjectives & Adverbs'),
  (4, 'speaking', 'Idioms & Proverbs'),
  (4, 'speaking', 'Similes & Metaphors'),
  (4, 'reading', 'Word Parts & Joining (Syllabication)'),
  (4, 'reading', 'Advanced Spelling Patterns'),
  (4, 'reading', 'Synonyms & Antonyms'),
  (4, 'reading', 'Homophones (lose/loose)'),
  (4, 'reading', 'Context Clues'),
  (4, 'writing', 'Punctuation (Apostrophes)'),
  (4, 'writing', 'Capitalization'),
  (4, 'writing', 'Sentence Correction (Run-ons, Fragments)'),
  (4, 'writing', 'Prefixes & Suffixes'),
  (4, 'writing', 'Word Scrambles');

-- GRADE 5 Topics
INSERT INTO snc_topics (grade_level, skill, topic_name) VALUES
  (5, 'listening', 'Main Idea & Supporting Details'),
  (5, 'listening', 'Sequencing Events'),
  (5, 'listening', 'Story Elements & Character Traits'),
  (5, 'listening', 'Inference & Prediction'),
  (5, 'listening', 'Author''s Purpose'),
  (5, 'speaking', 'Advanced Verbs (Perfect Tenses)'),
  (5, 'speaking', 'Pronouns (Relative, Possessive)'),
  (5, 'speaking', 'Adjectives & Adverbs (Comparative)'),
  (5, 'speaking', 'Prepositions & Conjunctions'),
  (5, 'speaking', 'Idioms & Similes/Metaphors'),
  (5, 'reading', 'Complex Spelling Rules'),
  (5, 'reading', 'Multiple Syllables & Contractions'),
  (5, 'reading', 'Synonyms & Antonyms'),
  (5, 'reading', 'Homophones & Homographs'),
  (5, 'reading', 'Context Clues'),
  (5, 'writing', 'Punctuation (Commas, Quotations)'),
  (5, 'writing', 'Sentence Structure (Simple, Compound, Complex)'),
  (5, 'writing', 'Prefixes & Suffixes (Application)'),
  (5, 'writing', 'Consonant Blends & Alternate Endings'),
  (5, 'writing', 'Essay Writing');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_snc_topics_skill ON snc_topics(skill);
CREATE INDEX IF NOT EXISTS idx_snc_topics_grade_skill ON snc_topics(grade_level, skill);

-- Make skill NOT NULL
ALTER TABLE snc_topics ALTER COLUMN skill SET NOT NULL;

-- Verify counts
SELECT grade_level, skill, COUNT(*) as topic_count
FROM snc_topics
GROUP BY grade_level, skill
ORDER BY grade_level, skill;
