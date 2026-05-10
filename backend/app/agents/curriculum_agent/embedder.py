"""
Agent A - Curriculum Guardrail: Vector Storage & Curricular Tagging (Feature 4)

Embeds SNC text chunks using OpenAI text-embedding-3-small (1536 dims)
and stores them in Supabase pgvector (snc_knowledge_base table).

Each chunk is a dict:
    {"content": str, "metadata": {"grade_level": int, "book_title": str, "chunk_id": str}}
This is exactly the format returned by chunk_documents() in ingestion.py.
"""
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings


def _get_embeddings_model() -> OpenAIEmbeddings:
    """Return an OpenAIEmbeddings instance (text-embedding-3-small, 1536 dims)."""
    return OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        openai_api_key=settings.OPENAI_API_KEY,
    )


async def embed_and_store_chunks(chunks: list[dict], supabase_admin_client) -> int:
    """
    Generate vector embeddings for a list of text chunks and bulk-insert them
    into the snc_knowledge_base Supabase pgvector table.

    Args:
        chunks: List of {"content": str, "metadata": dict} dicts.
                This is the direct output of chunk_documents() from ingestion.py.
        supabase_admin_client: Supabase client initialised with the service_role key,
                               so it bypasses RLS for trusted server-side inserts.

    Returns:
        Number of records successfully inserted.

    Raises:
        Exception: Re-raises any OpenAI or Supabase error so the caller
                   (the upload endpoint) can return a meaningful HTTP 500.
    """
    if not chunks:
        return 0

    embeddings_model = _get_embeddings_model()
    texts = [chunk["content"] for chunk in chunks]

    # aembed_documents batches requests internally to respect OpenAI rate limits
    vectors = await embeddings_model.aembed_documents(texts)

    records = [
        {
            "content": chunk["content"],
            "metadata": chunk["metadata"],
            "embedding": vectors[i],
        }
        for i, chunk in enumerate(chunks)
    ]

    supabase_admin_client.table("snc_knowledge_base").insert(records).execute()
    return len(records)
