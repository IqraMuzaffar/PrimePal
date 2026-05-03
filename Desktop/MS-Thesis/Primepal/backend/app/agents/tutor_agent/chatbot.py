"""
Agent B — Guardrailed Tutor: Retrieval-Augmented Chat (Feature 5 + Feature 7)

Pipeline per request:
  1. Translate the student's message to English (gpt-4o-mini) — Feature 7.
  2. Embed the translated query with all-MiniLM-L6-v2 (local, free).
  3. Query snc_knowledge_base via the match_snc_documents RPC, filtered by
     the student's classroom grade_level — chunks from other grades are never
     considered.
  4. Pass the retrieved SNC context + both the original and translated messages
     to gpt-4o with a bilingual system prompt (Feature 7).
  5. Return a TutorResponse with bilingual_reply and english_reply.

The grade_level filter is the hard guardrail: it is resolved from the
student's JWT (classroom_id → classrooms.grade_level) in the endpoint
before this module is called, and is injected into every vector query.
"""
import os
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

from typing import AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.core.config import settings


# ---------------------------------------------------------------------------
# Pydantic schema for structured bilingual output
# ---------------------------------------------------------------------------
class TutorResponse(BaseModel):
    bilingual_reply: str  # Minglish code-switching response (shown by default)
    english_reply: str    # Pure English version (shown when toggle is pressed)


# ---------------------------------------------------------------------------
# Prompt — translation assistant (gpt-4o-mini, cheap + fast)
# ---------------------------------------------------------------------------
_TRANSLATE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a translation assistant. Your only job is to convert the user's message "
     "into standard English for an educational search query.\n"
     "Rules:\n"
     "1. If the message is already in English, return it EXACTLY unchanged.\n"
     "2. If the message contains Roman Urdu or Minglish (e.g. 'Noun kya hota hai?'), "
     "translate it to simple English (e.g. 'What is a noun?').\n"
     "3. Return ONLY the translated/original English text. No explanation. No quotes."),
    ("user", "{query}"),
])


# ---------------------------------------------------------------------------
# Prompt — bilingual tutor (gpt-4o, structured output)
# ---------------------------------------------------------------------------
_BILINGUAL_SYSTEM_PROMPT = """\
You are PrimePal, a warm AI English tutor for Pakistani primary school students (Grade {grade_level}).

The student's ORIGINAL message (may be Roman Urdu or Minglish): {original_message}
The student's message in ENGLISH: {translated_message}

RULES FOR bilingual_reply:
1. Respond in friendly Minglish (mix of simple English + Roman Urdu).
2. When you introduce an English grammar/vocabulary term, define it briefly in Roman Urdu.
   Example: "Noun — aisa lafz jo naam batata hai — is a naming word, like 'cat' or 'book'!"
3. Only use Grade {grade_level} vocabulary.
4. Keep it short: 2–3 sentences. Be warm and encouraging.
5. Base your answer ONLY on the SNC curriculum context below.

RULES FOR english_reply:
1. Write the SAME answer in pure, simple English only (no Roman Urdu, no Minglish).
2. Same content, same Grade {grade_level} vocabulary, same length.
3. This is shown when the student toggles to "English mode".

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context}
"""

_BILINGUAL_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _BILINGUAL_SYSTEM_PROMPT),
        ("user", "{translated_message}"),
    ]
)


# ---------------------------------------------------------------------------
# Translation
# ---------------------------------------------------------------------------
async def translate_to_english(query: str) -> str:
    """
    Translate Roman Urdu / Minglish to standard English using gpt-4o-mini.
    If the query is already in English it is returned unchanged.
    """
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,  # auto-retry on rate limit (429) errors
    )
    chain = _TRANSLATE_PROMPT | llm
    result = await chain.ainvoke({"query": query})
    return result.content.strip()


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------
async def retrieve_grade_filtered_chunks(
    query: str,
    grade_level: int,
    supabase_admin_client,
    match_count: int = 5,
) -> list[str]:
    """
    Embed *query* and return the top *match_count* SNC content chunks whose
    metadata.grade_level matches *grade_level*.

    Uses the match_snc_documents Postgres RPC (migration 005) which applies
    the grade filter BEFORE vector math — other grades are never scanned.

    Returns an empty list (not an exception) when no curriculum data has
    been ingested yet for this grade.
    """
    embeddings_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
    query_vector = await embeddings_model.aembed_query(query)

    response = supabase_admin_client.rpc(
        "match_snc_documents",
        {
            "query_embedding": query_vector,
            "grade_level_filter": grade_level,
            "match_count": match_count,
        },
    ).execute()

    return [row["content"] for row in (response.data or [])]


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------
async def get_guardrailed_response(
    original_message: str,
    translated_message: str,
    grade_level: int,
    context_chunks: list[str],
) -> TutorResponse:
    """
    Send the student's original + translated message and retrieved SNC context
    to the LLM and return a TutorResponse with bilingual_reply and english_reply.

    Args:
        original_message:   The student's raw input text (may be Roman Urdu/Minglish).
        translated_message: English translation of the student's message (used for
                            context retrieval and prompt grounding).
        grade_level:        Used in the system prompt to enforce vocabulary limits.
        context_chunks:     SNC passages retrieved by retrieve_grade_filtered_chunks.
                            An empty list is valid — the prompt handles it gracefully.
    """
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.3,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,  # auto-retry on rate limit (429) errors
    ).with_structured_output(TutorResponse)

    if context_chunks:
        context = "\n\n---\n\n".join(context_chunks)
    else:
        context = (
            "No curriculum content has been loaded for this grade yet. "
            f"Rely only on basic Grade {grade_level} English knowledge."
        )

    chain = _BILINGUAL_PROMPT | llm
    result = await chain.ainvoke(
        {
            "grade_level": grade_level,
            "original_message": original_message,
            "translated_message": translated_message,
            "context": context,
        }
    )
    return result


async def stream_guardrailed_response(
    query: str,
    context_chunks: list[str],
    grade_level: int,
) -> AsyncGenerator[str, None]:
    """Stream bilingual tutor response token by token.

    Uses the translated query as both original_message and translated_message
    since the caller has already translated the student's input.
    """
    if context_chunks:
        context_text = "\n\n---\n\n".join(context_chunks)
    else:
        context_text = (
            "No curriculum content has been loaded for this grade yet. "
            f"Rely only on basic Grade {grade_level} English knowledge."
        )

    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.3,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,
        streaming=True,
    )

    chain = _BILINGUAL_PROMPT | llm

    async for chunk in chain.astream({
        "grade_level": grade_level,
        "original_message": query,
        "translated_message": query,
        "context": context_text,
    }):
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content
