
### Phase 1: The Foundation (System Skeleton)
**Goal:** Establish secure, accessible environments for both teachers and primary students.

* **Feature 1: Smart Auth & Role Management**
    * **Description:** A dual-login system. Teachers access a secure web dashboard using standard email/password authentication. Students use a frictionless, password-free "Class Code + Avatar" entry on mobile devices, ensuring ease of access on shared family smartphones.
* **Feature 2: Classroom Manager (The "Registry")**
    * **Description:** A digital management hub where educators generate unique class codes, manage student rosters via "ghost profiles," and organize their cohorts. This serves as the organizational backbone connecting the student’s mobile app to the teacher’s web dashboard.

---

### Phase 2: Agent A - The Curriculum Guardrail (Knowledge Curator)
**Goal:** Enforce pedagogical boundaries to ensure the AI only uses age-appropriate, locally approved vocabulary.

* **Feature 3: SNC Document Ingestion (Hybrid RAG Pipeline)**
    * **Description:** A specialized content processing engine designed exclusively for the Single National Curriculum (SNC). It ingests digitized SNC English textbooks, automatically cleaning, extracting, and chunking the approved vocabulary and grammar lessons into AI-readable segments to prevent out-of-syllabus hallucinations.
* **Feature 4: Vector Storage & Curricular Tagging**
    * **Description:** The system's "long-term memory." It converts the SNC text chunks into vector embeddings and tags them with metadata (e.g., Grade Level, Week #, Topic). This ensures the Tutor Agent strictly retrieves vocabulary bounded by the local curriculum.

---

### Phase 3: Agent B - The Student-Facing Tutor (Instructor)
**Goal:** Drive comprehensive language acquisition by engaging students across all four pedagogical pillars (Reading, Writing, Listening, Speaking).

* **Feature 5: The "Multi-Modal Quest Architect" (Scenario Generator)**
    * **Description:** This agent dynamically generates weekly missions utilizing all four language skills. It pulls SNC vector tags to craft targeted Reading comprehension blocks, Listening audio prompts, Writing exercises, and active Speaking roleplays.
* **Feature 6: The "Four-Pillar" Interactive UI (Frontend)**
    * **Description:** A gamified, child-friendly mobile interface equipped to handle multi-modal inputs. It features an audio player for Listening tasks, a standard keyboard for Writing tasks, and an optional "Hold to Speak" microphone powered by Speech-to-Text (STT) for active Speaking tasks to combat the "Mute English" phenomenon.
* **Feature 7: The Bilingual Code-Switching Engine (The Chatbot)**
    * **Description:** The core conversational AI, explicitly prompted and fine-tuned to process and respond to natural Urdu-English Code-Switching (Minglish). It acts as a "Digital MKO," providing judgment-free Socratic scaffolding—allowing a student to type or speak a question in Urdu and gently guiding them to the English answer.

---

### Phase 4: Agent C - The Teacher-Facing Evaluator (Analyst)
**Goal:** Solve the "Black Box" problem by asynchronously monitoring progress across all competencies and advising the educator.

* **Feature 8: The Multi-Modal Interaction Logger**
    * **Description:** A background tracking system that safely and silently records every student-AI interaction. It captures text submissions, audio transcriptions, and reading comprehension scores, tied strictly to the student's unique UUID.
* **Feature 9: The Comprehensive NLP Insight Generator**
    * **Description:** An automated evaluator that runs asynchronously to parse the interaction logs. It evaluates Reading/Listening accuracy, Writing grammar/spelling, and Speaking sentence construction, providing a holistic view of the student's communicative competence.
* **Feature 10: The Four-Skill Action Plan Dashboard**
    * **Description:** The teacher-facing web interface. It translates complex multi-modal metrics into clear, actionable progress reports. It alerts the teacher to class-wide trends (e.g., "Students excel at Reading but fail at Speaking") and highlights incomplete assignments via database anti-joins.