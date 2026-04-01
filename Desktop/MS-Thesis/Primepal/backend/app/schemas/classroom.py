# backend/app/schemas/classroom.py
from typing import List
from pydantic import BaseModel, Field


class ClassroomCreate(BaseModel):
    class_name: str
    grade_level: int = Field(ge=1, le=5)


class ClassroomResponse(BaseModel):
    id: str
    class_name: str
    class_code: str
    grade_level: int
    created_at: str


class StudentResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str


class ClassroomDetail(ClassroomResponse):
    students: List[StudentResponse]


class StudentBulkCreate(BaseModel):
    names: List[str]
