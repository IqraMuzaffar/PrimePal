Tecaher level features
 
 
Login /Signup
Dashboard
View classes/edit class name
View students of a grade
Viee Anlaytics (performance) Viewer– student search, grade search, spacific skill (LSWR) of a grade , specific topic of a grade
Search by grade , student name and roll number
Report Generation of students individual, gradewise
Selects Topics to assess
 
 
A Teacher (any teacher) can select the topics they want to assess students on
For exmple I am a teacher i can select grade 1 and then i will be displayed the topics of grade 1 in bullet or checklist form by default all selected on whose basis the tasks wil be generated on student’s side (all 4 skills L,S,R,W Tasks 10 tasks for each, the tasks should have verifiable outputs) These tasks will be generated on the basis of student’s grade, if studnt is from grade 1 , his grade 1 course book along with the teachers selected topics will be selected from the RAG pipeline we will get most similiar data and then generate verifiable fixed output qs for each LSWR tasks 10 each with a timer of 15 seconds for each question or if the question is a bit longer like reading comprehension accrordinly task duration will be provided.
Each task will have a score a total of 100 scores for each skill to be divided among qs based on difficulty level (5 f very ez, 10 , 15, 20 if too hard)
 
The speaking listening reading writing taks should be according to the challenges of the grade and students past perormances. If a student is weak at  a partciular topic in week 1 then the tasks for next week should include that topic along with the new ones in a way student is motivated and imrpoves it if a student is sharp in a skill increase their difficulty in that particular topic/skill

The tasks should not be boring and have variety in all skills not just fixed patterns we want to encourage learning in a gamified way

These scores should be visible to student for each task and after completion it should be visible on the maon page the total score uptill now and that days score  and once analytics report goes to teacher side then to teacher as well students total score and that days score.

Analytics portion atTeacher’s end where teacher can see all students data do searched based on grade and generate reports
The per student report should be showing students marks for each skills performed along with proper dates aand after each sessions it should tell dtudents performance strengths and weaknesses for reporting

Teacher should have a visible overall data of classes f each grade for example grade 1 students 80% are good at a particular skill 50% are bad at a particular skill the teacher should b well informed witht the statsitics grade wise and can look at each students performances as well

Based on these data’s the  Teacher Assistant will be the guider for teacher to check they your grade 1 60% class is failing this or lacks these skills nouns speaking tests or nouns topic overall and speaking overall and it shiuld firmulae a proper next day plan for teacher to help students improve it and provide resources for the teachet to prepare



We need to implemrent the bilingual chatbot where students can ask curriuclum related qs and learn and nothing beyond curriculum

Moreover if the tasks can have some form of bilinguality that is it can help students understand english by showing urdu words or translation tasks that is  plus feature

For simplicityy we will have 1 shared teacher account for all teachers,
1. Diagnostic Mission (Cold Start) On a student's very first login, the system will serve a fixed baseline test rather than dynamically generated tasks for the student’s grade a medium level difficulty and save it separately as pre evaluation recoird. This establishes their initial skill level, providing an accurate starting point for the adaptive algorithm and yielding the exact "Pre-Test" digital data required for the research study.

2. Unified Teacher Dashboard with Advanced Filtering Because there is one master account for all teachers, the analytics dashboard will display the data of all students across all classes by default. To manage this efficiently, the dashboard will include robust search and filter tools. Teachers will have the option to filter the view by specific Grade, or search directly by Student Name or Roll Number. If no search or filter is applied, the complete global roster remains visible.

3. Defined Gamified Variety To ensure tasks are engaging and practically codable for the development team, the system will use explicitly defined UI components for each of the four pillars rather than fixed, repetitive patterns:

● Reading: Multiple Choice, True/False, and Word Matching (Tap A, then Tap B).
● Writing: Fill-in-the-blanks and Sentence Reordering (drag and drop words).
● Speaking: Repeat the sentence and open-ended Answer the question.
● Listening: Listen and select the correct image, and Listen and type the missing word.
4. Network Grace Protocol To account for unstable or shared home internet connections, the system will include a grace protocol for the 15-second task timers. If the network drops or lags, the timer will automatically pause, and the system will cache the student's answer locally if the API call fails. This allows the system to retry the submission once the connection stabilizes, ensuring the student is not unfairly penalized or artificially flagged for a "Weakness."


 
Student side features
 
 
PART 1: Core Pedagogical Functionality (Primary MVP)
1.1 The 4-Pillar Mission Engine (LSRW) & Diagnostic Start

● In the missions tab.under the 4 pillars
○ Each mission consists of 10 tasks.
○ Standard Timer: 15 seconds per standard question; 30 seconds for longer reading comprehensions.
● Tasks must incorporate bilingual scaffolding. For example, difficult English vocabulary words in Reading or Writing tasks should feature a subtle "Hint" button that reveals the Urdu translation to lower the cognitive load (Affective Filter).
Sample tasks for all pillars

1. Reading Pillar (Comprehension & Vocabulary)

● Sentence-Picture Match (MCQ)
● The "Odd One Out" (Vocabulary Grouping)
● Fill-in-the-Blank (Contextual Grammar)
● Short Passage True/False (Comprehension)
2. Writing Pillar (Syntax & Spelling)

● Sentence Scramble (Syntax Building)
● Missing Letter / "Spelling Bee Lite"
● Guided Translation (Bilingual Scaffolding)
3. Listening Pillar (Phonemic Awareness & Comprehension)

● Listen and Choose (Vocabulary)
● The "Simon Says" Action Task (Comprehension)
● Listen and Spell (Phonics)
4. Speaking Pillar (Oral Production & Pronunciation)

● "Repeat After Me" (Pronunciation)
● The "What is this?" Prompt (Vocabulary Recall)
● The "Finish the Sentence" Prompt (Syntax)
 

1.2 The "Digital MKO" Bilingual Chatbot (RQ3 & RQ4)

● Code-Switching NLP: The Tutor Agent must understand accept "Minglish" (Roman Urdu + English) and somewhat Urdu script, allowing students to ask questions naturally without being penalized for poor English grammar initially.
● Curriculum Guardrail (Edge Case): If a student asks a non-academic question (e.g., "What is your favorite video game?"), the Guardrail Agent must intercept it and gently pivot back to the SNC curriculum (e.g., "I love learning about Action Verbs! Do you want to practice some?"). The langa=uage s=used for the student must be in accordance with the student’s grade and not too high and for exaplanatory purposes bilingual language.
1.3 Edge Case & Infrastructure Handling

● Network Grace Protocol: For low-resource shared internet environments, if the API connection drops during an active timer, the timer must automatically pause. The frontend will cache the answer and retry the submission in the background, ensuring the child does not receive a "timeout failure" due to bad Wi-Fi.
● STT (Speech-to-Text) Forgiveness: For the Speaking Pillar, the system must account for heavy local accents and background noise. If the STT engine returns a "vague" or completely garbled input, the system should prompt, "I couldn't hear you clearly, let's try again!" rather than immediately marking it wrong.
 
PART 2: Extended Gamification & Retention Features
Thesis Note: These features provide the intrinsic motivation required for a 3-week study without cluttering the screen with distracting avatars or shops.

2.1 Grade-Aligned Spelling Bee Module

● Functionality: An additional, fast-paced minigame separate from the main 4 pillars. The AI dictates a word using Text-to-Speech (TTS), and the student must type it.
● Curricular Bounding: The dictionary for this module must strictly query the snc_topics or vector database for the student's specific grade level (e.g., Grade 1 will not be asked to spell "Photosynthesis").
● Mechanics: Features a strict 30-second timer per word. A correct spelling immediately awards +5 Points.
2.2 Cumulative Points & The Achievements Tab

● Monotonic Points System: Total points are cumulative and permanent. Points are awarded for missions and the Spelling Bee, but are never subtracted for wrong answers (to prevent discouragement).
● The Achievements Tab: A dedicated UI panel where points automatically unlock milestone rewards.
○ Threshold Logic: Programmatic triggers award digital badges/medals based on score milestones.
○ Example Tiers: 50 Points = Bronze Badge; 200 Points = Silver Medal; 500 Points = Gold Trophy.
● These achievements serve as visual progression markers that the student can show their parents, fulfilling the gamification requirement.
2.3 The Daily Streak Engine

● Functionality: To encourage the daily practice required for language acquisition, the system will track consecutive daily logins where at least one educational task is completed.
● UI Representation: A small "Flame" icon or streak counter in the header. If a student logs in for 3 consecutive days, the flame animates. Missing a day resets the counter to zero.
 
 
 
Admin Features
 
Pre and post test evaluation tigeers a common form for all grade 1 students exact same qs for all grade 1 students 1-3 qs based on confidence etc 10 to assess all 4 skills with a survey like form for pre testing opens up 1st time stduents login in sam form after teacher tigeers
Similarly for all other grades according to that grade topics generate a medium difficlutly form for all grade students but must be same and recorded in a sperate table for pre post evaluations this should be like a survey form and not too overwhelming for students
All teacher features
Crud grade book upload
Crud clasrroom teacer student
 
Has all access as of teacher  and all features
Crufd operations add, edit, delete class or students from a class
Add, edit , delete books
 
AN admin / should have option to upload grade books for all grades
These gradebooks will be the course documents for the system
 
2. Global Entity Management (CRUD Operations)
● The Admin role possesses all permissions of the standard Teacher role (viewing analytics, selecting topics, tracking idle students).
● Full Create, Read, Update, and Delete (CRUD) authority over the system's core relational models:
○ Users: Managing Teacher accounts and Student profiles (including resetting PINs/Passwords).
○ Classrooms: Creating virtual classroom groupings and mapping students/teachers to them.
1.1 Fixed-State Assessment Generation: The system must utilize a static, non-adaptive assessment form for Pre- and Post-Tests to ensure standardized data collection. The form will consist of:
● Psychometric Baseline: 1–3 simplified Likert-scale questions to measure student confidence and speaking anxiety (directly measuring the Affective Filter).
● Academic Baseline: 10 medium-difficulty, grade-aligned questions equally distributed across the 4 core skills (LSRW).
1.2 Trigger Mechanism* Pre-Test: Automatically triggered upon the student’s very first successful login.
● Post-Test: Manually triggered globally or per-class by the Admin at the conclusion of the 3-week study.
● UX Constraint: The evaluation must use a low-cognitive-load, "wizard-style" UI (one question per screen) so it feels like a friendly survey rather than an overwhelming exam. ==and this exam will be same as done in the pretest to account for exact results and improvements
How to make pre and post tests and remember for each grade we will save these questions too pre and post test and they must be of similar nature.
Keep the syntax and the task format identical, but swap the target vocabulary from the same SNC curriculum bucket.

● Pre-Test (Reading): "The cat is under the table." (Student taps the correct image).
● Post-Test (Reading): "The dog is on the chair." (Student taps the correct image).
● Both test basic noun recognition and spatial prepositions at the exact same reading level, but rote memorization won't help them pass the second one.
 

1.3 Isolated Data Storage: Responses and scores from these evaluations must bypass the standard gamified points system. They must be logged in a dedicated, isolated database schema (e.g., evaluation_records table) strictly for academic comparative analysis.
 
 
5. Raw Data Export (The Researcher's API)

● The Feature: CSV/JSON Data Dump. The Admin must have a dedicated export tool to download the raw evaluation_records and system_usage_logs (Time-on-task, errors per session, code-switching frequency) in clean, machine-readable CSV formats.
Centralized Knowledge Base Management (RAG Pipeline)
● 3.1 Gradebook Upload & Vectorization: The Admin has exclusive rights to upload foundational course documents (PDFs of SNC textbooks).
● 3.2 Embedding Status Tracking: Uploading a book triggers the backend vectorization process (chunking text and generating embeddings). The Admin dashboard must display the status of this ETL (Extract, Transform, Load) pipeline (e.g., "Processing," "Success," "Failed") to ensure the chatbot has access to the correct knowledge base. These books will be used for that grades task generation’s and chatbot
 