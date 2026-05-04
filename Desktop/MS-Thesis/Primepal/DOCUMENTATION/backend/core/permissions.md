# Permissions

**File:** `backend/app/core/permissions.py`

Role-based permission system for teacher and admin access control. Used by endpoint handlers to gate actions that require specific roles.

## Role Definitions

```python
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {"*"},
    "teacher": {
        "classroom:read",
        "student:read",
        "student:search",
        "report:read",
        "report:export",
        "topic:read",
        "topic:select",
        "announcement:read",
        "announcement:create",
        "announcement:update",
        "dashboard:read",
        "analytics:read",
        "assistant:use",
        "syllabus:read",
    },
}
```

### Admin Role

The admin role has a **wildcard permission** (`"*"`), granting access to all actions without explicit enumeration.

### Teacher Role

The teacher role has 14 specific permissions covering:

| Permission | Description |
|-----------|-------------|
| `classroom:read` | View own classrooms |
| `student:read` | View student profiles and data |
| `student:search` | Search for students |
| `report:read` | View student/classroom reports |
| `report:export` | Export report data |
| `topic:read` | View SNC topics |
| `topic:select` | Select/deselect active topics for a classroom |
| `announcement:read` | View announcements |
| `announcement:create` | Create new announcements |
| `announcement:update` | Edit existing announcements |
| `dashboard:read` | View teacher dashboard |
| `analytics:read` | View analytics data |
| `assistant:use` | Use AI assistant features |
| `syllabus:read` | View syllabus/curriculum content |

## Function

### `check_permission(teacher: dict, action: str) -> None`

Checks whether the teacher's role has the requested permission action.

**Parameters:**
- `teacher` -- Dict from `get_current_teacher()`, must contain `"role"` key
- `action` -- Permission string (e.g., `"report:read"`, `"announcement:create"`)

**Behavior:**
1. Reads `role` from the teacher dict (defaults to `"teacher"` if missing)
2. Looks up the role's permission set in `ROLE_PERMISSIONS`
3. If `"*"` is in the permission set (admin), returns immediately
4. If the action is in the permission set, returns immediately
5. Otherwise, raises `HTTPException(403)` with detail `"This action requires admin privileges"`

**Usage:**
```python
from app.core.permissions import check_permission

@router.get("/admin/users")
async def list_users(teacher: dict = Depends(get_current_teacher)):
    check_permission(teacher, "admin:manage_users")  # raises 403 for non-admin
    ...
```

## Design Notes

- Roles not in `ROLE_PERMISSIONS` (e.g., an unknown role string) get an empty permission set and are denied all actions.
- The error message always says "admin privileges" regardless of the action, simplifying the user-facing error.
- Permission checks are synchronous (no `async`) since they only inspect in-memory data.
