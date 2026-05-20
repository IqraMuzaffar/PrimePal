"""
A01: Pre/Post-Test Evaluation System.

Provides standardized pre- and post-test evaluations to measure student
improvement.  Results are completely ISOLATED from the gamification layer
(no points, no streak, no interaction logs).
"""

from datetime import datetime, timezone
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_admin, get_current_student
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


# ── Pydantic models ──────────────────────────────────────────────────────────

class EvaluationStatusOut(BaseModel):
    needs_pre_test: bool
    needs_post_test: bool
    pre_completed: bool
    post_completed: bool


class AnswerIn(BaseModel):
    question_id: str
    student_answer: Union[str, List[str]]  # str for most types; list for checkbox_multi
    time_taken_ms: int = 0
    likert_value: Optional[int] = None


class SubmitBody(BaseModel):
    evaluation_type: str  # 'pre' or 'post'
    answers: List[AnswerIn]


class QuestionResult(BaseModel):
    question_id: str
    question_text: str
    student_answer: str
    correct_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    section: str
    pillar: Optional[str] = None


class SubmitOut(BaseModel):
    total_questions: int
    correct_count: int
    academic_total: int
    academic_correct: int
    completed: bool
    question_results: List[QuestionResult] = []


class TriggerPostTestBody(BaseModel):
    scope: str  # 'global' | 'grade' | 'classroom'
    target_id: Optional[str] = None


class TriggerPostTestOut(BaseModel):
    students_unlocked: int


class StudentResult(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    evaluation_type: str
    total: int
    correct: int
    psychometric_avg: Optional[float] = None


class ResultsOut(BaseModel):
    results: List[StudentResult]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ensure_status_row(sb, student_id: str) -> dict:
    """Return the evaluation_status row for a student, creating it if needed."""
    res = sb.table("evaluation_status").select("*").eq("student_id", student_id).execute()
    if res.data:
        return res.data[0]
    # Create a fresh row
    row = {"student_id": student_id}
    sb.table("evaluation_status").insert(row).execute()
    return {
        "student_id": student_id,
        "pre_test_completed": False,
        "pre_test_completed_at": None,
        "post_test_completed": False,
        "post_test_completed_at": None,
        "post_test_unlocked": False,
    }


def _get_student_grade(sb, student_id: str) -> int:
    """Resolve the grade_level for a student via students -> classrooms join."""
    stu = sb.table("students").select("classroom_id").eq("id", student_id).single().execute()
    if not stu.data:
        raise HTTPException(status_code=404, detail="Student not found")
    classroom_id = stu.data["classroom_id"]
    cls = sb.table("classrooms").select("grade_level").eq("id", classroom_id).single().execute()
    if not cls.data:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return int(cls.data["grade_level"])


# ── Student-facing endpoints ─────────────────────────────────────────────────

@router.get("/status", response_model=EvaluationStatusOut)
async def get_evaluation_status(student: dict = Depends(get_current_student)):
    """Check whether the current student needs to take a pre- or post-test."""
    sb = get_supabase_admin()
    student_id = student["sub"]
    row = _ensure_status_row(sb, student_id)
    pre_done = bool(row.get("pre_test_completed"))
    post_done = bool(row.get("post_test_completed"))
    post_unlocked = bool(row.get("post_test_unlocked"))
    return EvaluationStatusOut(
        needs_pre_test=False,  # Pre-test disabled — data gathered via paper forms
        needs_post_test=post_unlocked and not post_done,
        pre_completed=pre_done,
        post_completed=post_done,
    )


@router.get("/questions")
async def get_evaluation_questions(
    type: str = Query(..., regex="^(pre|post)$"),
    student: dict = Depends(get_current_student),
):
    """Return the ordered question set for this student's grade and evaluation type."""
    sb = get_supabase_admin()
    student_id = student["sub"]
    grade = _get_student_grade(sb, student_id)

    res = (
        sb.table("evaluation_questions")
        .select("id,grade_level,evaluation_type,section,pillar,question_index,question_text,question_text_ur,task_type,options,difficulty,audio_text,image_context")
        .eq("grade_level", grade)
        .eq("evaluation_type", type)
        .order("question_index")
        .execute()
    )
    # Strip correct_answer — not included in select above
    return res.data or []


@router.post("/submit", response_model=SubmitOut)
async def submit_evaluation(
    body: SubmitBody,
    student: dict = Depends(get_current_student),
):
    """Submit all answers for an evaluation. Grades answers and stores records."""
    if body.evaluation_type not in ("pre", "post"):
        raise HTTPException(status_code=400, detail="evaluation_type must be 'pre' or 'post'")

    sb = get_supabase_admin()
    student_id = student["sub"]
    grade = _get_student_grade(sb, student_id)

    # Verify evaluation is actually needed
    row = _ensure_status_row(sb, student_id)
    if body.evaluation_type == "pre" and row.get("pre_test_completed"):
        raise HTTPException(status_code=400, detail="Pre-test already completed")
    if body.evaluation_type == "post":
        if not row.get("post_test_unlocked"):
            raise HTTPException(status_code=403, detail="Post-test not yet unlocked")
        if row.get("post_test_completed"):
            raise HTTPException(status_code=400, detail="Post-test already completed")

    # Fetch correct answers + metadata for grading
    q_ids = [a.question_id for a in body.answers]
    q_res = (
        sb.table("evaluation_questions")
        .select("id,correct_answer,section,task_type,question_text,pillar")
        .in_("id", q_ids)
        .execute()
    )
    answer_map = {q["id"]: q for q in (q_res.data or [])}

    records = []
    correct_count = 0
    for ans in body.answers:
        q = answer_map.get(ans.question_id)
        task_type = q.get("task_type", "") if q else ""
        section = q.get("section", "") if q else ""
        is_correct = None

        # Normalise student_answer to a string for storage
        if isinstance(ans.student_answer, list):
            student_answer_str = ",".join(ans.student_answer)
        else:
            student_answer_str = ans.student_answer

        # Feedback section questions are never graded
        if section == "feedback":
            is_correct = None
        # Likert scales (emoji or 4-point) are opinion — not graded
        elif task_type in ("likert_emoji", "likert_4pt"):
            is_correct = None
        # Checkbox multi-select (feedback checkboxes) — not graded
        elif task_type == "checkbox_multi":
            is_correct = None
        # Academic multiple_choice / other types with a correct_answer
        elif q and q.get("correct_answer"):
            is_correct = student_answer_str.strip().lower() == q["correct_answer"].strip().lower()
            if is_correct:
                correct_count += 1
        # Academic questions with NULL correct_answer (e.g. "which skill improved most") — not graded
        # is_correct stays None

        records.append({
            "student_id": student_id,
            "evaluation_type": body.evaluation_type,
            "question_id": ans.question_id,
            "student_answer": student_answer_str,
            "is_correct": is_correct,
            "time_taken_ms": ans.time_taken_ms,
            "likert_value": ans.likert_value,
            "grade_level": grade,
        })

    # Bulk insert records
    if records:
        sb.table("evaluation_records").insert(records).execute()

    # Update evaluation_status
    now = datetime.now(tz=timezone.utc).isoformat()
    if body.evaluation_type == "pre":
        sb.table("evaluation_status").update({
            "pre_test_completed": True,
            "pre_test_completed_at": now,
        }).eq("student_id", student_id).execute()
    else:
        sb.table("evaluation_status").update({
            "post_test_completed": True,
            "post_test_completed_at": now,
        }).eq("student_id", student_id).execute()

    # Build per-question results for the completion screen
    question_results = []
    academic_total = 0
    academic_correct = 0
    for ans in body.answers:
        q = answer_map.get(ans.question_id, {})
        section = q.get("section", "")
        student_ans = ",".join(ans.student_answer) if isinstance(ans.student_answer, list) else ans.student_answer
        correct_ans = q.get("correct_answer")
        is_correct_val = None
        if section == "academic" and correct_ans:
            is_correct_val = student_ans.strip().lower() == correct_ans.strip().lower()
            academic_total += 1
            if is_correct_val:
                academic_correct += 1
        question_results.append(QuestionResult(
            question_id=ans.question_id,
            question_text=q.get("question_text", ""),
            student_answer=student_ans,
            correct_answer=correct_ans if section == "academic" else None,
            is_correct=is_correct_val,
            section=section,
            pillar=q.get("pillar"),
        ))

    return SubmitOut(
        total_questions=len(body.answers),
        correct_count=correct_count,
        academic_total=academic_total,
        academic_correct=academic_correct,
        completed=True,
        question_results=question_results,
    )


# ── Admin-facing endpoints ───────────────────────────────────────────────────

@router.post("/trigger-post-test", response_model=TriggerPostTestOut)
async def trigger_post_test(
    body: TriggerPostTestBody,
    admin: dict = Depends(get_current_admin),
):
    """Unlock the post-test for a set of students (global, by grade, or by classroom)."""
    sb = get_supabase_admin()

    if body.scope == "global":
        # All students
        students_res = sb.table("students").select("id").execute()
    elif body.scope == "grade":
        if not body.target_id:
            raise HTTPException(status_code=400, detail="target_id (grade_level) required for grade scope")
        grade_level = int(body.target_id)
        classrooms_res = sb.table("classrooms").select("id").eq("grade_level", grade_level).execute()
        classroom_ids = [c["id"] for c in (classrooms_res.data or [])]
        if not classroom_ids:
            return TriggerPostTestOut(students_unlocked=0)
        students_res = sb.table("students").select("id").in_("classroom_id", classroom_ids).execute()
    elif body.scope == "classroom":
        if not body.target_id:
            raise HTTPException(status_code=400, detail="target_id (classroom_id) required for classroom scope")
        students_res = sb.table("students").select("id").eq("classroom_id", body.target_id).execute()
    else:
        raise HTTPException(status_code=400, detail="scope must be 'global', 'grade', or 'classroom'")

    student_ids = [s["id"] for s in (students_res.data or [])]
    if not student_ids:
        return TriggerPostTestOut(students_unlocked=0)

    # Ensure status rows exist, then unlock
    count = 0
    for sid in student_ids:
        _ensure_status_row(sb, sid)
        sb.table("evaluation_status").update({
            "post_test_unlocked": True,
        }).eq("student_id", sid).execute()
        count += 1

    return TriggerPostTestOut(students_unlocked=count)


@router.get("/results", response_model=ResultsOut)
async def get_evaluation_results(
    grade_level: Optional[int] = Query(None),
    evaluation_type: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    admin: dict = Depends(get_current_admin),
):
    """Return aggregated evaluation results for admin review."""
    sb = get_supabase_admin()

    # Build query for evaluation_records — join question_id to get section
    query = sb.table("evaluation_records").select("student_id,evaluation_type,is_correct,likert_value,grade_level,question_id")
    if grade_level is not None:
        query = query.eq("grade_level", grade_level)
    if evaluation_type:
        query = query.eq("evaluation_type", evaluation_type)
    if student_id:
        query = query.eq("student_id", student_id)

    res = query.execute()
    rows = res.data or []

    if not rows:
        return ResultsOut(results=[])

    # Fetch question metadata to identify feedback-section questions
    all_qids = list({r["question_id"] for r in rows if r.get("question_id")})
    q_meta = {}
    if all_qids:
        q_res = sb.table("evaluation_questions").select("id,section").in_("id", all_qids).execute()
        q_meta = {q["id"]: q for q in (q_res.data or [])}

    # Collect unique student IDs and fetch names
    unique_sids = list({r["student_id"] for r in rows})
    names_res = sb.table("students").select("id,student_name").in_("id", unique_sids).execute()
    name_map = {s["id"]: s.get("student_name", "") for s in (names_res.data or [])}

    # Aggregate per (student_id, evaluation_type)
    from collections import defaultdict
    buckets: dict = defaultdict(lambda: {"total": 0, "academic_total": 0, "correct": 0, "likert_vals": []})
    for r in rows:
        key = (r["student_id"], r["evaluation_type"])
        qid = r.get("question_id", "")
        section = q_meta.get(qid, {}).get("section", "")

        buckets[key]["total"] += 1
        # Only count academic questions with a graded answer in the score
        if section == "academic" and r.get("is_correct") is not None:
            buckets[key]["academic_total"] += 1
            if r["is_correct"]:
                buckets[key]["correct"] += 1
        if r.get("likert_value") is not None:
            buckets[key]["likert_vals"].append(r["likert_value"])

    results = []
    for (sid, etype), agg in buckets.items():
        likert_avg = None
        if agg["likert_vals"]:
            likert_avg = round(sum(agg["likert_vals"]) / len(agg["likert_vals"]), 2)
        results.append(StudentResult(
            student_id=sid,
            student_name=name_map.get(sid),
            evaluation_type=etype,
            total=agg["academic_total"],
            correct=agg["correct"],
            psychometric_avg=likert_avg,
        ))

    return ResultsOut(results=results)
