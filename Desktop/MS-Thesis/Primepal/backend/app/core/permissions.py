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
        "dashboard:read",
        "analytics:read",
        "assistant:use",
        "syllabus:read",
        # NOTE: classroom/student CRUD operations require is_admin=True
        # These are enforced via check_admin() function, not permission strings
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


def check_admin(teacher: dict) -> None:
    """Raise 403 if the teacher is not an admin.

    Use this for write operations (create, update, delete) on classrooms and students.
    All teachers can read data, but only admins can modify it.
    """
    role = teacher.get("role", "teacher")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This operation requires admin privileges",
        )
