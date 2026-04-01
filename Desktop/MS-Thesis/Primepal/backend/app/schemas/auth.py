from pydantic import BaseModel, EmailStr


class TeacherLoginRequest(BaseModel):
    email: EmailStr
    password: str


class StudentLoginRequest(BaseModel):
    class_code: str
    avatar_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
