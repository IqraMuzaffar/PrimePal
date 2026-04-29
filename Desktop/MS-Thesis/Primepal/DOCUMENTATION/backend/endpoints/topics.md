# Topics Endpoints

**Module:** `backend/app/api/v1/endpoints/topics.py`
**Prefix:** `/api/v1/topics`
**Auth:** None

## Endpoints

### GET `/topics`
List SNC topics, optionally filtered by grade level.
**Query params:** `grade_level?` (integer)
**Response:** `[{ id, name, grade_level, description }]`

## Notes
- Topics come from the `snc_topics` table
- Used by the curriculum page to tag uploads with a topic
- Used by classrooms to set active topics for curriculum alignment
- The `SncTopicOut` schema is defined in `backend/app/schemas/topic.py` (shared)
