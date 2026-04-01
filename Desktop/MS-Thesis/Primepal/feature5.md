
# PrimePal Implementation Guide: Feature 5 - The Multi-Modal Quest Architect

## 1. System Overview & Context
You are building Feature 5 of "PrimePal", acting as **Agent B (The Instructor)**. 
We are using a "Four-Pillar" Mission Hub approach. The goal of this backend feature is to dynamically generate weekly missions that cover Listening, Speaking, Reading, and Writing (LSRW) based on vocabulary retrieved from the Single National Curriculum (SNC) vector database.

**Core Objectives:**
1. Retrieve grade-appropriate vocabulary from the SNC database (pgvector).
2. Use LangChain and OpenAI to generate a highly structured JSON object containing four distinct sub-tasks.
3. Save this generated "Quest" to the Supabase database so the Next.js frontend can serve it to the student's Mission Hub.

## 2. Tech Stack
* **Database:** Supabase (PostgreSQL).
* **Backend:** Python 3.11+ with FastAPI.
* **LLM Orchestration:** LangChain (`ChatOpenAI`, `PydanticOutputParser` or `with_structured_output`).
* **Model:** OpenAI `gpt-4o-mini` (Fast and highly reliable for JSON generation).

---

## 3. Database Schema (Supabase PostgreSQL)
Execute this SQL in the Supabase SQL Editor to ensure the `quests` table supports the four pillars.

```sql
CREATE TABLE IF NOT EXISTS quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, 
    topic_keyword VARCHAR(100) NOT NULL,
    target_vocabulary JSONB NOT NULL,
    
    -- The Four Pillars Content
    listening_text TEXT NOT NULL, -- Text that the TTS engine will read aloud
    listening_question VARCHAR(255) NOT NULL,
    
    reading_passage TEXT NOT NULL,
    reading_question VARCHAR(255) NOT NULL,
    
    writing_scenario TEXT NOT NULL, -- The prompt shown to the student
    
    speaking_scenario TEXT NOT NULL, -- The roleplay prompt for the STT interface
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quests_classroom ON quests(classroom_id) WHERE is_active = TRUE;
```

---

## 4. FastAPI Backend Implementation

### Requirements Setup:
`pip install fastapi pydantic langchain langchain-openai supabase`

### File: `app/api/routes/quests.py`
**Goal:** An endpoint triggered by the teacher to generate the 4-pillar quest using LangChain's structured output binding.

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
# ... imports for db and security (get_current_teacher, supabase_client)

router = APIRouter(prefix="/api/v1/quests", tags=["Quest Architect"])

# 1. Define the exact JSON structure we want the LLM to output
class FourPillarQuestSchema(BaseModel):
    title: str = Field(description="A fun, child-friendly title for the mission.")
    listening_text: str = Field(description="1-2 simple sentences for the TTS engine to read aloud.")
    listening_question: str = Field(description="A simple question about the listening text.")
    reading_passage: str = Field(description="A short 3-sentence reading passage using the target vocabulary.")
    reading_question: str = Field(description="A short question about the reading passage.")
    writing_scenario: str = Field(description="A scenario prompting the student to type a short text message reply.")
    speaking_scenario: str = Field(description="A roleplay scenario prompting the student to speak into the microphone.")

class QuestGenerateRequest(BaseModel):
    classroom_id: str
    topic_keyword: str # e.g., "Bazaar", "Family", "School"
    grade_level: int

# Initialize the LLM with structured output binding
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
structured_llm = llm.with_structured_output(FourPillarQuestSchema)

@router.post("/generate")
async def generate_quest(request: QuestGenerateRequest, teacher=Depends(get_current_teacher)):
    """Generates a 4-pillar mission using SNC vocabulary and saves it to the database."""
    try:
        # Step 1: Retrieve SNC Vocabulary from pgvector
        # TODO: Implement actual vector search calling the `snc_knowledge_base`
        # Mocked for current setup:
        retrieved_vocab = ["buy", "rupees", "vegetables", "fresh", "shopkeeper"]

        # Step 2: Construct the Prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert ESL curriculum designer for Pakistani primary schools. 
            Create a 4-part language mission for a Grade {grade_level} student about the topic: {topic}.
            
            CRITICAL RULES:
            1. You MUST naturally integrate these specific SNC vocabulary words: {vocab}.
            2. Keep the language extremely simple, culturally relevant to Pakistan, and age-appropriate.
            3. Do not use complex grammar structures outside of their grade level.
            4. Output MUST conform strictly to the provided JSON schema."""),
            ("user", "Generate the Four-Pillar Quest now.")
        ])

        # Step 3: Execute the LangChain Pipeline
        chain = prompt | structured_llm
        generated_quest: FourPillarQuestSchema = await chain.ainvoke({
            "grade_level": request.grade_level,
            "topic": request.topic_keyword,
            "vocab": ", ".join(retrieved_vocab)
        })

        # Step 4: Save to Supabase
        quest_data = {
            "classroom_id": request.classroom_id,
            "title": generated_quest.title,
            "topic_keyword": request.topic_keyword,
            "target_vocabulary": retrieved_vocab,
            "listening_text": generated_quest.listening_text,
            "listening_question": generated_quest.listening_question,
            "reading_passage": generated_quest.reading_passage,
            "reading_question": generated_quest.reading_question,
            "writing_scenario": generated_quest.writing_scenario,
            "speaking_scenario": generated_quest.speaking_scenario
        }
        
        # Insert into DB
        # response = supabase_client.table("quests").insert(quest_data).execute()

        return {
            "status": "success",
            "message": "Quest generated successfully.",
            "data": quest_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quest generation failed: {str(e)}")
```

## 5. Execution Instructions for AI
1. Run the SQL to create the `quests` table with the four-pillar structure.
2. Implement the FastAPI endpoint. The use of LangChain's `.with_structured_output()` is mandatory to prevent the LLM from returning invalid JSON strings (like conversational filler) that crash the backend.
3. Ensure the Pydantic field descriptions are highly descriptive, as LangChain passes these directly into the system prompt to guide the LLM's generation.
4. Wire up the Next.js teacher dashboard to include a "Generate Quest" button inside the Classroom Detail View (`app/(teacher)/dashboard/classrooms/[id]/page.tsx`) that triggers this endpoint.
