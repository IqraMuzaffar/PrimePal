# Classroom Endpoints

**Module:** `backend/app/api/v1/endpoints/classroom.py`
**Prefix:** `/api/v1/classroom`
**Auth:** All endpoints require Teacher (GoTrue JWT)

## Endpoints

### GET `/classroom/`
List authenticated teacher's classrooms, newest first.

### POST `/classroom/`
Create a new classroom. The database trigger auto-generates a unique 6-char hex class code.
**Body:** `{ name, grade_level, section? }`

### GET `/classroom/{id}`
Get classroom detail including full student roster.

### POST `/classroom/{id}/students/bulk`
Bulk-create student ghost profiles. Accepts comma/newline-separated names.
**Body:** `{ names: ["name1", "name2", ...] }`

### DELETE `/classroom/{id}/students/{student_id}`
Remove a student from the classroom.

### GET `/classroom/{id}/active-topics`
Get active SNC topics for the classroom.

### PUT `/classroom/{id}/active-topics`
Update active topics for curriculum alignment.
**Body:** `{ topic_ids: [uuid, ...] }`

### PATCH `/classroom/{id}/syllabus/{week}`
Update syllabus week configuration.
