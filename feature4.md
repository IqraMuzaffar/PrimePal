
# PrimePal Implementation Guide: Feature 4 - Vector Storage & Curricular Tagging

## 1. System Overview & Context
You are building Feature 4 of "PrimePal", which is the second half of **Agent A (The Knowledge Curator)**. 
After Feature 3 extracts and chunks the Single National Curriculum (SNC) textbooks, this feature converts those text chunks into mathematical vectors (Embeddings) and stores them in a specialized vector database. 

**Core Objectives:**
1. Enable `pgvector` in the Supabase PostgreSQL database.
2. Create a table to store the textbook text, its vector embedding, and strict JSONB metadata (e.g., `grade_level`).
3. Build a FastAPI endpoint that accepts text chunks, uses an Embedding Model (e.g., OpenAI `text-embedding-3-small`) to vectorize them, and bulk-inserts them into Supabase.
4. Ensure indexes are optimized so the AI can filter by `grade_level` *before* performing the vector similarity search, preventing Grade 6 vocabulary from leaking into a Grade 2 chat.

## 2. Tech Stack
* **Vector Database:** Supabase (`pgvector` extension).
* **Backend:** Python 3.11+ with FastAPI.
* **Embedding Model:** LangChain (`OpenAIEmbeddings`).
* **Database Client:** Official Supabase Python Client.

---

## 3. Database Schema (Supabase pgvector)
Execute this SQL in the Supabase SQL Editor to set up the vector storage.

```sql
-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Knowledge Base Table
CREATE TABLE snc_knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL, -- The actual chunk of textbook text
    metadata JSONB NOT NULL, -- Stores {"grade_level": 3, "book_title": "..."}
    embedding VECTOR(1536), -- 1536 dimensions for OpenAI text-embedding-3-small
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create an HNSW index for ultra-fast vector similarity searches
-- Using cosine distance (vector_cosine_ops) which is standard for OpenAI embeddings
CREATE INDEX ON snc_knowledge_base 
USING hnsw (embedding vector_cosine_ops);

-- 4. Create a GIN index on the metadata for ultra-fast pre-filtering
-- This is critical to filter by grade_level BEFORE running the vector math
CREATE INDEX idx_snc_metadata ON snc_knowledge_base USING GIN (metadata);

-- 5. Row Level Security (RLS)
ALTER TABLE snc_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Only authenticated backend services (using service_role key) or teachers can insert/read directly
CREATE POLICY "Allow service role and teachers full access" 
ON snc_knowledge_base FOR ALL 
USING (auth.role() = 'authenticated');
```

---

## 4. FastAPI Backend Implementation

### Requirements Setup:
`pip install fastapi pydantic langchain-openai supabase`

### File: `app/api/routes/curriculum.py`
**Goal:** Continue building in the same file from Feature 3. Add an endpoint that takes the processed chunks and embeds them.

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
import os
from langchain_openai import OpenAIEmbeddings
# ... imports for db and security (get_current_teacher, supabase_service_client)

# NOTE: For vector insertion, we use the Supabase Service Role Key to bypass RLS 
# if the standard user token doesn't have the necessary database privileges for pgvector.

class ChunkInput(BaseModel):
    content: str
    metadata: Dict[str, Any]

class EmbedRequest(BaseModel):
    chunks: List[ChunkInput]

# Initialize the embedding model (1536 dimensions)
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")

@router.post("/embed")
async def embed_and_store_chunks(
    request: EmbedRequest,
    teacher=Depends(get_current_teacher) # Protect this route!
):
    """
    Takes processed text chunks, generates vector embeddings via OpenAI, 
    and stores them in the Supabase pgvector table.
    """
    if not request.chunks:
        raise HTTPException(status_code=400, detail="No chunks provided for embedding.")

    try:
        # 1. Extract raw texts to send to the embedding API
        texts = [chunk.content for chunk in request.chunks]
        
        # 2. Generate embeddings in bulk 
        # (LangChain automatically handles batching to respect OpenAI rate limits)
        vectors = await embeddings_model.aembed_documents(texts)
        
        # 3. Prepare data payload for Supabase bulk insert
        records_to_insert = []
        for i, chunk in enumerate(request.chunks):
            records_to_insert.append({
                "content": chunk.content,
                "metadata": chunk.metadata,
                "embedding": vectors[i]
            })
            
        # 4. Bulk insert into pgvector table
        # We use the service_role client here to ensure system-level insertions succeed
        response = supabase_service_client.table("snc_knowledge_base").insert(records_to_insert).execute()
        
        return {
            "status": "success",
            "message": f"Successfully embedded and stored {len(records_to_insert)} chunks in the vector database."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector embedding failed: {str(e)}")
```

---

## 5. Execution Instructions for AI
1. **Database Setup:** Execute the SQL provided to enable `pgvector`. Ensure the dimension size (`1536`) matches the chosen embedding model strictly. If you switch to an open-source model like `all-MiniLM-L6-v2`, you must change the SQL schema to `VECTOR(384)`.
2. **Supabase Client:** Ensure the backend utilizes the `SUPABASE_SERVICE_ROLE_KEY` for database interactions in this specific route, as inserting complex vector types sometimes conflicts with standard user-level RLS policies depending on the Supabase configuration.
3. **Integration with Feature 3:** Once this endpoint is built, modify the `/upload` endpoint from Feature 3 to automatically call this `/embed` logic natively in Python, so the teacher only has to upload the PDF once and the entire pipeline (Chunking -> Embedding -> Storing) runs automatically.




