# Announcements Endpoints

**Module:** `backend/app/api/v1/endpoints/announcements.py`
**Prefix:** `/api/v1/announcements`
**Auth:** Mixed (teacher for CRUD, public for student-facing)

## Endpoints

### POST `/announcements/`
**Auth:** Teacher
Create an announcement with scope (classroom-specific or grade-wide).

### GET `/announcements/`
**Auth:** Teacher
List all announcements created by the authenticated teacher.

### PATCH `/announcements/{id}`
**Auth:** Teacher
Update an announcement.

### DELETE `/announcements/{id}`
**Auth:** Teacher
Delete an announcement.

### GET `/announcements/active/{classroom_id}`
**Auth:** None (public for student access)
Get active announcements for a specific classroom. Returns bilingual content.
