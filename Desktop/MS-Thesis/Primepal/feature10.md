
# PrimePal Implementation Guide: Feature 10 - The Action Plan Dashboard

## 1. System Overview & Context
You are building Feature 10 of "PrimePal", the final output of **Agent C (The Analyst)**. 
Instead of overwhelming teachers with raw chat transcripts or basic "80/100" scores, this dashboard aggregates the multi-modal metrics (Listening, Speaking, Reading, Writing) and the NLP-generated insights into actionable pedagogical steps. 

**Core Objectives:**
1. **The Missing Student Alert:** Automatically cross-reference the master roster with the session logs using an SQL Anti-Join to identify students who haven't attempted the Quest.
2. **Class-Wide Trends:** Aggregate the `student_insights` to show overall grammar and vocabulary health for the specific Quest.
3. **The Action Plan:** Display the AI-generated `teacher_recommendation` strings so the educator knows exactly what offline interventions to apply in their next class.

## 2. Tech Stack
* **Database:** Supabase (PostgreSQL).
* **Backend:** Python 3.11+ with FastAPI.
* **Frontend:** Next.js 14+ (App Router), Tailwind CSS.
* **Charting:** `recharts` (for simple, clean data visualization).

---

## 3. FastAPI Backend Implementation

### Requirements Setup:
`pip install fastapi pydantic supabase`

### File: `app/api/routes/dashboard.py`
**Goal:** Create endpoints to serve aggregated data and missing student lists to the teacher's UI. All endpoints must be protected by `get_current_teacher`.

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
# ... imports for db and security (get_current_teacher, supabase_client)

router = APIRouter(prefix="/api/v1/dashboard", tags=["Teacher Dashboard"])

class MissingStudentResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str

@router.get("/classrooms/{classroom_id}/quests/{quest_id}/missing", response_model=List[MissingStudentResponse])
async def get_missing_students(classroom_id: str, quest_id: str, teacher=Depends(get_current_teacher)):
    """
    Performs an Anti-Join to find students in the classroom who have NO record in quest_sessions.
    """
    try:
        # Verify ownership
        # ... verify classroom belongs to teacher

        # The Anti-Join Logic via Supabase RPC (or multiple queries)
        # 1. Get all students in classroom
        all_students_res = supabase_client.table("students").select("id, student_name, avatar_url").eq("classroom_id", classroom_id).execute()
        all_students = all_students_res.data
        
        # 2. Get all students who started/completed this quest
        completed_res = supabase_client.table("quest_sessions").select("student_id").eq("quest_id", quest_id).execute()
        completed_ids = {record['student_id'] for record in completed_res.data}
        
        # 3. Subtract (List A - List B)
        missing_students = [
            student for student in all_students 
            if student['id'] not in completed_ids
        ]
        
        return missing_students

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch missing students: {str(e)}")

@router.get("/classrooms/{classroom_id}/quests/{quest_id}/insights")
async def get_quest_insights(classroom_id: str, quest_id: str, teacher=Depends(get_current_teacher)):
    """
    Fetches the NLP-generated report cards and aggregates them for the dashboard.
    """
    try:
        # Fetch all insight reports for this quest
        insights_res = supabase_client.table("student_insights").select(
            "student_id, grammar_score, vocabulary_score, grammar_mistakes, words_struggled_with, teacher_recommendation"
        ).eq("quest_id", quest_id).execute()
        
        insights = insights_res.data
        if not insights:
            return {"status": "no_data", "message": "No students have completed this mission yet."}

        # Calculate class averages
        avg_grammar = sum(i['grammar_score'] for i in insights) / len(insights)
        avg_vocab = sum(i['vocabulary_score'] for i in insights) / len(insights)

        # Aggregate common mistakes to spot class-wide trends
        all_struggle_words = []
        for i in insights:
            all_struggle_words.extend(i.get('words_struggled_with', []))
            
        # Count frequencies of struggled words
        word_frequencies = {word: all_struggle_words.count(word) for word in set(all_struggle_words)}

        return {
            "total_completed": len(insights),
            "averages": {
                "grammar": round(avg_grammar, 1),
                "vocabulary": round(avg_vocab, 1)
            },
            "common_struggle_words": word_frequencies,
            "individual_reports": insights # So the UI can list out the specific teacher_recommendations
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch insights: {str(e)}")
```

---

## 4. Next.js Frontend Implementation

### Folder Structure Setup:
* `app/(teacher)/dashboard/classrooms/[classroom_id]/reports/[quest_id]/page.tsx`
* `components/teacher/MissingStudentsAlert.tsx`
* `components/teacher/InsightCards.tsx`

### File: `app/(teacher)/dashboard/classrooms/[classroom_id]/reports/[quest_id]/page.tsx`
**Goal:** The master report view for a specific weekly mission.
* **UI Layout:**
  * **Top Bar:** Quest Title and completion percentage (e.g., "28/30 Students Completed").
  * **Left Column (Alerts & Action):**
    * Render `MissingStudentsAlert.tsx`. A high-visibility, light-red card listing the names/avatars of the students returned by the `/missing` endpoint.
    * Render an "AI Recommended Action Plan" card summarizing the top `teacher_recommendation` strings.
  * **Right Column (Analytics):**
    * Render simple bar charts using `recharts` to show the Class Average Grammar vs. Vocabulary scores.
    * Render a "Vocabulary Heatmap" or list showing the `common_struggle_words` (e.g., "70% of the class struggled to use the word 'Shopkeeper'").

### File: `components/teacher/MissingStudentsAlert.tsx`
**Goal:** Ensure the teacher immediately knows who to follow up with.
* **UI:** A clean list component mapping over the `MissingStudentResponse`. Include a "Send Reminder" button (this can just be a UI stub for future SMS integration).

## 5. Execution Instructions for AI
1. Implement the FastAPI endpoints. Pay close attention to the Anti-Join logic in python (subtracting the sets). While you could write a raw SQL RPC for Supabase to do this, doing it in Python is perfectly fine for typical classroom sizes (under 50 students).
2. Install `recharts` in the Next.js project (`npm install recharts`).
3. Build the dashboard UI ensuring it follows standard SaaS dashboard design patterns (sidebar navigation, top-level KPI cards, detailed lists below).
4. **Crucial UI Rule:** Make sure the AI's `teacher_recommendation` text is the most prominent element on the screen. The entire point of this thesis is that the AI does the analytical heavy lifting so the teacher can just read the recommendation and start teaching.
