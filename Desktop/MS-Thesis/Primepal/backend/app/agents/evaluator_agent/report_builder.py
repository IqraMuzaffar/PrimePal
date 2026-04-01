"""
Agent C - Evaluator: Four-Skill Action Plan Dashboard data layer (Feature 10)
Aggregates NLP scores into teacher-facing reports.
"""


async def build_student_report(student_id: str) -> dict:
    # TODO: aggregate per-pillar scores, surface strengths/gaps
    raise NotImplementedError


async def build_classroom_report(classroom_id: str) -> dict:
    # TODO: class-wide trend aggregation + anti-join for incomplete assignments
    raise NotImplementedError
