"""
Agent A - Curriculum Guardrail: SNC Document Ingestion (Feature 3)
Parses SNC PDF textbooks, cleans, chunks, and prepares text for embedding.
"""


def load_pdf(file_path: str) -> str:
    # TODO: use pypdf to extract text from SNC PDF
    raise NotImplementedError


def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    # TODO: split text into overlapping chunks for embedding
    raise NotImplementedError
