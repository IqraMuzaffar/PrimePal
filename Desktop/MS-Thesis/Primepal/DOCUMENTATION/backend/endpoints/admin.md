# Admin Endpoints

**Module:** `backend/app/api/v1/endpoints/admin.py`
**Prefix:** `/admin` (self-defined, unlike other routers)
**Auth:** Admin (teacher with admin privileges)

## Endpoints

### GET `/admin/teachers`
List all teachers in the system.

### POST `/admin/teachers`
Create a new teacher account. Requires a valid invite code.
**Body:** `{ email, full_name, password, invite_code }`

### POST `/admin/invite-codes`
Generate a new invite code for teacher onboarding.

### GET `/admin/validate-invite-code/{code}`
Check if an invite code is valid.

### GET `/admin/classrooms`
List all classrooms across all teachers.

### PATCH `/admin/classrooms/{id}/reassign`
Reassign a classroom to a different teacher.

### GET `/admin/curriculum`
List all uploaded curriculum chunks.

### DELETE `/admin/curriculum/{id}`
Delete a curriculum chunk.

## Notes
- Admin router defines its own prefix (`/admin`), unlike other routers
- Error responses expose internal exception messages (see TICKETS/05 for planned fix)
