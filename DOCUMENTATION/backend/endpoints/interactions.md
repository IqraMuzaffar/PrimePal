# Interactions Endpoints

**Module:** `backend/app/api/v1/endpoints/interactions.py`
**Prefix:** `/api/v1/interactions`
**Auth:** Student JWT (`get_current_student`)
**Feature:** Student Interaction Logging (Feature 8)

## Overview

Logs game results (mission answers) to the `student_interactions` table. Includes a frustration detection algorithm based on a rolling window of the last 3 interactions. The `is_frustrated` flag is returned so the frontend can request "Confidence Builder" questions.

---

## POST `/api/v1/interactions`

**Status Code:** 201

Log a batch of game results to student_interactions.

**Request Body:** `LogInteractionsRequest`
```json
{
  "pillar": "reading",
  "results": [
    {
      "question_id": "q1",
      "is_correct": true,
      "time_remaining": 8
    },
    {
      "question_id": "q2",
      "is_correct": false,
      "time_remaining": 3
    }
  ]
}
```

**Response:** `LogInteractionsResponse`
```json
{
  "logged_interactions": 2,
  "correct_count": 1,
  "accuracy": 0.5,
  "pillar": "reading",
  "is_frustrated": false,
  "frustration_reason": null
}
```

**Business Logic:**
1. Validate results list is non-empty
2. Fetch classroom grade_level
3. For each result, insert a `student_interactions` record:
   - `interaction_type`: `"mission_mc"` (hardcoded)
   - `time_spent`: `15 - time_remaining` (converts from timer value to time spent)
   - `pillar`: from request
   - `correct`: from `is_correct`
4. Calculate summary stats (correct_count, accuracy)
5. **Frustration Detection Algorithm** -- checks rolling window of last 3 mission interactions:
   - **Condition 1:** All 3 consecutive questions answered incorrectly (100% error rate)
   - **Condition 2:** Average `time_spent` for last 3 questions > 12 seconds (high cognitive load)
   - If either condition met, `is_frustrated=true` with reason string
   - Frustration detection failure is graceful (silently continues without flag)

**DB Tables:**
- `classrooms` (grade_level lookup)
- `student_interactions` (insert per result + query last 3 for frustration)

**Errors:**
- 400: No results provided
- 500: Failed to log interaction
