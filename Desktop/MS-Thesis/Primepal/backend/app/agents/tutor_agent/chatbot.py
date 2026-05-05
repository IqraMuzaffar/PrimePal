"""
Agent B — Guardrailed Tutor: Retrieval-Augmented Chat (Feature 5 + Feature 7)

Pipeline per request:
  1. Translate the student's message to English (gpt-4o-mini) — Feature 7.
  2. Embed the translated query with OpenAI text-embedding-3-small.
  3. Query snc_knowledge_base via the match_snc_documents RPC, filtered by
     the student's classroom grade_level — chunks from other grades are never
     considered.
  4. Pass the retrieved SNC context + both the original and translated messages
     to the chat model with an adaptive system prompt.
  5. Return a single reply that adapts its language to match the student's input:
     - Student writes in English → pure English reply
     - Student writes in Roman Urdu / Minglish → bilingual Minglish reply

The grade_level filter is the hard guardrail: it is resolved from the
student's JWT (classroom_id → classrooms.grade_level) in the endpoint
before this module is called, and is injected into every vector query.
"""
from typing import AsyncGenerator

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from app.core.config import settings


# ---------------------------------------------------------------------------
# Pydantic schema for structured output
# ---------------------------------------------------------------------------
class TutorResponse(BaseModel):
    reply: str  # Adaptive reply (bilingual or English depending on student input)


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
# Prompt — Urdu script translation (gpt-4o-mini, cheap + fast)
# ---------------------------------------------------------------------------
_URDU_TRANSLATE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a translator. Convert the following English/Minglish educational text "
     "into simple Urdu script (نستعلیق). Keep it age-appropriate for primary school children.\n"
     "Rules:\n"
     "1. Translate the full message into Urdu script.\n"
     "2. Keep English vocabulary terms in English but add Urdu definition in parentheses.\n"
     "3. Preserve any emoji.\n"
     "4. Return ONLY the Urdu translation. No explanation."),
    ("user", "{text}"),
])


# ---------------------------------------------------------------------------
# Prompt — adaptive tutor (auto-detects student language)
# ---------------------------------------------------------------------------
_TUTOR_SYSTEM_PROMPT = """\
You are PrimePal, a warm AI English tutor for Pakistani primary school students (Grade {grade_level}).

The student's ORIGINAL message: {original_message}
The student's message in ENGLISH: {translated_message}

LANGUAGE ADAPTATION:
- If the student wrote in Roman Urdu or Minglish, reply in friendly Minglish \
(mix of simple English + Roman Urdu). When you introduce an English grammar/vocabulary \
term, define it briefly in Roman Urdu.
  Example: "🌟 **Noun** — aisa lafz jo naam batata hai — is a naming word, like **cat** or **book**!"
- If the student wrote in English, reply in pure, simple English only.

FORMATTING RULES:
- Use **bold** for new vocabulary or grammar terms.
- Use a fun emoji at the start of your reply (🌟, 🎉, 📚, 🐱, etc.).
- If listing examples, use a short bulleted list with emoji bullets.
- Keep it short: 2–4 sentences max. Be warm, cheerful, and encouraging.

CONTENT RULES:
1. Only use Grade {grade_level} vocabulary.
2. Base your answer ONLY on the SNC curriculum context below.

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context}
"""

_TUTOR_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _TUTOR_SYSTEM_PROMPT),
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
    embeddings_model = OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        openai_api_key=settings.OPENAI_API_KEY,
    )
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
def _build_context(context_chunks: list[str], grade_level: int) -> str:
    if context_chunks:
        return "\n\n---\n\n".join(context_chunks)
    return (
        "No curriculum content has been loaded for this grade yet. "
        f"Rely only on basic Grade {grade_level} English knowledge."
    )


async def get_guardrailed_response(
    original_message: str,
    translated_message: str,
    grade_level: int,
    context_chunks: list[str],
) -> TutorResponse:
    """
    Send the student's original + translated message and retrieved SNC context
    to the LLM and return a TutorResponse with an adaptive reply.
    """
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.3,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,
    ).with_structured_output(TutorResponse)

    chain = _TUTOR_PROMPT | llm
    result = await chain.ainvoke(
        {
            "grade_level": grade_level,
            "original_message": original_message,
            "translated_message": translated_message,
            "context": _build_context(context_chunks, grade_level),
        }
    )
    return result


async def stream_guardrailed_response(
    original_message: str,
    translated_message: str,
    context_chunks: list[str],
    grade_level: int,
) -> AsyncGenerator[str, None]:
    """Stream adaptive tutor response token by token."""
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.3,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,
        streaming=True,
    )

    chain = _TUTOR_PROMPT | llm

    async for chunk in chain.astream({
        "grade_level": grade_level,
        "original_message": original_message,
        "translated_message": translated_message,
        "context": _build_context(context_chunks, grade_level),
    }):
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content


# ---------------------------------------------------------------------------
# Urdu script translation
# ---------------------------------------------------------------------------
async def translate_to_urdu(text: str) -> str:
    """Translate a tutor reply into Urdu script using gpt-4o-mini."""
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,
    )
    chain = _URDU_TRANSLATE_PROMPT | llm
    result = await chain.ainvoke({"text": text})
    return result.content.strip()
