# Spelling Bee Endpoints

**Module:** `backend/app/api/v1/endpoints/spelling_bee.py`
**Prefix:** `/api/v1/spelling-bee`
**Auth:** Student (custom PyJWT)

## Endpoints

### GET `/spelling-bee/words`
Generate grade-appropriate spelling words using LLM + curriculum context.

### POST `/spelling-bee/evaluate`
Evaluate typed spelling against the correct word.
**Body:** `{ word_id, typed_answer }`
Awards points based on accuracy.

## Features
- TTS audio playback on the frontend for word pronunciation
- Accuracy scoring considers near-misses and common phonetic errors
