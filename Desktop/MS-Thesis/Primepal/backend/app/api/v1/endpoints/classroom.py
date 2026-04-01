"""
Feature 2: Classroom Manager (The "Registry")
- Generate class codes
- Manage student ghost profiles / rosters
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/")
async def create_classroom():
    # TODO: create classroom, generate unique class code
    raise NotImplementedError


@router.get("/{classroom_id}")
async def get_classroom(classroom_id: str):
    # TODO: return classroom details and student roster
    raise NotImplementedError


@router.post("/{classroom_id}/students")
async def add_student(classroom_id: str):
    # TODO: create ghost profile for a student
    raise NotImplementedError


@router.delete("/{classroom_id}/students/{student_id}")
async def remove_student(classroom_id: str, student_id: str):
    # TODO: remove student from roster
    raise NotImplementedError
