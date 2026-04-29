# backend/app/schemas/classroom.py
from typing import List
from pydantic import BaseModel, Field


class ClassroomCreate(BaseModel):
    section: str = Field(default="A", description="Section letter, e.g. A, B, C")
    class_name: str | None = None  # Optional custom title; auto-generated if omitted
    grade_level: int = Field(ge=1, le=5)


class ClassroomResponse(BaseModel):
    id: str
    class_name: str
    class_code: str
    grade_level: int
    section: str | None = None
    current_week_topic: str | None = None
    created_at: str


class StudentResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str
    secret_pin: str
    roll_number: str | None = None
    email: str | None = None


class StudentUpdate(BaseModel):
    student_name: str | None = None
    roll_number: str | None = None
    email: str | None = None


class StudentCreate(BaseModel):
    student_name: str
    roll_number: str | None = None
    email: str | None = None


class ClassroomDetail(ClassroomResponse):
    students: List[StudentResponse]


class StudentBulkCreate(BaseModel):
    names: List[str]


class StudentBulkCreateV2(BaseModel):
    students: List[StudentCreate]


class ClassroomUpdate(BaseModel):
    current_week_topic: str | None = None
