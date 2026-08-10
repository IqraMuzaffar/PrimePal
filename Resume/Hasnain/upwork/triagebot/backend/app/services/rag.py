import chromadb
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from app.config import settings

RRF_K = 60
collection = None
bm25_index = None
bm25_corpus = []
bm25_ids = []
embedder = None

async def init_rag():
    global collection, bm25_index, bm25_corpus, bm25_ids, embedder
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    collection = chroma_client.get_or_create_collection(
        name="clinical_guidelines",
        metadata={"hnsw:space": "cosine"},
    )
    all_docs = collection.get()
    if all_docs and all_docs["documents"]:
        bm25_corpus = [doc.lower().split() for doc in all_docs["documents"]]
        bm25_ids = all_docs["ids"]
        bm25_index = BM25Okapi(bm25_corpus)

async def ingest_document(text: str, metadata: dict, chunk_size: int = 500):
    global bm25_index, bm25_corpus, bm25_ids
    chunks = []
    words = text.split()
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        if len(chunk.strip()) > 50:
            chunks.append(chunk)
    if not chunks:
        return
    ids = [f"{metadata.get('source', 'doc')}_{i}" for i in range(len(chunks))]
    embeddings = embedder.encode(chunks).tolist()
    metadatas = [{**metadata, "chunk_index": i} for i in range(len(chunks))]
    collection.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metadatas)
    for chunk_id, chunk in zip(ids, chunks):
        bm25_corpus.append(chunk.lower().split())
        bm25_ids.append(chunk_id)
    bm25_index = BM25Okapi(bm25_corpus) if bm25_corpus else None

async def search_guidelines(query: str, top_k: int = 5) -> dict:
    if collection is None or collection.count() == 0:
        return {"results": [], "message": "No clinical guidelines loaded yet."}
    query_embedding = embedder.encode([query]).tolist()
    vector_results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k * 2, collection.count()),
    )
    bm25_results = []
    if bm25_index is not None:
        tokenized_query = query.lower().split()
        bm25_scores = bm25_index.get_scores(tokenized_query)
        top_bm25 = sorted(range(len(bm25_scores)),
                          key=lambda i: bm25_scores[i], reverse=True)[:top_k * 2]
        bm25_results = [(bm25_ids[i], bm25_scores[i]) for i in top_bm25 if bm25_scores[i] > 0]
    rrf_scores = {}
    doc_map = {}
    if vector_results and vector_results["ids"] and vector_results["ids"][0]:
        for rank, (doc_id, doc, meta) in enumerate(zip(
            vector_results["ids"][0], vector_results["documents"][0], vector_results["metadatas"][0],
        )):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (RRF_K + rank + 1)
            doc_map[doc_id] = {"text": doc, "metadata": meta}
    for rank, (doc_id, _) in enumerate(bm25_results):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + 1.0 / (RRF_K + rank + 1)
        if doc_id not in doc_map:
            idx = bm25_ids.index(doc_id)
            doc_map[doc_id] = {"text": " ".join(bm25_corpus[idx]), "metadata": {"source": "bm25"}}
    sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)[:top_k]
    results = []
    for doc_id in sorted_ids:
        entry = doc_map.get(doc_id, {})
        results.append({
            "chunk_id": doc_id, "text": entry.get("text", ""),
            "source": entry.get("metadata", {}).get("source", "unknown"),
            "score": rrf_scores[doc_id],
        })
    return {"results": results}
