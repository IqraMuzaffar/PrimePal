
# PrimePal Implementation Guide: Feature 7 - The Bilingual Code-Switching Engine

## 1. System Overview & Context
You are building Feature 7 of "PrimePal", which operates as the core of **Agent B (The Instructor)**. 
This feature powers the backend conversational logic for the Writing and Speaking tasks from the Mission Hub. To bridge the "Linguistic Gap" and lower the "Affective Filter", this engine is explicitly designed to act as a Vygotskian "Digital MKO" (More Knowledgeable Other). 

**Core Objectives:**
1. Accept conversational inputs (either typed text or transcribed speech) from the student.
2. Natively process Urdu-English Code-Switching (Minglish) without breaking or penalizing the student.
3. Provide gentle, Socratic scaffolding, guiding the student to produce the correct English sentence.
4. Log every single interaction (turn) into the database so Agent C (The Analyst) can evaluate it later.

## 2. Tech Stack
* **Database:** Supabase (PostgreSQL).
* **Backend:** Python 3.11+ with FastAPI.
* **LLM Orchestration:** LangChain (`ChatOpenAI`, `ChatPromptTemplate`, `MessagesPlaceholder`).
* **Model:** OpenAI `gpt-4o-mini` (Fast, excellent at multilingual context).

---

## 3. Database Schema (Supabase PostgreSQL)
Execute this SQL in the Supabase SQL Editor to create the tables that will store the chat history. This is the critical bridge to Phase 4 (The Analyst).

```sql
CREATE TABLE quest_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- e.g., 'speaking', 'writing'
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, quest_id, task_type) -- Ensures one active session per task per student
);

CREATE TABLE chat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES quest_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast retrieval of chat history
CREATE INDEX idx_chat_logs_session ON chat_logs(session_id);
```

---

## 4. FastAPI Backend Implementation

### Requirements Setup:
`pip install fastapi pydantic langchain langchain-openai supabase`

### File: `app/api/routes/chat.py`
**Goal:** The main endpoint that handles the back-and-forth conversation, maintains memory, and enforces the pedagogical rules.

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
# ... imports for db and security (get_current_student, supabase_client)

router = APIRouter(prefix="/api/v1/chat", tags=["Bilingual Engine"])

class ChatTurnRequest(BaseModel):
    quest_id: str
    task_type: str # 'writing' or 'speaking'
    message: str   # The student's input (Minglish or English)

class ChatTurnResponse(BaseModel):
    session_id: str
    ai_response: str
    is_mission_complete: bool

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.6)

@router.post("/turn", response_model=ChatTurnResponse)
async def process_chat_turn(request: ChatTurnRequest, student=Depends(get_current_student)):
    """Processes a single conversational turn, applying code-switching logic and logging history."""
    
    try:
        # Step 1: Get or Create Session
        # TODO: Query `quest_sessions` for existing session. If none, create it.
        # session_id = ... 

        # Step 2: Fetch Chat History & Quest Details
        # TODO: Query `quests` table to get the `writing_scenario` or `speaking_scenario` and `target_vocabulary`.
        # TODO: Query `chat_logs` table to get previous messages for this session_id.
        
        # Mocking data for LLM pipeline:
        scenario_prompt = "You are a shopkeeper. The student needs to buy 3 apples."
        target_vocab = ["apples", "buy", "rupees"]
        chat_history = [] # List of HumanMessage and AIMessage objects from DB

        # Step 3: Save the User's Message to DB immediately
        # supabase_client.table("chat_logs").insert({"session_id": session_id, "role": "user", "content": request.message}).execute()

        # Step 4: The Core Pedagogical Prompt (The Code-Switching Engine)
        system_instructions = f"""
        You are 'PrimePal', a friendly, patient English tutor for a Pakistani primary school student.
        Current Mission: {scenario_prompt}
        Target Vocabulary: {', '.join(target_vocab)}
        
        CRITICAL PEDAGOGICAL RULES:
        1. BILINGUAL SCAFFOLDING: The student may speak in Urdu or Minglish (Urdu+English). You MUST understand them, but you MUST reply in simple English.
        2. NO PUNISHMENT: Never say "You are wrong" or "Speak in English." Instead, validate their attempt and model the correct English sentence. 
           (Example: If they say "Mujhe apple buy karna hai", you reply: "Great job! 🍎 Now, let's try saying it in English: 'I want to buy an apple.'")
        3. PUSHED OUTPUT: Do not complete the mission until the student produces an active English sentence containing the target vocabulary.
        4. BREVITY: Keep your responses to a maximum of 2 short, child-friendly sentences. Use emojis.
        5. COMPLETION: If the student successfully uses the vocabulary in English, end your message with the exact phrase "[MISSION_COMPLETE]".
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_instructions),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}")
        ])

        # Step 5: Execute LLM
        chain = prompt | llm
        ai_msg = await chain.ainvoke({
            "chat_history": chat_history,
            "input": request.message
        })
        ai_response_text = ai_msg.content

        # Step 6: Check for completion flag and clean the text
        is_complete = "[MISSION_COMPLETE]" in ai_response_text
        clean_ai_response = ai_response_text.replace("[MISSION_COMPLETE]", "").strip()

        # Step 7: Save AI Response to DB
        # supabase_client.table("chat_logs").insert({"session_id": session_id, "role": "assistant", "content": clean_ai_response}).execute()
        
        # If complete, update session status
        if is_complete:
            # supabase_client.table("quest_sessions").update({"status": "completed"}).eq("id", session_id).execute()
            pass

        return {
            "session_id": "mock_session_id", # Return actual ID
            "ai_response": clean_ai_response,
            "is_mission_complete": is_complete
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 5. Execution Instructions for AI
1. Run the SQL to create the `quest_sessions` and `chat_logs` tables. This structure is absolutely mandatory for Feature 8 and 9 (Agent C) to function later.
2. Implement the FastAPI endpoint. Pay extreme attention to **Step 2** (fetching history). The LLM will completely lose context if the past `HumanMessage` and `AIMessage` history is not retrieved from the DB and passed into the `chat_history` variable.
3. The System Prompt instructions (Step 4) are the pedagogical core of this application. Do not alter the "BILINGUAL SCAFFOLDING" or "NO PUNISHMENT" rules, as they directly implement the affective filter and code-switching theories from the thesis.
4. Connect this endpoint to the `WritingTask.tsx` and `SpeakingTask.tsx` frontend components built in Feature 6.
