-- A01: Seed evaluation questions for grades 1-5
-- Each grade gets: 3 psychometric + 10 academic per evaluation_type (pre/post)

-- =============================================================================
-- PSYCHOMETRIC QUESTIONS (same for all grades, both pre and post)
-- =============================================================================

-- Helper: insert psychometric questions for a given grade and evaluation_type
-- We repeat the INSERT for each (grade, type) combination.

DO $$
DECLARE
  g INTEGER;
  etype TEXT;
  likert_options JSONB := '[{"label":"Happy","value":3,"emoji":"😊"},{"label":"Okay","value":2,"emoji":"😐"},{"label":"Sad","value":1,"emoji":"😢"}]';
BEGIN
  FOR g IN 1..5 LOOP
    FOREACH etype IN ARRAY ARRAY['pre','post'] LOOP
      INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty)
      VALUES
        (g, etype, 'psychometric', NULL, 1,
         'How do you feel about speaking English?',
         'آپ کو انگریزی بولنے کے بارے میں کیسا لگتا ہے؟',
         'likert_emoji', likert_options, NULL, 'medium'),
        (g, etype, 'psychometric', NULL, 2,
         'How do you feel about reading English?',
         'آپ کو انگریزی پڑھنے کے بارے میں کیسا لگتا ہے؟',
         'likert_emoji', likert_options, NULL, 'medium'),
        (g, etype, 'psychometric', NULL, 3,
         'How confident are you in learning English?',
         'انگریزی سیکھنے میں آپ کو کتنا اعتماد ہے؟',
         'likert_emoji', likert_options, NULL, 'medium');
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- GRADE 1 — PRE-TEST ACADEMIC (10 questions)
-- =============================================================================

-- Reading (3)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'pre', 'academic', 'reading', 4,
 'The cat is on the ___.',
 'بلی ___ پر ہے۔',
 'multiple_choice',
 '[{"label":"mat","value":"mat"},{"label":"bat","value":"bat"},{"label":"rat","value":"rat"}]',
 'mat', 'easy', NULL),

(1, 'pre', 'academic', 'reading', 5,
 'What color is an apple?',
 'سیب کا رنگ کیا ہے؟',
 'multiple_choice',
 '[{"label":"Blue","value":"blue"},{"label":"Red","value":"red"},{"label":"Green","value":"green"}]',
 'red', 'easy', NULL),

(1, 'pre', 'academic', 'reading', 6,
 'A dog can ___.',
 'کتا ___ سکتا ہے۔',
 'multiple_choice',
 '[{"label":"fly","value":"fly"},{"label":"run","value":"run"},{"label":"swim","value":"swim"}]',
 'run', 'easy', NULL);

-- Writing (2)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'pre', 'academic', 'writing', 7,
 'Choose the missing letter: C _ T',
 'گم حرف چنیں: C _ T',
 'multiple_choice',
 '[{"label":"A","value":"A"},{"label":"O","value":"O"},{"label":"U","value":"U"}]',
 'A', 'easy', NULL),

(1, 'pre', 'academic', 'writing', 8,
 'Choose the missing letter: D _ G',
 'گم حرف چنیں: D _ G',
 'multiple_choice',
 '[{"label":"O","value":"O"},{"label":"A","value":"A"},{"label":"I","value":"I"}]',
 'O', 'easy', NULL);

-- Listening (3)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'pre', 'academic', 'listening', 9,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Ball","value":"ball"},{"label":"Doll","value":"doll"},{"label":"Wall","value":"wall"}]',
 'ball', 'easy', 'ball'),

(1, 'pre', 'academic', 'listening', 10,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Cat","value":"cat"},{"label":"Cup","value":"cup"},{"label":"Car","value":"car"}]',
 'cat', 'easy', 'cat'),

(1, 'pre', 'academic', 'listening', 11,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Book","value":"book"},{"label":"Look","value":"look"},{"label":"Cook","value":"cook"}]',
 'book', 'easy', 'book');

-- Speaking (2)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'pre', 'academic', 'speaking', 12,
 'Say this word: "Hello"',
 'یہ لفظ بولیں: "Hello"',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'Hello'),

(1, 'pre', 'academic', 'speaking', 13,
 'Say this word: "School"',
 'یہ لفظ بولیں: "School"',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'School');

-- =============================================================================
-- GRADE 1 — POST-TEST ACADEMIC (10 questions, same format, different vocabulary)
-- =============================================================================

-- Reading (3)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'post', 'academic', 'reading', 4,
 'The bird is in the ___.',
 'پرندہ ___ میں ہے۔',
 'multiple_choice',
 '[{"label":"tree","value":"tree"},{"label":"three","value":"three"},{"label":"free","value":"free"}]',
 'tree', 'easy', NULL),

(1, 'post', 'academic', 'reading', 5,
 'What color is the sky?',
 'آسمان کا رنگ کیا ہے؟',
 'multiple_choice',
 '[{"label":"Red","value":"red"},{"label":"Blue","value":"blue"},{"label":"Yellow","value":"yellow"}]',
 'blue', 'easy', NULL),

(1, 'post', 'academic', 'reading', 6,
 'A fish can ___.',
 'مچھلی ___ سکتی ہے۔',
 'multiple_choice',
 '[{"label":"fly","value":"fly"},{"label":"run","value":"run"},{"label":"swim","value":"swim"}]',
 'swim', 'easy', NULL);

-- Writing (2)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'post', 'academic', 'writing', 7,
 'Choose the missing letter: H _ T',
 'گم حرف چنیں: H _ T',
 'multiple_choice',
 '[{"label":"A","value":"A"},{"label":"O","value":"O"},{"label":"I","value":"I"}]',
 'A', 'easy', NULL),

(1, 'post', 'academic', 'writing', 8,
 'Choose the missing letter: P _ N',
 'گم حرف چنیں: P _ N',
 'multiple_choice',
 '[{"label":"E","value":"E"},{"label":"A","value":"A"},{"label":"I","value":"I"}]',
 'E', 'easy', NULL);

-- Listening (3)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'post', 'academic', 'listening', 9,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Sun","value":"sun"},{"label":"Fun","value":"fun"},{"label":"Run","value":"run"}]',
 'sun', 'easy', 'sun'),

(1, 'post', 'academic', 'listening', 10,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Hen","value":"hen"},{"label":"Pen","value":"pen"},{"label":"Ten","value":"ten"}]',
 'hen', 'easy', 'hen'),

(1, 'post', 'academic', 'listening', 11,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Red","value":"red"},{"label":"Bed","value":"bed"},{"label":"Led","value":"led"}]',
 'red', 'easy', 'red');

-- Speaking (2)
INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
(1, 'post', 'academic', 'speaking', 12,
 'Say this word: "Thank you"',
 'یہ لفظ بولیں: "Thank you"',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'Thank you'),

(1, 'post', 'academic', 'speaking', 13,
 'Say this word: "Friend"',
 'یہ لفظ بولیں: "Friend"',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'Friend');

-- =============================================================================
-- GRADE 2 — PRE-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(2, 'pre', 'academic', 'reading', 4,
 'Ali has a pet. It is a ___. It likes milk.',
 'علی کے پاس ایک پالتو جانور ہے۔ یہ ___ ہے۔ اسے دودھ پسند ہے۔',
 'multiple_choice',
 '[{"label":"cat","value":"cat"},{"label":"hen","value":"hen"},{"label":"cow","value":"cow"}]',
 'cat', 'easy', NULL),

(2, 'pre', 'academic', 'reading', 5,
 'We go to ___ to study.',
 'ہم پڑھنے کے لیے ___ جاتے ہیں۔',
 'multiple_choice',
 '[{"label":"market","value":"market"},{"label":"school","value":"school"},{"label":"park","value":"park"}]',
 'school', 'easy', NULL),

(2, 'pre', 'academic', 'reading', 6,
 'My mother cooks ___.',
 'میری امی ___ پکاتی ہیں۔',
 'multiple_choice',
 '[{"label":"books","value":"books"},{"label":"food","value":"food"},{"label":"toys","value":"toys"}]',
 'food', 'easy', NULL),

-- Writing (2)
(2, 'pre', 'academic', 'writing', 7,
 'Choose the correct word: I ___ to school every day.',
 'صحیح لفظ چنیں: I ___ to school every day.',
 'multiple_choice',
 '[{"label":"go","value":"go"},{"label":"goes","value":"goes"},{"label":"going","value":"going"}]',
 'go', 'easy', NULL),

(2, 'pre', 'academic', 'writing', 8,
 'Choose the missing word: She ___ a red bag.',
 'گم لفظ چنیں: She ___ a red bag.',
 'multiple_choice',
 '[{"label":"has","value":"has"},{"label":"have","value":"have"},{"label":"had","value":"had"}]',
 'has', 'easy', NULL),

-- Listening (3)
(2, 'pre', 'academic', 'listening', 9,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Family","value":"family"},{"label":"Flower","value":"flower"},{"label":"Farmer","value":"farmer"}]',
 'family', 'easy', 'family'),

(2, 'pre', 'academic', 'listening', 10,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Garden","value":"garden"},{"label":"Pardon","value":"pardon"},{"label":"Warden","value":"warden"}]',
 'garden', 'easy', 'garden'),

(2, 'pre', 'academic', 'listening', 11,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Teacher","value":"teacher"},{"label":"Preacher","value":"preacher"},{"label":"Creature","value":"creature"}]',
 'teacher', 'easy', 'teacher'),

-- Speaking (2)
(2, 'pre', 'academic', 'speaking', 12,
 'Say this sentence: "My name is ___."',
 'یہ جملہ بولیں: "My name is ___."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'My name is Ali.'),

(2, 'pre', 'academic', 'speaking', 13,
 'Say this sentence: "I like to play."',
 'یہ جملہ بولیں: "I like to play."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'I like to play.');

-- =============================================================================
-- GRADE 2 — POST-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(2, 'post', 'academic', 'reading', 4,
 'Sara has a bird. It is ___. It can sing.',
 'سارا کے پاس ایک پرندہ ہے۔ یہ ___ ہے۔ یہ گا سکتا ہے۔',
 'multiple_choice',
 '[{"label":"green","value":"green"},{"label":"big","value":"big"},{"label":"small","value":"small"}]',
 'small', 'easy', NULL),

(2, 'post', 'academic', 'reading', 5,
 'We play in the ___.',
 'ہم ___ میں کھیلتے ہیں۔',
 'multiple_choice',
 '[{"label":"kitchen","value":"kitchen"},{"label":"park","value":"park"},{"label":"bedroom","value":"bedroom"}]',
 'park', 'easy', NULL),

(2, 'post', 'academic', 'reading', 6,
 'My father drives a ___.',
 'میرے ابو ___ چلاتے ہیں۔',
 'multiple_choice',
 '[{"label":"chair","value":"chair"},{"label":"car","value":"car"},{"label":"kite","value":"kite"}]',
 'car', 'easy', NULL),

-- Writing (2)
(2, 'post', 'academic', 'writing', 7,
 'Choose the correct word: She ___ to the market.',
 'صحیح لفظ چنیں: She ___ to the market.',
 'multiple_choice',
 '[{"label":"go","value":"go"},{"label":"goes","value":"goes"},{"label":"going","value":"going"}]',
 'goes', 'easy', NULL),

(2, 'post', 'academic', 'writing', 8,
 'Choose the missing word: They ___ two brothers.',
 'گم لفظ چنیں: They ___ two brothers.',
 'multiple_choice',
 '[{"label":"has","value":"has"},{"label":"have","value":"have"},{"label":"is","value":"is"}]',
 'have', 'easy', NULL),

-- Listening (3)
(2, 'post', 'academic', 'listening', 9,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Brother","value":"brother"},{"label":"Mother","value":"mother"},{"label":"Other","value":"other"}]',
 'brother', 'easy', 'brother'),

(2, 'post', 'academic', 'listening', 10,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Window","value":"window"},{"label":"Pillow","value":"pillow"},{"label":"Yellow","value":"yellow"}]',
 'window', 'easy', 'window'),

(2, 'post', 'academic', 'listening', 11,
 'What did you hear?',
 'آپ نے کیا سنا؟',
 'multiple_choice',
 '[{"label":"Hospital","value":"hospital"},{"label":"Festival","value":"festival"},{"label":"Animal","value":"animal"}]',
 'hospital', 'easy', 'hospital'),

-- Speaking (2)
(2, 'post', 'academic', 'speaking', 12,
 'Say this sentence: "Good morning, teacher."',
 'یہ جملہ بولیں: "Good morning, teacher."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'Good morning, teacher.'),

(2, 'post', 'academic', 'speaking', 13,
 'Say this sentence: "I have a red bag."',
 'یہ جملہ بولیں: "I have a red bag."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'easy', 'I have a red bag.');

-- =============================================================================
-- GRADE 3 — PRE-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(3, 'pre', 'academic', 'reading', 4,
 'The farmer grows wheat in the ___.',
 'کسان ___ میں گندم اگاتا ہے۔',
 'multiple_choice',
 '[{"label":"field","value":"field"},{"label":"house","value":"house"},{"label":"river","value":"river"}]',
 'field', 'medium', NULL),

(3, 'pre', 'academic', 'reading', 5,
 'Eid is a ___ festival in Pakistan.',
 'عید پاکستان میں ایک ___ تہوار ہے۔',
 'multiple_choice',
 '[{"label":"sad","value":"sad"},{"label":"happy","value":"happy"},{"label":"small","value":"small"}]',
 'happy', 'medium', NULL),

(3, 'pre', 'academic', 'reading', 6,
 'The sun rises in the ___.',
 'سورج ___ میں طلوع ہوتا ہے۔',
 'multiple_choice',
 '[{"label":"west","value":"west"},{"label":"east","value":"east"},{"label":"north","value":"north"}]',
 'east', 'medium', NULL),

-- Writing (2)
(3, 'pre', 'academic', 'writing', 7,
 'Choose the correct sentence:',
 'صحیح جملہ چنیں:',
 'multiple_choice',
 '[{"label":"He go to school.","value":"a"},{"label":"He goes to school.","value":"b"},{"label":"He going to school.","value":"c"}]',
 'b', 'medium', NULL),

(3, 'pre', 'academic', 'writing', 8,
 'Fill in the blank: The children ___ playing cricket.',
 'خالی جگہ پر کریں: The children ___ playing cricket.',
 'multiple_choice',
 '[{"label":"is","value":"is"},{"label":"are","value":"are"},{"label":"am","value":"am"}]',
 'are', 'medium', NULL),

-- Listening (3)
(3, 'pre', 'academic', 'listening', 9,
 'Listen and choose the correct word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"Beautiful","value":"beautiful"},{"label":"Wonderful","value":"wonderful"},{"label":"Powerful","value":"powerful"}]',
 'beautiful', 'medium', 'beautiful'),

(3, 'pre', 'academic', 'listening', 10,
 'Listen and choose the correct word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"Vegetable","value":"vegetable"},{"label":"Festival","value":"festival"},{"label":"Hospital","value":"hospital"}]',
 'vegetable', 'medium', 'vegetable'),

(3, 'pre', 'academic', 'listening', 11,
 'Listen and choose the correct word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"Important","value":"important"},{"label":"Elephant","value":"elephant"},{"label":"Different","value":"different"}]',
 'important', 'medium', 'important'),

-- Speaking (2)
(3, 'pre', 'academic', 'speaking', 12,
 'Say this sentence: "Pakistan is my country."',
 'یہ جملہ بولیں: "Pakistan is my country."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'Pakistan is my country.'),

(3, 'pre', 'academic', 'speaking', 13,
 'Say this sentence: "I like to read books."',
 'یہ جملہ بولیں: "I like to read books."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'I like to read books.');

-- =============================================================================
-- GRADE 3 — POST-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(3, 'post', 'academic', 'reading', 4,
 'The fisherman catches fish in the ___.',
 'ماہی گیر ___ میں مچھلی پکڑتا ہے۔',
 'multiple_choice',
 '[{"label":"mountain","value":"mountain"},{"label":"river","value":"river"},{"label":"desert","value":"desert"}]',
 'river', 'medium', NULL),

(3, 'post', 'academic', 'reading', 5,
 'Spring is a ___ season.',
 'بہار ایک ___ موسم ہے۔',
 'multiple_choice',
 '[{"label":"cold","value":"cold"},{"label":"pleasant","value":"pleasant"},{"label":"dark","value":"dark"}]',
 'pleasant', 'medium', NULL),

(3, 'post', 'academic', 'reading', 6,
 'The moon comes out at ___.',
 'چاند ___ میں نکلتا ہے۔',
 'multiple_choice',
 '[{"label":"morning","value":"morning"},{"label":"night","value":"night"},{"label":"afternoon","value":"afternoon"}]',
 'night', 'medium', NULL),

-- Writing (2)
(3, 'post', 'academic', 'writing', 7,
 'Choose the correct sentence:',
 'صحیح جملہ چنیں:',
 'multiple_choice',
 '[{"label":"She drink milk.","value":"a"},{"label":"She drinks milk.","value":"b"},{"label":"She drinking milk.","value":"c"}]',
 'b', 'medium', NULL),

(3, 'post', 'academic', 'writing', 8,
 'Fill in the blank: My sister ___ very kind.',
 'خالی جگہ پر کریں: My sister ___ very kind.',
 'multiple_choice',
 '[{"label":"is","value":"is"},{"label":"are","value":"are"},{"label":"am","value":"am"}]',
 'is', 'medium', NULL),

-- Listening (3)
(3, 'post', 'academic', 'listening', 9,
 'Listen and choose the correct word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"Butterfly","value":"butterfly"},{"label":"Dragonfly","value":"dragonfly"},{"label":"Firefly","value":"firefly"}]',
 'butterfly', 'medium', 'butterfly'),

(3, 'post', 'academic', 'listening', 10,
 'Listen and choose the correct word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"Mountain","value":"mountain"},{"label":"Fountain","value":"fountain"},{"label":"Captain","value":"captain"}]',
 'mountain', 'medium', 'mountain'),

(3, 'post', 'academic', 'listening', 11,
 'Listen and choose the correct word.',
 'سنیں اور صحیح لفظ چنیں۔',
 'multiple_choice',
 '[{"label":"Tomorrow","value":"tomorrow"},{"label":"Yesterday","value":"yesterday"},{"label":"Together","value":"together"}]',
 'tomorrow', 'medium', 'tomorrow'),

-- Speaking (2)
(3, 'post', 'academic', 'speaking', 12,
 'Say this sentence: "We should help each other."',
 'یہ جملہ بولیں: "We should help each other."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'We should help each other.'),

(3, 'post', 'academic', 'speaking', 13,
 'Say this sentence: "The weather is very nice today."',
 'یہ جملہ بولیں: "The weather is very nice today."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'The weather is very nice today.');

-- =============================================================================
-- GRADE 4 — PRE-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(4, 'pre', 'academic', 'reading', 4,
 'The Indus River flows through ___.',
 'دریائے سندھ ___ سے گزرتا ہے۔',
 'multiple_choice',
 '[{"label":"India only","value":"india"},{"label":"Pakistan","value":"pakistan"},{"label":"China only","value":"china"}]',
 'pakistan', 'medium', NULL),

(4, 'pre', 'academic', 'reading', 5,
 'Which word means "happy"?',
 'کون سا لفظ "خوش" کا مطلب ہے؟',
 'multiple_choice',
 '[{"label":"Joyful","value":"joyful"},{"label":"Angry","value":"angry"},{"label":"Tired","value":"tired"}]',
 'joyful', 'medium', NULL),

(4, 'pre', 'academic', 'reading', 6,
 'Choose the correct meaning: "Brave" means ___.',
 'صحیح معنی چنیں: "Brave" کا مطلب ___۔',
 'multiple_choice',
 '[{"label":"scared","value":"scared"},{"label":"courageous","value":"courageous"},{"label":"lazy","value":"lazy"}]',
 'courageous', 'medium', NULL),

-- Writing (2)
(4, 'pre', 'academic', 'writing', 7,
 'Choose the correct tense: Yesterday, I ___ to the market.',
 'صحیح زمانہ چنیں: Yesterday, I ___ to the market.',
 'multiple_choice',
 '[{"label":"go","value":"go"},{"label":"went","value":"went"},{"label":"will go","value":"will go"}]',
 'went', 'medium', NULL),

(4, 'pre', 'academic', 'writing', 8,
 'Choose the correct preposition: The book is ___ the table.',
 'صحیح حرف جار چنیں: The book is ___ the table.',
 'multiple_choice',
 '[{"label":"on","value":"on"},{"label":"in","value":"in"},{"label":"at","value":"at"}]',
 'on', 'medium', NULL),

-- Listening (3)
(4, 'pre', 'academic', 'listening', 9,
 'Listen and choose the correct sentence.',
 'سنیں اور صحیح جملہ چنیں۔',
 'multiple_choice',
 '[{"label":"The children are playing in the garden.","value":"a"},{"label":"The children is playing in the garden.","value":"b"},{"label":"The children was playing in the garden.","value":"c"}]',
 'a', 'medium', 'The children are playing in the garden.'),

(4, 'pre', 'academic', 'listening', 10,
 'Listen and choose the correct sentence.',
 'سنیں اور صحیح جملہ چنیں۔',
 'multiple_choice',
 '[{"label":"She has completed her homework.","value":"a"},{"label":"She have completed her homework.","value":"b"},{"label":"She completing her homework.","value":"c"}]',
 'a', 'medium', 'She has completed her homework.'),

(4, 'pre', 'academic', 'listening', 11,
 'Listen and choose the correct sentence.',
 'سنیں اور صحیح جملہ چنیں۔',
 'multiple_choice',
 '[{"label":"We will visit Lahore next week.","value":"a"},{"label":"We visiting Lahore next week.","value":"b"},{"label":"We visited Lahore next week.","value":"c"}]',
 'a', 'medium', 'We will visit Lahore next week.'),

-- Speaking (2)
(4, 'pre', 'academic', 'speaking', 12,
 'Read aloud: "Education is very important for everyone."',
 'بلند آواز میں پڑھیں: "Education is very important for everyone."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'Education is very important for everyone.'),

(4, 'pre', 'academic', 'speaking', 13,
 'Read aloud: "My favourite subject is English."',
 'بلند آواز میں پڑھیں: "My favourite subject is English."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'My favourite subject is English.');

-- =============================================================================
-- GRADE 4 — POST-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(4, 'post', 'academic', 'reading', 4,
 'K2 is the second ___ mountain in the world.',
 'K2 دنیا کا دوسرا سب سے ___ پہاڑ ہے۔',
 'multiple_choice',
 '[{"label":"smallest","value":"smallest"},{"label":"tallest","value":"tallest"},{"label":"widest","value":"widest"}]',
 'tallest', 'medium', NULL),

(4, 'post', 'academic', 'reading', 5,
 'Which word is the opposite of "difficult"?',
 'کون سا لفظ "مشکل" کی ضد ہے؟',
 'multiple_choice',
 '[{"label":"Hard","value":"hard"},{"label":"Easy","value":"easy"},{"label":"Heavy","value":"heavy"}]',
 'easy', 'medium', NULL),

(4, 'post', 'academic', 'reading', 6,
 'Choose the correct meaning: "Ancient" means ___.',
 'صحیح معنی چنیں: "Ancient" کا مطلب ___۔',
 'multiple_choice',
 '[{"label":"new","value":"new"},{"label":"very old","value":"very old"},{"label":"fast","value":"fast"}]',
 'very old', 'medium', NULL),

-- Writing (2)
(4, 'post', 'academic', 'writing', 7,
 'Choose the correct tense: Tomorrow, she ___ her grandmother.',
 'صحیح زمانہ چنیں: Tomorrow, she ___ her grandmother.',
 'multiple_choice',
 '[{"label":"visited","value":"visited"},{"label":"visits","value":"visits"},{"label":"will visit","value":"will visit"}]',
 'will visit', 'medium', NULL),

(4, 'post', 'academic', 'writing', 8,
 'Choose the correct preposition: The cat is hiding ___ the bed.',
 'صحیح حرف جار چنیں: The cat is hiding ___ the bed.',
 'multiple_choice',
 '[{"label":"on","value":"on"},{"label":"under","value":"under"},{"label":"above","value":"above"}]',
 'under', 'medium', NULL),

-- Listening (3)
(4, 'post', 'academic', 'listening', 9,
 'Listen and choose the correct sentence.',
 'سنیں اور صحیح جملہ چنیں۔',
 'multiple_choice',
 '[{"label":"The teacher explained the lesson clearly.","value":"a"},{"label":"The teacher explain the lesson clearly.","value":"b"},{"label":"The teacher explaining the lesson clearly.","value":"c"}]',
 'a', 'medium', 'The teacher explained the lesson clearly.'),

(4, 'post', 'academic', 'listening', 10,
 'Listen and choose the correct sentence.',
 'سنیں اور صحیح جملہ چنیں۔',
 'multiple_choice',
 '[{"label":"They have been waiting for an hour.","value":"a"},{"label":"They has been waiting for an hour.","value":"b"},{"label":"They been waiting for an hour.","value":"c"}]',
 'a', 'medium', 'They have been waiting for an hour.'),

(4, 'post', 'academic', 'listening', 11,
 'Listen and choose the correct sentence.',
 'سنیں اور صحیح جملہ چنیں۔',
 'multiple_choice',
 '[{"label":"Islamabad is the capital of Pakistan.","value":"a"},{"label":"Islamabad are the capital of Pakistan.","value":"b"},{"label":"Islamabad were the capital of Pakistan.","value":"c"}]',
 'a', 'medium', 'Islamabad is the capital of Pakistan.'),

-- Speaking (2)
(4, 'post', 'academic', 'speaking', 12,
 'Read aloud: "We should always respect our elders."',
 'بلند آواز میں پڑھیں: "We should always respect our elders."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'We should always respect our elders.'),

(4, 'post', 'academic', 'speaking', 13,
 'Read aloud: "The national flower of Pakistan is jasmine."',
 'بلند آواز میں پڑھیں: "The national flower of Pakistan is jasmine."',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'medium', 'The national flower of Pakistan is jasmine.');

-- =============================================================================
-- GRADE 5 — PRE-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(5, 'pre', 'academic', 'reading', 4,
 'The passage says: "Quaid-e-Azam believed in unity." What does "unity" mean?',
 'عبارت کہتی ہے: "قائداعظم اتحاد پر یقین رکھتے تھے۔" "اتحاد" کا کیا مطلب ہے؟',
 'multiple_choice',
 '[{"label":"Fighting","value":"fighting"},{"label":"Togetherness","value":"togetherness"},{"label":"Sadness","value":"sadness"}]',
 'togetherness', 'hard', NULL),

(5, 'pre', 'academic', 'reading', 5,
 'Which sentence uses the correct punctuation?',
 'کون سا جملہ صحیح اوقاف استعمال کرتا ہے؟',
 'multiple_choice',
 '[{"label":"where are you going","value":"a"},{"label":"Where are you going?","value":"b"},{"label":"Where are you going","value":"c"}]',
 'b', 'hard', NULL),

(5, 'pre', 'academic', 'reading', 6,
 'What is the main idea of: "Trees give us oxygen, shade, and fruit. We must plant more trees."',
 'اس عبارت کا بنیادی خیال کیا ہے: "درخت ہمیں آکسیجن، سایہ اور پھل دیتے ہیں۔ ہمیں زیادہ درخت لگانے چاہییں۔"',
 'multiple_choice',
 '[{"label":"Trees are tall.","value":"a"},{"label":"Trees are important and we should plant more.","value":"b"},{"label":"Fruit is delicious.","value":"c"}]',
 'b', 'hard', NULL),

-- Writing (2)
(5, 'pre', 'academic', 'writing', 7,
 'Choose the correct sentence: If I ___ a bird, I would fly.',
 'صحیح جملہ چنیں: If I ___ a bird, I would fly.',
 'multiple_choice',
 '[{"label":"am","value":"am"},{"label":"were","value":"were"},{"label":"was","value":"was"}]',
 'were', 'hard', NULL),

(5, 'pre', 'academic', 'writing', 8,
 'Choose the correct conjunction: I wanted to go outside, ___ it was raining.',
 'صحیح حرف عطف چنیں: I wanted to go outside, ___ it was raining.',
 'multiple_choice',
 '[{"label":"and","value":"and"},{"label":"but","value":"but"},{"label":"or","value":"or"}]',
 'but', 'hard', NULL),

-- Listening (3)
(5, 'pre', 'academic', 'listening', 9,
 'Listen to the sentence and choose the correct answer: What is the speaker describing?',
 'جملہ سنیں اور صحیح جواب چنیں: بولنے والا کیا بیان کر رہا ہے؟',
 'multiple_choice',
 '[{"label":"A library","value":"library"},{"label":"A hospital","value":"hospital"},{"label":"A market","value":"market"}]',
 'library', 'hard', 'A place where we can find many books and read quietly is called a library.'),

(5, 'pre', 'academic', 'listening', 10,
 'Listen to the sentence and identify the tense.',
 'جملہ سنیں اور زمانہ پہچانیں۔',
 'multiple_choice',
 '[{"label":"Past tense","value":"past"},{"label":"Present tense","value":"present"},{"label":"Future tense","value":"future"}]',
 'past', 'hard', 'The students completed their project last week.'),

(5, 'pre', 'academic', 'listening', 11,
 'Listen and choose what comes next: "First, wash your hands. Then, ___"',
 'سنیں اور اگلا قدم چنیں: "پہلے ہاتھ دھوئیں۔ پھر، ___"',
 'multiple_choice',
 '[{"label":"go to sleep","value":"sleep"},{"label":"eat your food","value":"eat"},{"label":"play outside","value":"play"}]',
 'eat', 'hard', 'First, wash your hands. Then, eat your food.'),

-- Speaking (2)
(5, 'pre', 'academic', 'speaking', 12,
 'Read this paragraph aloud: "Pakistan has four provinces. Each province has its own culture and language."',
 'یہ پیراگراف بلند آواز میں پڑھیں۔',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'hard', 'Pakistan has four provinces. Each province has its own culture and language.'),

(5, 'pre', 'academic', 'speaking', 13,
 'Read this paragraph aloud: "We should save water because it is precious. Every drop counts."',
 'یہ پیراگراف بلند آواز میں پڑھیں۔',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'hard', 'We should save water because it is precious. Every drop counts.');

-- =============================================================================
-- GRADE 5 — POST-TEST ACADEMIC
-- =============================================================================

INSERT INTO evaluation_questions (grade_level, evaluation_type, section, pillar, question_index, question_text, question_text_ur, task_type, options, correct_answer, difficulty, audio_text)
VALUES
-- Reading (3)
(5, 'post', 'academic', 'reading', 4,
 'The passage says: "Allama Iqbal inspired the nation through his poetry." What does "inspired" mean?',
 'عبارت کہتی ہے: "علامہ اقبال نے اپنی شاعری سے قوم کو متاثر کیا۔" "متاثر" کا کیا مطلب ہے؟',
 'multiple_choice',
 '[{"label":"Made angry","value":"angry"},{"label":"Motivated","value":"motivated"},{"label":"Confused","value":"confused"}]',
 'motivated', 'hard', NULL),

(5, 'post', 'academic', 'reading', 5,
 'Which sentence uses the correct punctuation?',
 'کون سا جملہ صحیح اوقاف استعمال کرتا ہے؟',
 'multiple_choice',
 '[{"label":"what a beautiful day","value":"a"},{"label":"What a beautiful day!","value":"b"},{"label":"What a beautiful day.","value":"c"}]',
 'b', 'hard', NULL),

(5, 'post', 'academic', 'reading', 6,
 'What is the main idea of: "Clean water is essential for health. Many villages still lack clean drinking water."',
 'اس عبارت کا بنیادی خیال کیا ہے؟',
 'multiple_choice',
 '[{"label":"Water is blue.","value":"a"},{"label":"Clean water is a basic need that many lack.","value":"b"},{"label":"Villages are far away.","value":"c"}]',
 'b', 'hard', NULL),

-- Writing (2)
(5, 'post', 'academic', 'writing', 7,
 'Choose the correct sentence: Neither Ali ___ Ahmed was absent.',
 'صحیح جملہ چنیں: Neither Ali ___ Ahmed was absent.',
 'multiple_choice',
 '[{"label":"or","value":"or"},{"label":"nor","value":"nor"},{"label":"and","value":"and"}]',
 'nor', 'hard', NULL),

(5, 'post', 'academic', 'writing', 8,
 'Choose the correct relative pronoun: The girl ___ won the prize is my friend.',
 'صحیح موصول ضمیر چنیں: The girl ___ won the prize is my friend.',
 'multiple_choice',
 '[{"label":"which","value":"which"},{"label":"who","value":"who"},{"label":"whom","value":"whom"}]',
 'who', 'hard', NULL),

-- Listening (3)
(5, 'post', 'academic', 'listening', 9,
 'Listen to the sentence and choose the correct answer: What is the speaker describing?',
 'جملہ سنیں اور صحیح جواب چنیں۔',
 'multiple_choice',
 '[{"label":"A museum","value":"museum"},{"label":"A zoo","value":"zoo"},{"label":"A park","value":"park"}]',
 'museum', 'hard', 'A place where we can see old artefacts and learn about history is called a museum.'),

(5, 'post', 'academic', 'listening', 10,
 'Listen to the sentence and identify the tense.',
 'جملہ سنیں اور زمانہ پہچانیں۔',
 'multiple_choice',
 '[{"label":"Past tense","value":"past"},{"label":"Present tense","value":"present"},{"label":"Future tense","value":"future"}]',
 'future', 'hard', 'The school will organize a science fair next month.'),

(5, 'post', 'academic', 'listening', 11,
 'Listen and choose what the speaker is asking for.',
 'سنیں اور بتائیں بولنے والا کیا مانگ رہا ہے۔',
 'multiple_choice',
 '[{"label":"Directions","value":"directions"},{"label":"Food","value":"food"},{"label":"Permission","value":"permission"}]',
 'permission', 'hard', 'May I please go to the library to return my book?'),

-- Speaking (2)
(5, 'post', 'academic', 'speaking', 12,
 'Read this paragraph aloud: "Helping others is a noble deed. We should always be kind and generous."',
 'یہ پیراگراف بلند آواز میں پڑھیں۔',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'hard', 'Helping others is a noble deed. We should always be kind and generous.'),

(5, 'post', 'academic', 'speaking', 13,
 'Read this paragraph aloud: "Technology has changed the way we learn. Students can now study online."',
 'یہ پیراگراف بلند آواز میں پڑھیں۔',
 'multiple_choice',
 '[{"label":"I said it","value":"said"},{"label":"I need help","value":"help"}]',
 'said', 'hard', 'Technology has changed the way we learn. Students can now study online.');
