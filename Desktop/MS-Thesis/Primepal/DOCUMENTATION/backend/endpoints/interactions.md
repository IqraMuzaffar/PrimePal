# Interactions Endpoints

**Module:** `backend/app/api/v1/endpoints/interactions.py`
**Prefix:** `/api/v1/interactions`
**Auth:** Student (custom PyJWT)

## Endpoints

### POST `/interactions`
Log a student-AI interaction.
**Body:** `{ interaction_type, pillar, prompt, response, correct?, score? }`

Most interaction logging happens automatically via BackgroundTasks in other endpoints (missions, chat, spelling-bee, etc.). This endpoint exists for explicit client-side logging.

## Table: student_interactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| student_id | uuid | FK to students |
| classroom_id | uuid | FK to classrooms |
| interaction_type | text | mission, chat, spelling-bee, story-time, speaking |
| pillar | text | reading, writing, listening, speaking |
| correct | boolean | Whether the answer was correct |
| score | integer | Points earned |
| prompt | text | The question/prompt shown |
| response | text | The student's response |
| grade_level | integer | Student's grade at time of interaction |
| created_at | timestamptz | Auto-set |
