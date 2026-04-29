# Backend Agents

The three AI agents that power PrimePal's intelligence layer.

## Agent Modules

| Agent | Directory | Description |
|-------|-----------|-------------|
| Agent A — Curriculum | `agents/curriculum_agent/` | SNC document ingestion + vector embedding |
| Agent B — Tutor | `agents/tutor_agent/` | Mission generation + bilingual chatbot |
| Agent C — Evaluator | `agents/evaluator_agent/` | Interaction logging + NLP evaluation |

For detailed architecture, see [Architecture > Agent System](../../architecture/agent-system.md).

## Agent A — Curriculum Agent

| File | Purpose |
|------|---------|
| `ingestion.py` | `clean_snc_text()` strips noise, `chunk_documents()` splits into 1000-char chunks with metadata |
| `embedder.py` | `embed_and_store_chunks()` calls OpenAI embeddings API, stores in pgvector |

## Agent B — Tutor Agent

| File | Purpose |
|------|---------|
| `mission_generator.py` | Generates daily/pillar missions using RAG context + LLM |
| `chatbot.py` | Bilingual conversational AI with code-switching + Socratic scaffolding |

## Agent C — Evaluator Agent

| File | Purpose |
|------|---------|
| `interaction_logger.py` | Writes interaction records to `student_interactions` table |
| `nlp_evaluator.py` | Parses interaction logs, evaluates performance across four pillars |
