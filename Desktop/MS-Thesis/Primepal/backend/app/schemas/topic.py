from pydantic import BaseModel
from typing import Literal


class SncTopicOut(BaseModel):
    id: int
    grade_level: int
    skill: Literal["listening", "speaking", "reading", "writing"]
    topic_name: str
    is_globally_active: bool = True  # Grade-level activation status


class SkillTopicsGroup(BaseModel):
    skill: Literal["listening", "speaking", "reading", "writing"]
    topics: list[SncTopicOut]


class TopicsBySkillResponse(BaseModel):
    grade_level: int
    skills: list[SkillTopicsGroup]
