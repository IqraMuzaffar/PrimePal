
# PrimePal Implementation Guide: Feature 2 - Classroom Manager (The Registry)

## 1. System Overview & Context
You are building Feature 2 of "PrimePal". This feature is the **Teacher's Administrative Dashboard**. 
Since our target demographic (primary school students) cannot create their own accounts, the system relies on a "Teacher-Led Provisioning Model." 

**Core Objectives:**
1. Allow authenticated teachers to create "Classrooms".
2. Automatically generate a collision-free, 6-character alphanumeric `class_code` via a PostgreSQL trigger.
3. Allow teachers to bulk-add student names to a roster, which automatically generates "ghost profiles" with assigned default avatars.

## 2. Tech Stack
* **Database:** Supabase (PostgreSQL).
* **Backend:** Python 3.11+ with FastAPI.
* **Frontend:** Next.js 14+ (App Router) with Tailwind CSS.

---

## 3. Database Functions & Triggers (Supabase SQL)
*Note: Core tables (`teachers`, `classrooms`, `students`) and RLS policies were created in Feature 1. Execute the following SQL to add the auto-generation logic for class codes.*

```sql
-- Function to auto-generate a 6-character unique class code (A-Z, 0-9)
CREATE OR REPLACE FUNCTION generate_class_code() 
RETURNS trigger AS $$
DECLARE
    new_code VARCHAR(6);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 6 character uppercase string
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM classrooms WHERE class_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            NEW.class_code := new_code;
            EXIT;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to fire before insert on classrooms
DROP TRIGGER IF EXISTS set_class_code ON classrooms;
CREATE TRIGGER set_class_code
BEFORE INSERT ON classrooms
FOR EACH ROW
EXECUTE FUNCTION generate_class_code();
```

---

## 4. FastAPI Backend Implementation

### File: `app/api/routes/classrooms.py`
**Goal:** Secure REST endpoints for classroom and roster management. All endpoints MUST be protected by the `get_current_teacher` dependency (which validates the Supabase Auth JWT).

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import random
# ... imports for db and security (get_current_teacher)

router = APIRouter(prefix="/api/v1/classrooms", tags=["Classroom Manager"])

# Pydantic Schemas
class ClassroomCreate(BaseModel):
    class_name: str
    grade_level: int

class ClassroomResponse(BaseModel):
    id: str
    class_name: str
    class_code: str
    grade_level: int
    created_at: str

class StudentBulkCreate(BaseModel):
    names: List[str]

# Pre-defined list of local avatar assets in Next.js public folder
DEFAULT_AVATARS = [
    "/avatars/tiger.png", "/avatars/owl.png", "/avatars/panda.png", 
    "/avatars/fox.png", "/avatars/monkey.png", "/avatars/rabbit.png"
]

@router.post("/", response_model=ClassroomResponse)
async def create_classroom(request: ClassroomCreate, teacher=Depends(get_current_teacher)):
    """Creates a new classroom. The PostgreSQL trigger will auto-generate the class_code."""
    # 1. Insert into `classrooms` (teacher_id = teacher['id'], class_name = request.class_name, grade_level = request.grade_level)
    # 2. Return the created record (including the auto-generated class_code)
    pass

@router.get("/", response_model=List[ClassroomResponse])
async def list_classrooms(teacher=Depends(get_current_teacher)):
    """Fetches all classrooms belonging to the authenticated teacher."""
    # 1. Query: SELECT * FROM classrooms WHERE teacher_id = teacher['id'] ORDER BY created_at DESC
    pass

@router.post("/{classroom_id}/students/bulk")
async def add_students_bulk(classroom_id: str, request: StudentBulkCreate, teacher=Depends(get_current_teacher)):
    """Adds multiple students to a roster and assigns random default avatars."""
    # 1. Verify classroom belongs to the requesting teacher.
    # 2. Iterate through request.names:
    #    - Assign a random avatar from DEFAULT_AVATARS
    #    - Format for bulk insert
    # 3. Bulk insert into `students` table.
    # 4. Return success message and the number of students added.
    pass
```

---

## 5. Next.js Frontend Implementation

### Folder Structure Setup:
* `app/(teacher)/dashboard/page.tsx` (Main Dashboard view)
* `app/(teacher)/dashboard/classrooms/[id]/page.tsx` (Specific Classroom detail view)
* `components/teacher/CreateClassModal.tsx`
* `components/teacher/BulkAddStudentsModal.tsx`

### File: `app/(teacher)/dashboard/page.tsx`
**Goal:** The main landing page for teachers after logging in.
* **UI:** A grid of "Classroom Cards". Each card displays the `class_name`, `grade_level`, and prominently features the 6-digit `class_code` (with a quick "copy to clipboard" button).
* **Interactions:** A prominent "Create New Class" button that opens `CreateClassModal.tsx`.
* **Data Fetching:** Call `GET /api/v1/classrooms` on mount.

### File: `components/teacher/BulkAddStudentsModal.tsx`
**Goal:** The interface for generating the "ghost profiles".
* **UI:** A large `textarea` where teachers can paste a comma-separated or newline-separated list of student names (e.g., copied from an Excel spreadsheet).
* **Logic:** 1. Parse the text area input into an array of strings.
  2. Call `POST /api/v1/classrooms/{id}/students/bulk`.
  3. On success, trigger a data re-fetch to update the roster table on the page.

### File: `app/(teacher)/dashboard/classrooms/[id]/page.tsx`
**Goal:** The detailed view for a single classroom.
* **UI Structure:**
  * **Header:** Class Name, Grade Level, and Class Code.
  * **Tabs:** "Roster" | "Missions" | "Analytics"
  * **Roster Tab View:** A data table listing all students in the class. It should display their assigned `avatar_url` (as a small image) and their `student_name`. 
  * **Interactions:** "Add Students" button that opens the bulk add modal.

## 6. Execution Instructions for AI
1. Implement the SQL triggers in the Supabase schema first to ensure `class_code` generation works at the database level.
2. Build out the FastAPI `classrooms.py` router, ensuring the `get_current_teacher` dependency properly secures the routes.
3. Build the Next.js teacher dashboard UI, prioritizing a clean, administrative layout (consider using a library like `shadcn/ui` for tables and modals to speed up development).
4. Ensure the bulk-add string parsing logic in the frontend handles edge cases (like trailing commas or empty lines) before sending the array to the backend.
