# Backend Agents

The three AI agents that power PrimePal's intelligence layer. All agents use LangChain with OpenAI models and structured output via Pydantic.

## Agent Modules

| Agent | Directory | Files | Description |
|-------|-----------|-------|-------------|
| Agent A -- Curriculum | `agents/curriculum_agent/` | `ingestion.py`, `embedder.py` | SNC document ingestion, text cleaning, chunking, vector embedding |
| Agent B -- Tutor | `agents/tutor_agent/` | `chatbot.py`, `mission_generator.py` | Bilingual RAG chatbot + daily/pillar mission generation |
| Agent C -- Evaluator | `agents/evaluator_agent/` | `interaction_logger.py`, `nlp_evaluator.py` | Interaction logging + NLP insight report generation |

For high-level architecture, see [Architecture > Agent System](../../architecture/agent-system.md).

---

## Agent A -- Curriculum Agent

Responsible for ingesting SNC (Single National Curriculum) PDF textbooks, cleaning the text, splitting into chunks, and embedding them into Supabase pgvector.

### `ingestion.py` -- Text Extraction and Chunking

**Constants:**
| Name | Value | Description |
|------|-------|-------------|
| `CHUNK_SIZE` | `1000` | Maximum characters per chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between consecutive chunks |
| `MIN_CHUNK_LENGTH` | `50` | Chunks shorter than this are discarded |

#### `clean_snc_text(text: str) -> str`

Removes standard SNC textbook noise from extracted PDF text:
- Strips isolated page numbers (lines containing only digits/whitespace)
- Removes recurring "Single National Curriculum" header/footer text (case-insensitive)
- Collapses runs of 3+ blank lines to 2

#### `chunk_documents(documents: list, grade_level: int, book_title: str) -> list[dict[str, Any]]`

Splits a list of LangChain `Document` objects into overlapping chunks with curricular metadata.

**Uses:** `RecursiveCharacterTextSplitter` with separators `["\n\n", "\n", ".", " ", ""]`

**Returns:** List of dicts:
```python
{
    "content": str,           # Cleaned chunk text
    "metadata": {
        **original_metadata,  # From LangChain Document
        "grade_level": int,   # Injected
        "book_title": str,    # Injected
        "chunk_id": str,      # e.g. "SNC Grade 3_chunk_0"
    }
}
```

Chunks shorter than `MIN_CHUNK_LENGTH` (50 chars) after cleaning are discarded.

### `embedder.py` -- Vector Storage

#### `_get_embeddings_model() -> OpenAIEmbeddings`

Returns an `OpenAIEmbeddings` instance using `settings.EMBEDDING_MODEL` (default: `text-embedding-3-small`, 1536 dimensions, via OpenAI API).

#### `embed_and_store_chunks(chunks: list[dict], supabase_admin_client) -> int`

Generates vector embeddings for text chunks and bulk-inserts them into the `snc_knowledge_base` table.

**Parameters:**
- `chunks` -- Direct output of `chunk_documents()` (list of `{"content", "metadata"}` dicts)
- `supabase_admin_client` -- Service-role Supabase client (bypasses RLS)

**Flow:**
1. Extract text from each chunk
2. Call `aembed_documents(texts)` to batch-embed all texts
3. Build records with `content`, `metadata`, and `embedding` fields
4. Insert all records into `snc_knowledge_base` table

**Returns:** Number of records inserted. Returns `0` for empty input without calling the embeddings API.

---

## Agent B -- Tutor Agent

Handles the bilingual chatbot (RAG) and mission generation (daily + pillar-based).

### `chatbot.py` -- Guardrailed Adaptive AI Chatbot

Full pipeline per request:
1. **Translate** student's message to English (gpt-4o-mini) -- handles Roman Urdu/Minglish
2. **Embed** the translated query with OpenAI text-embedding-3-small (1536-dim, API-based)
3. **Retrieve** SNC chunks via `match_snc_documents` RPC, filtered by grade level
4. **Generate** adaptive response via `settings.CHAT_MODEL` (gpt-4o-mini by default) with structured output

#### Pydantic Schema: `TutorResponse`

```python
class TutorResponse(BaseModel):
    reply: str  # Adaptive reply (bilingual or English depending on student input)
```

The reply language adapts to the student's input:
- Student writes in English → pure English reply
- Student writes in Roman Urdu / Minglish → bilingual Minglish reply

Response formatting: **bold** vocabulary terms, emoji starters, bulleted example lists, 2-4 sentences.

#### `translate_to_english(query: str) -> str`

Translates Roman Urdu / Minglish to standard English using gpt-4o-mini.

**LLM:** `gpt-4o-mini`, temperature=0, max_retries=3

**Prompt rules:**
- If already English, return unchanged
- If Roman Urdu or Minglish, translate to simple English
- Return only the translated text, no explanation

#### `retrieve_grade_filtered_chunks(query: str, grade_level: int, supabase_admin_client, match_count: int = 5) -> list[str]`

Embeds the query using OpenAI `text-embedding-3-small` and retrieves the top matching SNC chunks filtered by grade level.

**Uses:** `match_snc_documents` Postgres RPC (migration 005) which applies the grade filter BEFORE vector math -- other grades are never scanned.

**Returns:** List of content strings. Empty list if no data ingested for this grade (no exception).

#### `get_guardrailed_response(original_message: str, translated_message: str, grade_level: int, context_chunks: list[str]) -> TutorResponse`

Sends the student's original + translated message and retrieved SNC context to the LLM.

**LLM:** `settings.CHAT_MODEL` (gpt-4o-mini), temperature=0.3, max_retries=3, structured output via `TutorResponse`

**System prompt key rules:**
- Language adapts to student input (Minglish if they wrote in Urdu, English if they wrote in English)
- **Bold** vocabulary terms, emoji starters, short bulleted lists
- Grade-appropriate vocabulary, 2-4 sentences
- Grounded ONLY in the SNC curriculum context provided
- Handles empty context gracefully with fallback text

#### `stream_guardrailed_response(original_message: str, translated_message: str, context_chunks: list[str], grade_level: int) -> AsyncGenerator[str, None]`

Streaming version of the tutor response. Yields tokens as they arrive from the LLM. Receives both original and translated messages for proper language detection.

**LLM:** Same model, temperature=0.3, `streaming=True`

#### `translate_to_urdu(text: str) -> str`

Translates a tutor reply into Urdu script (نستعلیق) on demand using gpt-4o-mini. Keeps English vocabulary terms with Urdu definitions in parentheses. Preserves emoji.

**LLM:** `gpt-4o-mini`, temperature=0, max_retries=3

### `mission_generator.py` -- Gamified Mission Generation

Generates daily and pillar-based English questions grounded in SNC context.

#### Constants

| Name | Value |
|------|-------|
| `MAX_WEAKNESS_ITEMS` | `5` |
| `PILLAR_QUESTIONS_COUNT` | `10` |
| `MULTIPLE_CHOICE_OPTIONS` | `4` |
| `DAILY_QUESTIONS_COUNT` | `3` |

#### Pydantic Schemas

**`QuestionOption`:**
```python
class QuestionOption(BaseModel):
    id: str          # "a", "b", "c", "d"
    text: str
    emoji: str | None = None
```

**`MissionQuestion`:**
```python
class MissionQuestion(BaseModel):
    id: int
    task_type: str                      # e.g. "sentence_picture_match"
    pillar: str = ""                    # reading, writing, listening, speaking
    question: str
    difficulty: str = "medium"          # easy, medium, hard
    points_value: int = 10              # 5, 10, 15, or 20
    correct_answer: str
    emoji_hint: str = ""
    type: str | None = None             # Legacy compat
    options: list[QuestionOption] | None = None
    passage: str | None = None
    audio_text: str | None = None
    image_context: str | None = None
    image_options: list[QuestionOption] | None = None
    word_bank: list[str] | None = None
    correct_order: list[str] | None = None
    word_with_blanks: str | None = None
    letter_options: list[str] | None = None
    sentence_start: str | None = None
    urdu_hint: str = ""
```

**`DailyMissions`:**
```python
class DailyMissions(BaseModel):
    topic: str
    questions: list[MissionQuestion]
```

**`PillarMissions`:**
```python
class PillarMissions(BaseModel):
    questions: list[MissionQuestion]
```

#### `generate_daily_missions(grade_level: int, context_chunks: list[str], active_topics: list[str], is_frustrated: bool = False) -> DailyMissions`

Generates exactly 3 grade-appropriate questions grounded in SNC context.

**LLM:** `settings.CHAT_MODEL`, temperature=0.7, max_retries=3, timeout=10s, structured output via `DailyMissions`

**Question format:** Q1 = reading (sentence_picture_match or odd_one_out), Q2 = writing (fill_blank_word_bank or missing_letter), Q3 = listening (listen_and_choose or simon_says)

**Affective Filter:** If `is_frustrated=True`, reduces vocabulary complexity by 1-2 grade levels, makes correct answers obvious, adds extra encouragement. Designed to recover the student's affective state after 3+ consecutive incorrect answers.

**Timeouts:** 10s LLM timeout + 12s overall chain timeout via `asyncio.wait_for`.

#### `generate_pillar_missions(pillar: str, grade_level: int, active_topics: list[str], student_id: str, student_weaknesses: list[str], is_frustrated: bool = False, performance_profile: dict | None = None) -> list[dict]`

Generates exactly 10 questions for a specific pillar (reading/writing/listening/speaking).

**Valid pillars:** `["reading", "writing", "listening", "speaking"]` -- raises `ValueError` for others.

**Task types per pillar:**

| Pillar | Task Types (count) |
|--------|-------------------|
| Reading | sentence_picture_match (3), odd_one_out (3), fill_blank_word_bank (2), passage_true_false (2) |
| Writing | sentence_scramble (4), missing_letter (3), guided_translation (3) |
| Listening | listen_and_choose (4), simon_says (3), listen_and_spell (3) |
| Speaking | repeat_after_me (4), what_is_this (3), finish_the_sentence (3) |

**Difficulty distribution (default):** 3 easy (5 pts), 4 medium (10 pts), 3 hard (20 pts)

**Adaptive difficulty:** If a `performance_profile` is provided:
- `diff_rec == "easy"`: 4 easy, 4 medium, 2 hard
- `diff_rec == "hard"`: 1 easy, 4 medium, 5 hard
- Weak topics (accuracy < 40%) get easy questions with urdu_hint
- Strong topics (accuracy > 70%) get hard questions

**Confidence Builder mode:** If `is_frustrated=True`, 7/10 questions are easy with extra encouragement.

**LLM:** `settings.CHAT_MODEL`, temperature=0.7, max_retries=3, timeout=15s LLM / 60s overall chain

---

## Agent C -- Evaluator Agent

Handles interaction logging and NLP-based student insight reports.

### `interaction_logger.py` -- Background Interaction Logging

#### `log_interaction(*, student_id, classroom_id, grade_level, interaction_type, original_message=None, translated_message=None, correct=None, context_used=False, pillar=None, score=None) -> None`

Inserts one interaction record into the `student_interactions` table.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `student_id` | `str` | Student UUID |
| `classroom_id` | `str` | Classroom UUID |
| `grade_level` | `int` | Grade level |
| `interaction_type` | `str` | One of: `"chat"`, `"mission_mc"`, `"mission_fill"`, `"spelling_bee"` |
| `original_message` | `str \| None` | Student's raw input text |
| `translated_message` | `str \| None` | English translation |
| `correct` | `bool \| None` | `None` for chat interactions |
| `context_used` | `bool` | Whether SNC context was used |
| `pillar` | `str \| None` | `"reading"`, `"writing"`, `"listening"`, `"speaking"`, or `None` |
| `score` | `int \| None` | Points awarded for this interaction |

**Design:** Intentionally synchronous (not async) -- designed to run inside FastAPI `BackgroundTasks` (thread pool). Errors are caught and silently swallowed so logging failures never crash student-facing responses.

### `nlp_evaluator.py` -- NLP Insight Generator

#### Pydantic Schema: `StudentInsightReport`

```python
class StudentInsightReport(BaseModel):
    engagement_level: str           # "High" | "Medium" | "Low"
    mission_accuracy_pct: int       # 0-100
    total_interactions: int
    strengths: list[str]            # 2-3 bullet points
    areas_for_improvement: list[str]  # 2-3 bullet points
    recommended_topics: list[str]   # 2-3 SNC topic suggestions
    teacher_note: str               # 1-2 sentence summary for teacher
```

#### `evaluate_interactions(student_id: str, grade_level: int, supabase_admin_client, limit: int = 30) -> StudentInsightReport`

Fetches recent interactions, computes stats, and generates a structured NLP insight report.

**Pipeline:**
1. **Fetch:** Last 30 interactions from `student_interactions` table (ordered by `created_at DESC`)
2. **Compute locally:**
   - `total_interactions` -- count of all rows
   - `mission_count` -- rows where `interaction_type` in `("mission_mc", "mission_fill")`
   - `correct_count` -- mission rows where `correct is True`
   - `chat_count` -- rows where `interaction_type == "chat"`
   - `context_used_count` -- chat rows where `context_used is True`
   - `chat_samples` -- up to 10 most recent chat messages (original text)
3. **Generate:** Call LLM with structured output

**LLM:** `settings.CHAT_MODEL`, temperature=0.3, max_retries=3, structured output via `StudentInsightReport`

**System prompt rules:**
- `engagement_level`: High (>=10 interactions), Medium (4-9), Low (<4)
- `mission_accuracy_pct`: integer 0-100 from correct_count/mission_count
- Strengths and improvement areas must be specific and tied to Grade SNC curriculum
- Warm and constructive tone (primary school children ages 6-12)
