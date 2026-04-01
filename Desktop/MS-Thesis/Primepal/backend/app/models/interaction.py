"""
SQLAlchemy model for Student-AI Interaction logs (Feature 8 - Interaction Logger).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.models.user import Base


class Pillar(str, enum.Enum):
    READING = "reading"
    WRITING = "writing"
    LISTENING = "listening"
    SPEAKING = "speaking"


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    quest_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    pillar = Column(SAEnum(Pillar), nullable=False)
    input_text = Column(String, nullable=True)
    audio_transcript = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
