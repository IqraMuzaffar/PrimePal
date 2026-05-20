-- 040: Seed post-test v2 evaluation questions
-- Replaces existing post-test questions with expanded 22-question instrument:
--   Section A: Psychometric (8 likert_4pt items, indices 1-8)
--   Section B: Academic MCQs (8 per grade, indices 9-16)
--   Section C: PrimePal Feedback (6 items, indices 17-22)

-- =============================================================================
-- Step 0: Expand section CHECK constraint to allow 'feedback'
-- =============================================================================

ALTER TABLE evaluation_questions
  DROP CONSTRAINT IF EXISTS evaluation_questions_section_check;

ALTER TABLE evaluation_questions
  ADD CONSTRAINT evaluation_questions_section_check
  CHECK (section IN ('psychometric', 'academic', 'feedback'));

-- =============================================================================
-- Step 1: Delete all existing post-test questions
-- =============================================================================

DELETE FROM evaluation_questions WHERE evaluation_type = 'post';

-- =============================================================================
-- SECTION A: Confidence & Attitude — Psychometric (8 items × 5 grades)
-- likert_4pt scale, same questions for all grades, indices 1-8
-- =============================================================================

DO $$
DECLARE
  g INTEGER;
  likert_4pt JSONB := '[{"label":"Not true","value":"1"},{"label":"A little true","value":"2"},{"label":"Mostly true","value":"3"},{"label":"Very true","value":"4"}]';
BEGIN
  FOR g IN 1..5 LOOP
    INSERT INTO evaluation_questions
      (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty)
    VALUES
      (g, 'post', 'psychometric', NULL, 1,
       'I feel comfortable speaking English in class',
       'مجھے کلاس میں انگریزی بولنے میں آرام محسوس ہوتا ہے',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 2,
       'I try speaking English even if I make mistakes',
       'میں غلطیاں ہونے کے باوجود انگریزی بولنے کی کوشش کرتا/کرتی ہوں',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 3,
       'I can answer simple English questions',
       'میں آسان انگریزی سوالات کا جواب دے سکتا/سکتی ہوں',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 4,
       'I enjoy English speaking activities',
       'مجھے انگریزی بولنے کی سرگرمیاں پسند ہیں',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 5,
       'I feel shy when speaking English',
       'مجھے انگریزی بولتے وقت شرم آتی ہے',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 6,
       'I worry others will laugh if I speak incorrect English',
       'مجھے فکر ہوتی ہے کہ غلط انگریزی بولنے پر لوگ ہنسیں گے',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 7,
       'I can ask for help in English when I need it',
       'جب ضرورت ہو تو میں انگریزی میں مدد مانگ سکتا/سکتی ہوں',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'psychometric', NULL, 8,
       'I want to speak more English at school and at home',
       'میں سکول اور گھر میں زیادہ انگریزی بولنا چاہتا/چاہتی ہوں',
       'likert_4pt', likert_4pt, NULL, 'medium');
  END LOOP;
END $$;

-- =============================================================================
-- SECTION B: Academic MCQs — Grade-wise (8 per grade, indices 9-16)
-- =============================================================================

-- ─── GRADE 1 (easy) ─────────────────────────────────────────────────────────

INSERT INTO evaluation_questions
  (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'post', 'academic', 'reading', 9,
 'Which word rhymes with ''cat''?',
 'کون سا لفظ ''cat'' سے ملتا جلتا ہے؟',
 'multiple_choice',
 '[{"label":"bat","value":"bat"},{"label":"dog","value":"dog"},{"label":"sun","value":"sun"}]',
 'bat', 'easy', NULL),

(1, 'post', 'academic', 'reading', 10,
 'The bird is in the ___.',
 'پرندہ ___ میں ہے۔',
 'multiple_choice',
 '[{"label":"tree","value":"tree"},{"label":"run","value":"run"},{"label":"big","value":"big"}]',
 'tree', 'easy', NULL),

(1, 'post', 'academic', 'writing', 11,
 'Choose the missing letter: D_G',
 'گم حرف چنیں: D_G',
 'multiple_choice',
 '[{"label":"O","value":"O"},{"label":"A","value":"A"},{"label":"U","value":"U"}]',
 'O', 'easy', NULL),

(1, 'post', 'academic', 'writing', 12,
 'Which is a naming word (noun)?',
 'کون سا نام والا لفظ (اسم) ہے؟',
 'multiple_choice',
 '[{"label":"run","value":"run"},{"label":"ball","value":"ball"},{"label":"fast","value":"fast"}]',
 'ball', 'easy', NULL),

(1, 'post', 'academic', 'listening', 13,
 'Which word starts with the sound ''mmm''?',
 'کون سا لفظ ''ممم'' کی آواز سے شروع ہوتا ہے؟',
 'multiple_choice',
 '[{"label":"moon","value":"moon"},{"label":"sun","value":"sun"},{"label":"star","value":"star"}]',
 'moon', 'easy', 'moon'),

(1, 'post', 'academic', 'listening', 14,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"apple","value":"apple"},{"label":"table","value":"table"},{"label":"happy","value":"happy"}]',
 'apple', 'easy', 'apple'),

(1, 'post', 'academic', 'speaking', 15,
 'Which picture shows ''happy''?',
 'کون سی تصویر ''خوش'' دکھاتی ہے؟',
 'multiple_choice',
 '[{"label":"😊 Happy face","value":"Happy face"},{"label":"😢 Sad face","value":"Sad face"},{"label":"😴 Sleepy face","value":"Sleepy face"}]',
 'Happy face', 'easy', NULL),

(1, 'post', 'academic', 'reading', 16,
 'Ali has a red ___.',
 'علی کے پاس ایک سرخ ___ ہے۔',
 'multiple_choice',
 '[{"label":"ball","value":"ball"},{"label":"tall","value":"tall"},{"label":"wall","value":"wall"}]',
 'ball', 'easy', NULL);

-- ─── GRADE 2 (easy-medium) ──────────────────────────────────────────────────

INSERT INTO evaluation_questions
  (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(2, 'post', 'academic', 'reading', 9,
 'She ___ to school every day.',
 'وہ ہر روز سکول ___ ہے۔',
 'multiple_choice',
 '[{"label":"goes","value":"goes"},{"label":"go","value":"go"},{"label":"going","value":"going"}]',
 'goes', 'easy', NULL),

(2, 'post', 'academic', 'writing', 10,
 'What is the past tense of ''play''?',
 '''play'' کا ماضی کیا ہے؟',
 'multiple_choice',
 '[{"label":"played","value":"played"},{"label":"plays","value":"plays"},{"label":"playing","value":"playing"}]',
 'played', 'easy', NULL),

(2, 'post', 'academic', 'reading', 11,
 'Which sentence is correct?',
 'کون سا جملہ درست ہے؟',
 'multiple_choice',
 '[{"label":"The cat is big.","value":"The cat is big."},{"label":"the cat is big","value":"the cat is big"}]',
 'The cat is big.', 'easy', NULL),

(2, 'post', 'academic', 'writing', 12,
 'Put the words in order: ''is / My / red / bag''',
 'الفاظ ترتیب میں رکھیں: ''is / My / red / bag''',
 'multiple_choice',
 '[{"label":"My bag is red","value":"My bag is red"},{"label":"Bag my is red","value":"Bag my is red"}]',
 'My bag is red', 'easy', NULL),

(2, 'post', 'academic', 'listening', 13,
 'Which word sounds like ''bear''?',
 'کون سا لفظ ''bear'' جیسا لگتا ہے؟',
 'multiple_choice',
 '[{"label":"pair","value":"pair"},{"label":"beer","value":"beer"},{"label":"bare","value":"bare"}]',
 'bare', 'medium', 'bear'),

(2, 'post', 'academic', 'listening', 14,
 'Listen and choose the right word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"school","value":"school"},{"label":"stool","value":"stool"},{"label":"cool","value":"cool"}]',
 'school', 'easy', 'school'),

(2, 'post', 'academic', 'speaking', 15,
 'Which is an action word (verb)?',
 'کون سا فعل (عمل والا لفظ) ہے؟',
 'multiple_choice',
 '[{"label":"jump","value":"jump"},{"label":"apple","value":"apple"},{"label":"happy","value":"happy"}]',
 'jump', 'easy', NULL),

(2, 'post', 'academic', 'reading', 16,
 'Nora was scared on her first day because everything was ___.',
 'نورا اپنے پہلے دن ڈری ہوئی تھی کیونکہ سب کچھ ___ تھا۔',
 'multiple_choice',
 '[{"label":"new","value":"new"},{"label":"old","value":"old"},{"label":"fun","value":"fun"}]',
 'new', 'easy', NULL);

-- ─── GRADE 3 (medium) ──────────────────────────────────────────────────────

INSERT INTO evaluation_questions
  (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(3, 'post', 'academic', 'reading', 9,
 'What is the opposite of ''big''?',
 '''بڑا'' کی ضد کیا ہے؟',
 'multiple_choice',
 '[{"label":"tall","value":"tall"},{"label":"small","value":"small"},{"label":"fast","value":"fast"}]',
 'small', 'medium', NULL),

(3, 'post', 'academic', 'writing', 10,
 'Which word is an adjective in: ''The tall tree fell down''?',
 '''لمبا درخت گر گیا'' میں کون سا لفظ صفت ہے؟',
 'multiple_choice',
 '[{"label":"tall","value":"tall"},{"label":"tree","value":"tree"},{"label":"fell","value":"fell"}]',
 'tall', 'medium', NULL),

(3, 'post', 'academic', 'reading', 11,
 'What is a compound word?',
 'مرکب لفظ کون سا ہے؟',
 'multiple_choice',
 '[{"label":"sunshine","value":"sunshine"},{"label":"happy","value":"happy"},{"label":"quickly","value":"quickly"}]',
 'sunshine', 'medium', NULL),

(3, 'post', 'academic', 'writing', 12,
 'Complete: ''I wanted to play, ___ it was raining.''',
 'مکمل کریں: ''میں کھیلنا چاہتا تھا، ___ بارش ہو رہی تھی۔''',
 'multiple_choice',
 '[{"label":"but","value":"but"},{"label":"and","value":"and"},{"label":"or","value":"or"}]',
 'but', 'medium', NULL),

(3, 'post', 'academic', 'listening', 13,
 'Which sentence is complete?',
 'کون سا جملہ مکمل ہے؟',
 'multiple_choice',
 '[{"label":"The dog ran fast.","value":"The dog ran fast."},{"label":"The big brown.","value":"The big brown."}]',
 'The dog ran fast.', 'medium', 'The dog ran fast.'),

(3, 'post', 'academic', 'listening', 14,
 'What is the main idea? ''Owls are nocturnal. They hunt at night.''',
 'بنیادی خیال کیا ہے؟ ''اُلّو رات کے جانور ہیں۔ وہ رات کو شکار کرتے ہیں۔''',
 'multiple_choice',
 '[{"label":"Owls sleep at night","value":"Owls sleep at night"},{"label":"Owls are active at night","value":"Owls are active at night"},{"label":"Owls eat plants","value":"Owls eat plants"}]',
 'Owls are active at night', 'medium', 'Owls are nocturnal. They hunt at night.'),

(3, 'post', 'academic', 'speaking', 15,
 'Which is the correct plural: one child, many ___?',
 'صحیح جمع کون سی ہے: ایک بچہ، بہت سے ___؟',
 'multiple_choice',
 '[{"label":"childs","value":"childs"},{"label":"children","value":"children"},{"label":"childrens","value":"childrens"}]',
 'children', 'medium', NULL),

(3, 'post', 'academic', 'reading', 16,
 'In the story, Leo felt nervous because he had a ___.',
 'کہانی میں لیو گھبرایا ہوا تھا کیونکہ اس کا ___ تھا۔',
 'multiple_choice',
 '[{"label":"test","value":"test"},{"label":"party","value":"party"},{"label":"holiday","value":"holiday"}]',
 'test', 'medium', NULL);

-- ─── GRADE 4 (medium-hard) ─────────────────────────────────────────────────

INSERT INTO evaluation_questions
  (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(4, 'post', 'academic', 'reading', 9,
 'Which sentence uses the past progressive tense?',
 'کون سا جملہ ماضی جاری زمانہ استعمال کرتا ہے؟',
 'multiple_choice',
 '[{"label":"She was reading a book.","value":"She was reading a book."},{"label":"She reads a book.","value":"She reads a book."}]',
 'She was reading a book.', 'medium', NULL),

(4, 'post', 'academic', 'writing', 10,
 'Choose the correct punctuation: ''I like apples_bananas_and oranges''',
 'صحیح اوقاف چنیں: ''I like apples_bananas_and oranges''',
 'multiple_choice',
 '[{"label":"commas after apples and bananas","value":"commas after apples and bananas"},{"label":"no punctuation needed","value":"no punctuation needed"}]',
 'commas after apples and bananas', 'medium', NULL),

(4, 'post', 'academic', 'reading', 11,
 'What does the word ''immaculate'' mean in: ''The room was immaculate, not a speck of dust''?',
 '''The room was immaculate, not a speck of dust'' میں ''immaculate'' کا کیا مطلب ہے؟',
 'multiple_choice',
 '[{"label":"Very dirty","value":"Very dirty"},{"label":"Very clean","value":"Very clean"},{"label":"Very dark","value":"Very dark"}]',
 'Very clean', 'hard', NULL),

(4, 'post', 'academic', 'writing', 12,
 'Which is a simile?',
 'کون سی تشبیہ ہے؟',
 'multiple_choice',
 '[{"label":"He ran like the wind","value":"He ran like the wind"},{"label":"He is the wind","value":"He is the wind"},{"label":"He likes wind","value":"He likes wind"}]',
 'He ran like the wind', 'medium', NULL),

(4, 'post', 'academic', 'listening', 13,
 'What is the object of the preposition in: ''The cat sat on the mat''?',
 '''The cat sat on the mat'' میں حرف جار کا مفعول کیا ہے؟',
 'multiple_choice',
 '[{"label":"cat","value":"cat"},{"label":"sat","value":"sat"},{"label":"mat","value":"mat"}]',
 'mat', 'medium', 'The cat sat on the mat.'),

(4, 'post', 'academic', 'listening', 14,
 'Which sentence has a helping verb?',
 'کس جملے میں معاون فعل ہے؟',
 'multiple_choice',
 '[{"label":"She is singing.","value":"She is singing."},{"label":"She sings.","value":"She sings."}]',
 'She is singing.', 'medium', 'She is singing. She sings.'),

(4, 'post', 'academic', 'speaking', 15,
 'What does the prefix ''un-'' mean in ''unhappy''?',
 '''unhappy'' میں سابقہ ''un-'' کا کیا مطلب ہے؟',
 'multiple_choice',
 '[{"label":"very","value":"very"},{"label":"not","value":"not"},{"label":"before","value":"before"}]',
 'not', 'medium', NULL),

(4, 'post', 'academic', 'reading', 16,
 'Which is a FACT, not an opinion?',
 'کون سی حقیقت ہے، رائے نہیں؟',
 'multiple_choice',
 '[{"label":"Pakistan has four seasons","value":"Pakistan has four seasons"},{"label":"Summer is the best season","value":"Summer is the best season"}]',
 'Pakistan has four seasons', 'medium', NULL);

-- ─── GRADE 5 (hard) ────────────────────────────────────────────────────────

INSERT INTO evaluation_questions
  (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(5, 'post', 'academic', 'reading', 9,
 'Which sentence uses the PAST PERFECT tense?',
 'کون سا جملہ ماضی بعید زمانہ استعمال کرتا ہے؟',
 'multiple_choice',
 '[{"label":"I had already finished.","value":"I had already finished."},{"label":"I will finish.","value":"I will finish."}]',
 'I had already finished.', 'hard', NULL),

(5, 'post', 'academic', 'writing', 10,
 'What type of sentence is: ''Because it rained, the match was canceled''?',
 '''Because it rained, the match was canceled'' کس قسم کا جملہ ہے؟',
 'multiple_choice',
 '[{"label":"Simple","value":"Simple"},{"label":"Compound","value":"Compound"},{"label":"Complex","value":"Complex"}]',
 'Complex', 'hard', NULL),

(5, 'post', 'academic', 'reading', 11,
 'Which word is the ADVERB in: ''She sang beautifully''?',
 '''She sang beautifully'' میں کون سا لفظ متعلق فعل ہے؟',
 'multiple_choice',
 '[{"label":"She","value":"She"},{"label":"sang","value":"sang"},{"label":"beautifully","value":"beautifully"}]',
 'beautifully', 'hard', NULL),

(5, 'post', 'academic', 'writing', 12,
 'Choose the correct homophone: ''I have ___ dogs.''',
 'صحیح ہم آواز لفظ چنیں: ''I have ___ dogs.''',
 'multiple_choice',
 '[{"label":"to","value":"to"},{"label":"too","value":"too"},{"label":"two","value":"two"}]',
 'two', 'hard', NULL),

(5, 'post', 'academic', 'listening', 13,
 'What is the main idea of: ''Maya practiced every night and won the spelling bee''?',
 '''مایا نے ہر رات مشق کی اور اسپیلنگ بی جیت لی'' — بنیادی خیال کیا ہے؟',
 'multiple_choice',
 '[{"label":"Maya likes dictionaries","value":"Maya likes dictionaries"},{"label":"Maya overcame her nerves and won","value":"Maya overcame her nerves and won"},{"label":"Maya bought a trophy","value":"Maya bought a trophy"}]',
 'Maya overcame her nerves and won', 'hard', 'Maya practiced every night and won the spelling bee.'),

(5, 'post', 'academic', 'listening', 14,
 'What does ''apex predator'' mean?',
 '''apex predator'' کا کیا مطلب ہے؟',
 'multiple_choice',
 '[{"label":"An animal that eats plants","value":"An animal that eats plants"},{"label":"An animal at the top of the food chain","value":"An animal at the top of the food chain"}]',
 'An animal at the top of the food chain', 'hard', 'The shark is an apex predator in the ocean.'),

(5, 'post', 'academic', 'speaking', 15,
 'Which uses the most PRECISE verb?',
 'کون سا سب سے درست فعل استعمال کرتا ہے؟',
 'multiple_choice',
 '[{"label":"He went fast down the hill","value":"He went fast down the hill"},{"label":"He sprinted down the steep hill","value":"He sprinted down the steep hill"}]',
 'He sprinted down the steep hill', 'hard', NULL),

(5, 'post', 'academic', 'reading', 16,
 'What type of figurative language is: ''He ran as fast as a cheetah''?',
 '''He ran as fast as a cheetah'' کس قسم کی مجازی زبان ہے؟',
 'multiple_choice',
 '[{"label":"Simile","value":"Simile"},{"label":"Metaphor","value":"Metaphor"},{"label":"Personification","value":"Personification"}]',
 'Simile', 'hard', NULL);

-- =============================================================================
-- SECTION C: PrimePal Feedback (6 items × 5 grades, post-only, indices 17-22)
-- =============================================================================

DO $$
DECLARE
  g INTEGER;
  likert_4pt JSONB := '[{"label":"Not true","value":"1"},{"label":"A little true","value":"2"},{"label":"Mostly true","value":"3"},{"label":"Very true","value":"4"}]';
  checkbox_features JSONB := '[{"label":"Missions","value":"missions"},{"label":"Chat","value":"chat"},{"label":"Speaking Practice","value":"speaking"},{"label":"Stories","value":"stories"},{"label":"Spelling Bee","value":"spelling_bee"},{"label":"Badges & Points","value":"badges_points"},{"label":"Leaderboard","value":"leaderboard"},{"label":"Urdu Hints","value":"urdu_hints"}]';
  mc_skills JSONB := '[{"label":"Listening","value":"listening"},{"label":"Speaking","value":"speaking"},{"label":"Reading","value":"reading"},{"label":"Writing","value":"writing"}]';
  checkbox_improve JSONB := '[{"label":"More games","value":"more_games"},{"label":"Harder questions","value":"harder"},{"label":"Easier questions","value":"easier"},{"label":"More stories","value":"more_stories"},{"label":"Better speaking","value":"better_speaking"},{"label":"More Urdu help","value":"more_urdu"},{"label":"Nothing — it''s great!","value":"nothing"}]';
BEGIN
  FOR g IN 1..5 LOOP
    INSERT INTO evaluation_questions
      (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty)
    VALUES
      (g, 'post', 'feedback', NULL, 17,
       'PrimePal helped me learn English better',
       'PrimePal نے مجھے انگریزی بہتر سیکھنے میں مدد کی',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'feedback', NULL, 18,
       'I would like to keep using PrimePal',
       'میں PrimePal استعمال کرتے رہنا چاہتا/چاہتی ہوں',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'feedback', NULL, 19,
       'Was PrimePal easy to use?',
       'کیا PrimePal استعمال کرنا آسان تھا؟',
       'likert_4pt', likert_4pt, NULL, 'medium'),

      (g, 'post', 'feedback', NULL, 20,
       'Which features did you like most? (pick all)',
       'آپ کو کون سی خصوصیات سب سے زیادہ پسند آئیں؟ (سب چنیں)',
       'checkbox_multi', checkbox_features, NULL, 'medium'),

      (g, 'post', 'feedback', NULL, 21,
       'Which skill did PrimePal help you improve most?',
       'PrimePal نے آپ کی کون سی مہارت سب سے زیادہ بہتر کی؟',
       'multiple_choice', mc_skills, NULL, 'medium'),

      (g, 'post', 'feedback', NULL, 22,
       'What would make PrimePal better? (pick all)',
       'PrimePal کو بہتر بنانے کے لیے کیا ہونا چاہیے؟ (سب چنیں)',
       'checkbox_multi', checkbox_improve, NULL, 'medium');
  END LOOP;
END $$;
