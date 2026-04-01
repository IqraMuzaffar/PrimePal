"""
Agent A - Curriculum Guardrail: Vector Storage & Curricular Tagging (Feature 4)
Embeds SNC chunks and stores in Qdrant with grade/week/topic metadata.
"""


async def embed_and_store(chunks: list[str], metadata: list[dict]) -> None:
    # TODO: embed chunks via OpenAI, upsert into Qdrant with curricular tags
    raise NotImplementedError


async def query_curriculum(grade: int, week: int, topic: str | None, top_k: int = 5) -> list[dict]:
    # TODO: vector search in Qdrant filtered by grade/week metadata
    raise NotImplementedError
