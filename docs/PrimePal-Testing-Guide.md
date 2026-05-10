# PrimePal - Testing Guide

Welcome! This guide will walk you through testing PrimePal, our AI-powered English learning platform for Pakistani primary classrooms.

**Live URL:** https://prime-pal-alpha.vercel.app

---

## Admin Testing

The Admin panel lets you manage the entire platform — staff, classrooms, students, curriculum books, topics, evaluations, data export, and system monitoring.

### Test Credentials

| Field    | Value                 |
|----------|-----------------------|
| Email    | `admin@primepal.test` |
| Password | `test123`             |

### How to Log In

1. Open https://prime-pal-alpha.vercel.app
2. Click **"Admin Panel"** (the blue/purple card)
3. Enter your email and password
4. You will be redirected to the Admin Dashboard

### What to Test

#### Staff Management

- **View** all teachers and admins (name, email, role)
- **Edit** a teacher's name or email
- **Delete** a teacher (you'll be asked to reassign their classrooms to another teacher)
- **Invite a new admin** — generates a 7-day invite code you can share

#### Classrooms (Hierarchy)

- **View** all classrooms with their teacher, student count, grade level, and class code
- **Create** a new classroom — assign a name, grade (1-5), optional section, and teacher
- **Edit** classroom name, grade, or section
- **Delete** a classroom (shows a warning if students are enrolled)
- **Note:** Class codes are auto-generated and visible here — use them for student testing below

#### Students

- **View** all students with search and grade filtering
- **Create** a new student — assign name, classroom, optional roll number/email (PIN is auto-generated)
- **Edit** student name, classroom, roll number, or email
- **Delete** a student account
- **Reset PIN** — generates a new PIN for a student who forgot theirs

#### Curriculum / Books

- **Upload** a PDF textbook — select a grade level and title, then upload
- **View** all uploaded books with processing status and chunk count
- **View chunks** — browse the extracted text chunks from any book (paginated)
- **Delete** a book and all its associated chunks
- Processing pipeline stages: pending → extracting → chunking → embedding → success

#### Topics

- **View** all topics organized by skill (Reading, Writing, Listening, Speaking)
- **Create** a new topic — assign name, skill type, and grade level
- **Edit** a topic's name or skill type
- **Delete** a topic

#### Evaluations

- **View** all pre-test and post-test submissions with scores and psychometric data
- **Trigger post-tests** — unlock post-tests globally, by grade, or by classroom

#### Data Export

- **Export** data in CSV or JSON format with filters:
  - Students (by grade or student ID)
  - Interactions (by date range, skill pillar, grade)
  - Missions (by date range, skill pillar, grade)
  - Evaluations (by type, grade, student ID)
- **Preview** first 10 rows before downloading

#### System Monitoring

- **Health checks** — database, Redis cache, and OpenAI API status
- **LLM metrics (24h)** — total API calls, tokens used, latency, cache hit rate, estimated cost
- **Recent LLM calls** — table of recent API calls with model, tokens, latency, and status

---

## Teacher Testing

The Teacher dashboard lets you manage classrooms, create students, assign missions, and track student progress with AI-powered insights.

### Test Credentials

| Field    | Value                   |
|----------|-------------------------|
| Email    | `teacher@primepal.test` |
| Password | `test123`               |

### How to Log In

1. Open https://prime-pal-alpha.vercel.app
2. Click **"Sign In"** (the teal/green card)
3. Enter the email and password from the table above
4. You will be redirected to the Teacher Dashboard

### What to Test

- **Dashboard** - View an overview of your classrooms and recent activity
- **Classrooms** - Create a classroom, which generates a unique class code for students
- **Add Students** - Inside a classroom, add students with names, avatars, and PINs
- **Topics & Syllabus** - Browse available English topics by grade level
- **Missions** - Assign AI-generated reading, writing, listening, or speaking missions
- **Reports** - View AI-powered progress reports for individual students
- **Student List** - See all students and their activity across classrooms

---

## Student Testing

Students don't need an email or password. They join using a class code, pick their name, and enter a PIN.

### Finding Class Codes

Class codes are auto-generated when a teacher creates a classroom. You can find them in two ways:

- **From the Admin panel** — Log in as Admin, go to **Classrooms (Hierarchy)** to see all class codes
- **From the Teacher panel** — Log in as Teacher and open any classroom to see its class code

### Default Student PIN

All student accounts have been set up with the default PIN: **`1234`**

### How to Enter

1. Open https://prime-pal-alpha.vercel.app
2. Click **"Enter Class Code"** (the pink card)
3. Enter a **class code** (find one from the Admin or Teacher panel as described above)
4. Select your **name** from the list of students in that classroom
5. Enter PIN: **`1234`**
6. Start playing missions!

### What to Test

- **Mission Play** - Try a reading, writing, or speaking mission
- **AI Tutor Chat** - Interact with the AI tutor during missions
- **Points & Progress** - Check that points are awarded after completing tasks
- **Avatar & Theme** - Verify the student's avatar and color theme display correctly

---

## Quick Testing Flow (End-to-End)

This walkthrough covers the full learning cycle: teacher sets up curriculum, student plays missions with AI help, and teacher reviews the report.

### Step 1 — Admin Setup

1. **Log in as Admin** (email: `admin@primepal.test` / password: `test123`)
2. **Upload a book** — go to Curriculum, upload a PDF textbook, and wait for processing to complete (status goes from "pending" to "success")
3. **Create topics** — go to Topics, add topics for the relevant grade and skill (e.g., "Animals" for Grade 2 Reading)

### Step 2 — Teacher Configures Classroom

4. **Log in as Teacher** (email: `teacher@primepal.test` / password: `test123`) in a separate browser or incognito window
5. **Activate topics** — go to the Topics page, select the grade level, and toggle ON the topics you want students to practice (Reading, Writing, Listening, Speaking)
6. **Note your class code** — open your classroom and copy the auto-generated class code (e.g., `A3F2B1`)

### Step 3 — Student Plays a Mission

7. **Open the student page** on a phone or another browser tab
8. **Enter the class code**, select a student name, and enter PIN `1234`
9. **Go to Missions** — the student sees 4 pillar cards (Reading, Writing, Listening, Speaking) with daily progress
10. **Pick a pillar** (e.g., Reading) — the system generates 10 questions based on the teacher's active topics, adapted to the student's skill level
11. **Answer the questions** — the student gets instant feedback (correct/incorrect), earns points (10 per correct answer), and sees a summary at the end with their accuracy and star rating

### Step 4 — Student Asks the AI Tutor

12. **Open the AI Chat** — the student can ask the AI tutor for help at any time (e.g., "What does 'enormous' mean?")
13. The AI tutor responds in simple English appropriate for the student's grade level, using content from the uploaded textbooks
14. Students can also type in Roman Urdu — the tutor understands and responds accordingly

### Step 5 — Teacher Reviews the Report

15. **Switch back to the Teacher dashboard**
16. **Go to Reports or Students** — click on the student who just completed a mission
17. **View the student report** which shows:
    - Overall accuracy and total stars earned
    - Per-pillar breakdown (Reading, Writing, Listening, Speaking) with accuracy percentages
    - Daily scores timeline for the last 14 days
    - **AI-generated insights** — strengths, areas for improvement, and recommended topics
18. **Check the Missions page** — see classroom-level stats (active students, total missions completed, average accuracy)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page won't load | Check your internet connection and try refreshing |
| Login fails | Double-check email and password; make sure caps lock is off |
| Class code not found | Check the Admin or Teacher panel for valid class codes |
| Student PIN not working | The default PIN for all students is `1234` |
| Book upload stuck | Check the status column — if it shows "error", delete and re-upload |
| Mission won't start | Ensure the teacher has assigned missions for the classroom's topic |

---

## Need Help?

Contact: **iqramuzaffar2002@gmail.com**
