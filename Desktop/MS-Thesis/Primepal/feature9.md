
# PrimePal Implementation Guide: Feature 9 - The NLP Insight Generator

## 1. System Overview & Context
You are building Feature 9 of "PrimePal", representing the analytical core of **Agent C**. 
When a student finishes a Quest, raw data sits in the database (Feature 7's chat logs and Feature 8's task metrics). The teacher does not have time to read 30 different chat transcripts. 

**Core Objectives:**
1. Build an asynchronous evaluator that parses a student's completed mission data.
2. Use LangChain and a structured LLM output to perform a detailed NLP analysis of the student's typed or spoken Minglish/English.
3. Extract specific grammar mistakes, vocabulary success rates, and generate a 1-2 sentence targeted recommendation for the teacher.
4. Save this structured "Insight Report" to the database to power the Teacher Dashboard (Feature 10).

## 2. Tech Stack
* **Database:** Supabase (PostgreSQL).
* **Backend:** Python 3.11+ with FastAPI.
* **LLM Orchestration:** LangChain (`ChatOpenAI`, `.with_structured_output()`).
* **Model:** OpenAI `gpt-4o-mini` (Excellent at grading and structural text analysis).

---

## 3. Database Schema (Supabase PostgreSQL)
Execute this SQL in the Supabase SQL Editor. This table will hold the final "Report Cards" that the Teacher Dashboard will read.

```sql
CREATE TABLE student_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES quest_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    
    -- Evaluated Metrics
    grammar_score INTEGER CHECK (grammar_score >= 0 AND grammar_score <= 100),
    vocabulary_score INTEGER CHECK (vocabulary_score >= 0 AND vocabulary_score <= 100),
    
    -- Deep NLP Extraction (JSON arrays)
    grammar_mistakes JSONB, -- e.g., [{"error": "I buyed apples", "correction": "I bought apples"}]
    words_struggled_with JSONB, -- e.g., ["shopkeeper", "rupees"]
    
    -- The Actionable Output
    teacher_recommendation TEXT NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(session_id) -- Only one insight report per session
);

-- Index for the Teacher Dashboard to quickly pull class-wide insights
CREATE INDEX idx_student_insights_quest ON student_insights(quest_id);
```

---

## 4. FastAPI Backend Implementation

### Requirements Setup:
`pip install fastapi pydantic langchain langchain-openai supabase`

### File: `app/api/routes/evaluator.py`
**Goal:** An endpoint designed to be triggered automatically (via FastAPI BackgroundTasks) the moment a student completes their mission in Feature 7.

```python
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
# ... imports for db and security (supabase_service_client)

router = APIRouter(prefix="/api/v1/evaluator", tags=["Analyst Agent"])

# 1. Define the exact JSON structure for the Insight Report
class GrammarError(BaseModel):
    error: str = Field(description="The exact incorrect phrase the student used.")
    correction: str = Field(description="The correct English grammar for that phrase.")

class InsightReportSchema(BaseModel):
    grammar_score: int = Field(description="Score from 0 to 100 based on sentence structure.")
    vocabulary_score: int = Field(description="Score from 0 to 100 based on target vocabulary usage.")
    grammar_mistakes: List[GrammarError] = Field(description="List of specific grammar mistakes made.")
    words_struggled_with: List[str] = Field(description="Target vocabulary words the student failed to use or misused.")
    teacher_recommendation: str = Field(description="A 1-sentence recommendation for the teacher on what to review in class.")

# Initialize the Evaluator LLM
evaluator_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2).with_structured_output(InsightReportSchema)

async def analyze_session_background(session_id: str, student_id: str, quest_id: str):
    """Background task that reads the chat transcript and generates the Insight Report."""
    try:
        # Step 1: Fetch the full Chat Transcript from Supabase
        # transcript_query = supabase_service_client.table("chat_logs").select("role, content").eq("session_id", session_id).order("created_at").execute()
        # Mocking the fetched transcript:
        transcript_data = [
            {"role": "user", "content": "Mujhe 3 apple buy karna hai"},
            {"role": "assistant", "content": "Great job! Now let's try it in English: 'I want to buy three apples.'"},
            {"role": "user", "content": "I wants to buy three apple."}
        ]
        
        # Format transcript for the LLM
        formatted_transcript = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in transcript_data])

        # Step 2: Fetch Target Vocabulary from the Quest table
        # target_vocab = supabase_service_client.table("quests").select("target_vocabulary").eq("id", quest_id).execute()
        target_vocab = ["buy", "apples", "shopkeeper"]

        # Step 3: Construct the Evaluator Prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert ESL linguistic evaluator. 
            Review the following student-AI chat transcript.
            Target Vocabulary for this mission: {vocab}
            
            Analyze the student's ('USER') inputs. Ignore Minglish/Urdu used for scaffolding, but strictly evaluate their final English attempts for grammatical accuracy (subject-verb agreement, plurals) and vocabulary usage.
            Output your analysis strictly conforming to the provided JSON schema."""),
            ("user", "Transcript:\n{transcript}")
        ])

        # Step 4: Execute the LangChain Pipeline
        chain = prompt | evaluator_llm
        insight: InsightReportSchema = await chain.ainvoke({
            "vocab": ", ".join(target_vocab),
            "transcript": formatted_transcript
        })

        # Step 5: Save the Insight Report to Supabase
        report_data = {
            "session_id": session_id,
            "student_id": student_id,
            "quest_id": quest_id,
            "grammar_score": insight.grammar_score,
            "vocabulary_score": insight.vocabulary_score,
            "grammar_mistakes": [err.dict() for err in insight.grammar_mistakes],
            "words_struggled_with": insight.words_struggled_with,
            "teacher_recommendation": insight.teacher_recommendation
        }
        
        # supabase_service_client.table("student_insights").insert(report_data).execute()

    except Exception as e:
        print(f"Evaluator Agent failed for session {session_id}: {str(e)}")


@router.post("/trigger/{session_id}")
async def trigger_evaluation(
    session_id: str, 
    student_id: str, 
    quest_id: str, 
    background_tasks: BackgroundTasks
):
    """
    Called by Feature 7 the moment a session is marked '[MISSION_COMPLETE]'.
    Hands the heavy NLP processing off to a background thread.
    """
    background_tasks.add_task(analyze_session_background, session_id, student_id, quest_id)
    return {"status": "queued", "message": "NLP Evaluation processing in background."}
```

## 5. Execution Instructions for AI
1. Run the SQL to create the `student_insights` table. This is the exact table the Teacher Dashboard will query to build its charts and alerts.
2. Implement the FastAPI endpoint. Notice how the temperature is set to `0.2` for the `evaluator_llm`. This is critical: we want the LLM to be highly analytical, deterministic, and strict when grading, unlike the Tutor Agent which was set to `0.6` for friendly conversation.
3. **Integration Point:** Go back to the `chat.py` file from Feature 7. Right where the code detects `is_complete = True`, add an internal HTTP call or direct function call to trigger this `/trigger/{session_id}` endpoint.