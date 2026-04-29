from pydantic import BaseModel


class SncTopicOut(BaseModel):
    id: int
    grade_level: int
    topic_name: str
