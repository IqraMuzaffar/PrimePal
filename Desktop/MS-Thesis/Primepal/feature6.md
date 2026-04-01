# PrimePal Implementation Guide: Feature 6 - The "Four-Pillar" Interactive UI

## 1. System Overview & Context
You are building Feature 6 of "PrimePal", the **Student-Facing Mobile Web App**. 
Instead of a linear chat interface, PrimePal uses a "Mission Hub" dashboard. When a student opens a Quest, they must complete four distinct language tasks: Listening, Speaking, Reading, and Writing (LSRW). 

**Core Objectives:**
1. Build a highly visual, touch-friendly 2x2 grid dashboard (The Mission Hub) displaying the four tasks.
2. Implement visual state management (Pending, Missing/Alert, Completed) for each task tile to guide the student.
3. Build the four specific sub-views for each task, integrating native browser capabilities like `MediaRecorder` for the Speaking task and HTML5 Audio for the Listening task.
4. Keep the UI gamified and encouraging using smooth animations.

## 2. Tech Stack
* **Framework:** Next.js 14+ (App Router).
* **Styling:** Tailwind CSS (Mobile-first design).
* **Icons & Animation:** `lucide-react` for icons, `framer-motion` for child-friendly bounce and success animations.
* **State Management:** React `useState`/`useEffect` (or Zustand) to manage the completion state of the four tasks before syncing with the backend.

---

## 3. UI/UX Architecture (Next.js)

### Folder Structure Setup:
Ensure the student routes are grouped separately from the teacher routes.
* `app/(student)/missions/page.tsx` (List of active quests for the student)
* `app/(student)/missions/[quest_id]/page.tsx` (The 4-Pillar Mission Hub)
* `components/student/TaskTile.tsx` (Interactive tile for the grid)
* `components/student/tasks/ListeningTask.tsx`
* `components/student/tasks/SpeakingTask.tsx`
* `components/student/tasks/ReadingTask.tsx`
* `components/student/tasks/WritingTask.tsx`

---

## 4. Component Implementation

### File: `app/(student)/missions/[quest_id]/page.tsx`
**Goal:** The main Mission Hub view.
* **Directive:** Must be a `"use client"` component to handle state and animations.
* **State:** Fetch the `TaskStatusResponse` from the backend (`GET /api/v1/missions/{quest_id}/status`) to determine which of the four tasks are `completed`, `pending`, or `missing`.
* **UI Layout:** A clean header with the Quest Title, a visual progress bar (e.g., "1/4 Completed"), and a 2x2 CSS Grid displaying four `TaskTile` components.

### File: `components/student/TaskTile.tsx`
**Goal:** A reusable, animated button for the 4 pillars.
* **Props:** `title` (e.g., "Speak!"), `icon`, `status` (completed, pending, missing), `onClick`.
* **Styling Logic (Tailwind):**
  * `completed`: Bright green background, locked state, shows a "Shabash!" star or checkmark.
  * `pending`: Neutral/Playful color (e.g., light blue), standard hover effects.
  * `missing`: Gentle pulsing animation (using Tailwind `animate-pulse` or framer-motion), yellow or soft red border to draw attention without causing anxiety.
* **Interaction:** Clicking an incomplete tile opens a modal or full-screen view of the specific task component.

---

## 5. The Four Task Interfaces (Sub-Views)

### `ListeningTask.tsx`
* **UI:** A large, inviting "Play Audio" button.
* **Logic:** Use the native `<audio>` tag to play the `listening_text` generated in Feature 5 (converted to an audio URL by the backend TTS).
* **Interaction:** Display 2-3 visual buttons or simple text options. The student selects the answer to the `listening_question`.

### `ReadingTask.tsx`
* **UI:** Display the `reading_passage` in a large, readable font (e.g., Comic Neue or a highly legible sans-serif).
* **Interaction:** Below the text, display the `reading_question` with a simple input field or multiple-choice buttons.

### `WritingTask.tsx`
* **UI:** A simplified chat-like interface. Display the `writing_scenario` prompt (e.g., "Text the shopkeeper you want 3 apples").
* **Interaction:** Provide a standard text input field.
* **Scaffolding:** To help young typists, include a horizontal scrolling "Word Bank" below the input field containing the target vocabulary so they can tap words to insert them into the text box.

### `SpeakingTask.tsx`
* **UI:** Strip away all keyboards. Display the `speaking_scenario` and a single, massive "Hold to Speak" microphone button.
* **Logic:** 1. Use the browser's `navigator.mediaDevices.getUserMedia({ audio: true })` and `MediaRecorder` API.
  2. Implement visual feedback (e.g., sound waves or a glowing ring) while recording.
  3. On release, capture the audio `Blob`.
  4. Send the Blob to the FastAPI backend (`POST /api/v1/chat/turn` or a dedicated STT endpoint) for Whisper transcription and evaluation.
  5. Display the AI's text response and mark the task complete.

---

## 6. Execution Instructions for AI
1. Initialize the Next.js routes for the student views, ensuring they are mobile-responsive (max-width containers optimized for standard smartphone screens).
2. Build the `TaskTile` component first using `framer-motion`. Ensure the visual distinctions between `pending`, `missing`, and `completed` are extremely clear to a young child.
3. Build the four sub-task components. Prioritize the `SpeakingTask.tsx` logic, ensuring the `MediaRecorder` API handles permissions gracefully (showing a friendly error if the child denies microphone access).
4. Integrate the components so that when a child finishes a sub-task, the UI immediately updates the Mission Hub state to show the green checkmark before routing them back to the grid.