# Speaking Endpoints

**Module:** `backend/app/api/v1/endpoints/speaking.py`
**Prefix:** `/api/v1/speaking`
**Auth:** Student (custom PyJWT)

## Endpoints

### GET `/speaking/prompts`
Generate speaking practice prompts appropriate for student's grade level.
Uses LLM + curriculum RAG context.

### POST `/speaking/evaluate`
Evaluate a student's spoken response using basic text comparison.
**Body:** `{ prompt_id, transcript }`
Awards points on sufficient accuracy.

### POST `/speaking/evaluate-pro`
Advanced evaluation using OpenAI Whisper for audio transcription with word-level timestamps.
**Body:** `multipart/form-data` with `audio` file + `prompt_id`
Returns detailed pronunciation feedback including per-word accuracy scores.

## Notes
- `evaluate-pro` uses OpenAI Whisper API with `response_format="verbose_json"` for word-level data
- The pronunciation utility (`app/utils/pronunciation.py`) processes word-level timing and accuracy
- Web SpeechRecognition is used on the frontend as a fallback for browsers that support it
