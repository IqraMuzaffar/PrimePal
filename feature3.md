
# PrimePal Implementation Guide: Feature 3 - SNC Document Ingestion (RAG)

## 1. System Overview & Context
You are building Feature 3 of "PrimePal". This feature is the **Knowledge Curator (Agent A)**. 
Generic LLMs suffer from "Unbounded Content Generation" (hallucinations). To solve the Curricular Gap, PrimePal uses a Retrieval-Augmented Generation (RAG) architecture.

**Core Objectives:**
1. Provide a secure UI for teachers/admins to upload digitized Single National Curriculum (SNC) English textbooks (PDFs).
2. Securely store the raw PDF files for auditing.
3. Use LangChain to parse the PDF, clean the text of non-pedagogical noise (headers, page numbers), and split it into semantic chunks.
4. Append strict metadata (`grade_level`, `book_title`) to every chunk so the AI knows exactly who the vocabulary is meant for.

## 2. Tech Stack
* **File Storage:** Supabase Storage (S3-compatible bucket).
* **Backend:** Python 3.11+ with FastAPI.
* **Document Processing:** LangChain (`PyMuPDFLoader`, `RecursiveCharacterTextSplitter`).
* **Frontend:** Next.js 14+ (App Router) with Tailwind CSS.

---

## 3. Storage Setup (Supabase)
Before writing code, ensure the Supabase Storage bucket is created.

```sql
-- Create a secure bucket for the curriculum files
insert into storage.buckets (id, name, public) 
values ('snc-textbooks', 'snc-textbooks', false);

-- Set up RLS to ensure only authenticated teachers can upload/view
create policy "Teachers can upload textbooks" 
on storage.objects for insert 
with check ( bucket_id = 'snc-textbooks' and auth.role() = 'authenticated' );

create policy "Teachers can view textbooks" 
on storage.objects for select 
using ( bucket_id = 'snc-textbooks' and auth.role() = 'authenticated' );
```

---

## 4. FastAPI Backend Implementation

### Requirements Setup:
`pip install fastapi python-multipart langchain-community pymupdf supabase`

### File: `app/api/routes/curriculum.py`
**Goal:** An endpoint that accepts a multipart form data upload, streams it to Supabase, and processes it using LangChain.

```python
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Dict, Any
import os
import tempfile
import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
# ... imports for db and security (get_current_teacher, supabase_client)

router = APIRouter(prefix="/api/v1/curriculum", tags=["RAG Ingestion"])

def clean_snc_text(text: str) -> str:
    """Removes standard textbook noise like repeating headers, footers, or page numbers."""
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text) # Remove isolated page numbers
    text = re.sub(r'Single National Curriculum', '', text, flags=re.IGNORECASE)
    return text.strip()

@router.post("/upload")
async def upload_snc_textbook(
    file: UploadFile = File(...),
    grade_level: int = Form(...),
    book_title: str = Form(...),
    teacher=Depends(get_current_teacher)
):
    """Accepts PDF, uploads to storage, and chunks text for vectorization."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        # 1. Save file temporarily for LangChain processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # 2. Upload raw file to Supabase Storage (for backup/auditing)
        file_path_in_bucket = f"grade_{grade_level}/{file.filename}"
        # supabase_client.storage.from_("snc-textbooks").upload(file_path_in_bucket, content)

        # 3. Extract Text using LangChain PyMuPDFLoader
        loader = PyMuPDFLoader(tmp_path)
        documents = loader.load()

        # 4. Clean & Chunk Text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        
        raw_chunks = text_splitter.split_documents(documents)

        # 5. Apply Cleaning and Strict Curricular Metadata
        processed_chunks = []
        for i, chunk in enumerate(raw_chunks):
            cleaned_content = clean_snc_text(chunk.page_content)
            if len(cleaned_content) < 50: # Skip empty or useless chunks
                continue
                
            chunk.metadata.update({
                "grade_level": grade_level,
                "book_title": book_title,
                "chunk_id": f"{book_title}_chunk_{i}"
            })
            processed_chunks.append({
                "content": cleaned_content,
                "metadata": chunk.metadata
            })

        # Clean up temp file
        os.unlink(tmp_path)

        # NOTE: In the next feature (Feature 4), we will pass `processed_chunks` 
        # to the embedding model. For now, we return them to verify parsing.
        
        return {
            "status": "success",
            "message": f"Successfully processed {len(processed_chunks)} chunks.",
            "sample_chunk": processed_chunks[0] if processed_chunks else None
        }

    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 5. Next.js Frontend Implementation

### Folder Structure Setup:
* `app/(teacher)/dashboard/curriculum/page.tsx`
* `components/teacher/FileUploadZone.tsx`

### File: `app/(teacher)/dashboard/curriculum/page.tsx`
**Goal:** The UI for managing the AI's knowledge base.
* **UI:** A clean dashboard page listing currently ingested textbooks. Includes a prominent "Upload New Textbook" section.
* **Form Requirements:**
  * Dropdown for `grade_level` (1 through 6).
  * Text input for `book_title` (e.g., "Punjab Board Grade 3 English").
  * A drag-and-drop file upload zone (accepts `.pdf` only).
* **Interactions:** When the form is submitted, use `FormData` to append the file and text fields, then send a `POST` request to `/api/v1/curriculum/upload`.
* **UX:** Display a clear loading spinner during upload, as LangChain PDF parsing can take several seconds depending on the file size.

## 6. Execution Instructions for AI
1. Create the Supabase Storage bucket and apply the RLS policies.
2. Build the FastAPI endpoint. Pay special attention to the `tempfile` logic; ensuring the temporary PDF is deleted even if the LangChain parsing throws an error is critical to prevent server storage leaks.
3. Build the Next.js UI using native HTML5 file inputs or a library like `react-dropzone` for a better user experience.
4. Make sure the HTTP request from Next.js uses `multipart/form-data` correctly so FastAPI's `UploadFile` can catch it.
