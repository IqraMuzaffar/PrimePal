from uuid import UUID
from pydantic import BaseModel


class ClassroomCreate(BaseModel):
    name: str
    grade_level: str | None = None


class ClassroomResponse(BaseModel):
    id: UUID
    name: str
    class_code: str
    grade_level: str | None

    model_config = {"from_attributes": True}


class StudentCreate(BaseModel):
    display_name: str
    avatar_id: str


class StudentResponse(BaseModel):
    id: UUID
    display_name: str
    avatar_id: str

    model_config = {"from_attributes": True}
