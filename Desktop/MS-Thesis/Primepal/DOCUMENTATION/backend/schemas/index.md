# Backend Schemas

**Directory:** `backend/app/schemas/`

Shared Pydantic models used for request validation and response serialization across endpoint modules.

## Files

| File | Description |
|------|-------------|
| `classroom.py` | Classroom and student CRUD schemas |
| `topic.py` | SNC topic schemas for topic management |
| `__init__.py` | Empty init file |

---

## `classroom.py` -- Classroom and Student Schemas

### Request Schemas

#### `ClassroomCreate`

Used for `POST /classroom/` -- creating a new classroom.

```python
class ClassroomCreate(BaseModel):
    section: str = Field(default="A", description="Section letter, e.g. A, B, C")
    class_name: str | None = None     # Optional custom title; auto-generated if omitted
    grade_level: int = Field(ge=1, le=5)
```

#### `ClassroomUpdate`

Used for updating classroom details.

```python
class ClassroomUpdate(BaseModel):
    class_name: str | None = None     # Optional: update classroom display name
```

#### `StudentCreate`

Used for creating a single student.

```python
class StudentCreate(BaseModel):
    student_name: str
    roll_number: str | None = None
    email: str | None = None
```

#### `StudentUpdate`

Used for `PATCH /classroom/{id}/students/{student_id}` -- updating student details.

```python
class StudentUpdate(BaseModel):
    student_name: str | None = None
    roll_number: str | None = None
    email: str | None = None
```

#### `StudentBulkCreate`

Used for `POST /classroom/{id}/students/bulk` -- adding multiple students by name.

```python
class StudentBulkCreate(BaseModel):
    names: List[str]
```

#### `StudentBulkCreateV2`

Alternative bulk create using full `StudentCreate` objects.

```python
class StudentBulkCreateV2(BaseModel):
    students: List[StudentCreate]
```

### Response Schemas

#### `ClassroomResponse`

Standard classroom response shape.

```python
class ClassroomResponse(BaseModel):
    id: str
    class_name: str
    class_code: str
    grade_level: int
    section: str | None = None
    created_at: str
```

#### `StudentResponse`

Standard student response shape.

```python
class StudentResponse(BaseModel):
    id: str
    student_name: str
    avatar_url: str
    secret_pin: str
    roll_number: str | None = None
    email: str | None = None
    avatar_style: str = "adventurer"
    theme_color: str = "#6366f1"
    points: int | None = None
    father_name: str | None = None
```

#### `ClassroomDetail`

Extended classroom response that includes the full student roster. Inherits from `ClassroomResponse`.

```python
class ClassroomDetail(ClassroomResponse):
    students: List[StudentResponse]
```

---

## `topic.py` -- SNC Topic Schemas

### `SncTopicOut`

Single SNC topic output.

```python
class SncTopicOut(BaseModel):
    id: int
    grade_level: int
    skill: Literal["listening", "speaking", "reading", "writing"]
    topic_name: str
    is_globally_active: bool = True    # Grade-level activation status
```

### `SkillTopicsGroup`

Groups topics by skill (pillar).

```python
class SkillTopicsGroup(BaseModel):
    skill: Literal["listening", "speaking", "reading", "writing"]
    topics: list[SncTopicOut]
```

### `TopicsBySkillResponse`

Full response for topics organized by skill and grade.

```python
class TopicsBySkillResponse(BaseModel):
    grade_level: int
    skills: list[SkillTopicsGroup]
```

---

## Agent-Internal Schemas

Note: Several Pydantic models are defined within the agent modules rather than in `schemas/`. These include:

| Schema | Location | Description |
|--------|----------|-------------|
| `TutorResponse` | `agents/tutor_agent/chatbot.py` | Bilingual reply (bilingual_reply + english_reply) |
| `QuestionOption` | `agents/tutor_agent/mission_generator.py` | MCQ option (id, text, emoji) |
| `MissionQuestion` | `agents/tutor_agent/mission_generator.py` | Full question structure with 17+ fields |
| `DailyMissions` | `agents/tutor_agent/mission_generator.py` | Container for 3 daily questions |
| `PillarMissions` | `agents/tutor_agent/mission_generator.py` | Container for 10 pillar questions |
| `StudentInsightReport` | `agents/evaluator_agent/nlp_evaluator.py` | Evaluator report with 7 fields |

These are co-located with their agents because they also serve as LLM structured output targets via `ChatOpenAI.with_structured_output()`.
