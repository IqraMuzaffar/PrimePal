from fastapi import HTTPException, status


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


def check_permission(teacher: dict, action: str) -> None:
    """Raise 403 if the teacher's role lacks the requested action."""
    role = teacher.get("role", "teacher")
    perms = ROLE_PERMISSIONS.get(role, set())
    if "*" in perms or action in perms:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="This action requires admin privileges",
    )
