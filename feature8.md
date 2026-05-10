
# PrimePal Implementation Guide: Feature 8 - The Multi-Modal Interaction Logger

## 1. System Overview & Context
You are building Feature 8 of "PrimePal", which acts as the data-gathering arm of **Agent C (The Analyst)**. 
While Feature 7 successfully logs the conversational turns (Speaking/Writing) into the `chat_logs` table, we now need to capture the discrete, objective metrics from the Reading and Listening tasks. 

**Core Objectives:**
1. Provide lightweight, asynchronous endpoints for the Next.js frontend to report task completions (e.g., "Student answered the Listening question correctly").
2. Ensure this logging does not block or slow down the student's UI experience.
3. Consolidate all data under the student's unique UUID and the specific `quest_id` so the NLP Insight Generator (Feature 9) has a complete picture of their multi-modal performance.

## 2. Tech Stack
* **Database:** Supabase (PostgreSQL).
* **Backend:** Python 3.11+ with FastAPI (`BackgroundTasks`).
* **Frontend Integration:** Next.js `fetch` calls triggered on component unmount or task completion.

---

## 3. Database Schema (Supabase PostgreSQL)
Execute this SQL in the Supabase SQL Editor. This builds upon the `quest_sessions` table created in Feature 7 to store the non-conversational metrics.

```sql
CREATE TABLE task_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES quest_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- 'reading' or 'listening'
    is_correct BOOLEAN NOT NULL,
    attempts INTEGER DEFAULT 1,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, quest_id, task_type) -- Prevent duplicate entries for the same task
);

-- Index for fast aggregation on the Teacher Dashboard later
CREATE INDEX idx_task_metrics_student_quest ON task_metrics(student_id, quest_id);
```

---

## 4. FastAPI Backend Implementation

### Requirements Setup:
No new PIP packages required, but we will heavily utilize FastAPI's native `BackgroundTasks`.

### File: `app/api/routes/telemetry.py`
**Goal:** Create a fire-and-forget endpoint that logs student interactions asynchronously.

```python
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
import logging
# ... imports for db and security (get_current_student, supabase_client)

router = APIRouter(prefix="/api/v1/telemetry", tags=["Interaction Logger"])
logger = logging.getLogger(__name__)

class TaskMetricPayload(BaseModel):
    quest_id: str
    task_type: str # 'reading' or 'listening'
    is_correct: bool
    attempts: int
    time_spent_seconds: int

def background_db_insert(payload: TaskMetricPayload, student_id: str):
    """
    Runs in the background to insert the telemetry data into Supabase 
    without making the student's mobile app wait for the database round-trip.
    """
    try:
        # 1. Ensure a quest_session exists for this task (like we did in Feature 7)
        # Note: In production, you'd want an UPSERT logic here to create the session if it doesn't exist.
        session_query = supabase_client.table("quest_sessions").select("id").eq("student_id", student_id).eq("quest_id", payload.quest_id).eq("task_type", payload.task_type).execute()
        
        session_id = None
        if session_query.data:
            session_id = session_query.data[0]['id']
        else:
            # Create session
            new_session = supabase_client.table("quest_sessions").insert({
                "student_id": student_id,
                "quest_id": payload.quest_id,
                "task_type": payload.task_type,
                "status": "completed"
            }).execute()
            session_id = new_session.data[0]['id']

        # 2. Insert the discrete metric
        metric_data = {
            "session_id": session_id,
            "student_id": student_id,
            "quest_id": payload.quest_id,
            "task_type": payload.task_type,
            "is_correct": payload.is_correct,
            "attempts": payload.attempts,
            "time_spent_seconds": payload.time_spent_seconds
        }
        
        # Using UPSERT to handle if the student replays the task
        supabase_client.table("task_metrics").upsert(
            metric_data, 
            on_conflict="student_id, quest_id, task_type"
        ).execute()

    except Exception as e:
        # Log to server console, but do not crash the app since it's a background task
        logger.error(f"Failed to log task metric for student {student_id}: {str(e)}")


@router.post("/log-task")
async def log_task_metric(
    payload: TaskMetricPayload, 
    background_tasks: BackgroundTasks, 
    student=Depends(get_current_student)
):
    """
    Endpoint called by the Next.js frontend when a student completes a Reading or Listening task.
    Uses BackgroundTasks for zero-latency response.
    """
    if payload.task_type not in ["reading", "listening"]:
        raise HTTPException(status_code=400, detail="Invalid task type for discrete metrics.")

    # Hand the database insertion off to a background thread
    background_tasks.add_task(background_db_insert, payload, student['sub'])
    
    # Immediately return success to the frontend so the UI feels instantaneous
    return {"status": "queued", "message": "Metric logged successfully."}
```

## 5. Next.js Frontend Integration Instructions
1. Update `ReadingTask.tsx` and `ListeningTask.tsx` (from Feature 6). 
2. When the student taps the final answer for the comprehension question, calculate the `time_spent_seconds` (using a simple React `useEffect` timer) and whether they got it right (`is_correct`).
3. Fire a `POST` request to `/api/v1/telemetry/log-task` right before transitioning the UI back to the Mission Hub. Do not block the UI waiting for this response; treat it as a fire-and-forget beacon.

## 6. Execution Instructions for AI
1. Run the SQL to create the `task_metrics` table with the unique constraints.
2. Implement the FastAPI endpoint using the `BackgroundTasks` dependency. This is critical for the architectural integrity of a mobile-first app on slower internet connections.
3. Ensure the Supabase Python client uses UPSERT (`.upsert()`) logic properly based on the composite unique key, so if a child accidentally double-taps a submit button, it doesn't crash the database with a duplicate key error.
