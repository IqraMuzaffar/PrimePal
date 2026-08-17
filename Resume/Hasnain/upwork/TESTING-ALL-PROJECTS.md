# Testing Guide — All Hasnain Portfolio Projects

## Quick Test Commands

```bash
# Run ALL projects tests at once
cd Resume/Hasnain/upwork

# CareBot (36 tests)
cd carebot/backend && python -m pytest tests/ -v && cd ../..

# DocMind RAG (41 tests)
cd docmind-rag/backend && python -m pytest tests/ -v && cd ../..

# AgentFlow (25 tests)
cd agentflow/backend && python -m pytest tests/ -v && cd ../..

# LeadFlow AI (17 tests)
cd leadflow-ai/backend && python -m pytest tests/ -v && cd ../..

# RagBase (11 tests)
cd ragbase/backend && python -m pytest tests/ -v && cd ../..

# n8n AI Workflows (10 tests)
cd n8n-ai-workflows/backend && python -m pytest tests/ -v && cd ../..

# WhatsBot Pro (3 tests)
cd whatsbot-pro/backend && python -m pytest tests/ -v && cd ../..

# TriageBot (8 tests)
cd triagebot/backend && python -m pytest tests/ -v && cd ../..

# FinancePal (MCP server — TypeScript)
cd financepal/mcp-server && npm test && cd ../..
```

## Test Summary Per Project

### 1. CareBot — 36 tests
**File:** `carebot/backend/tests/test_carebot.py`

| Test Class | Count | What It Tests |
|---|---|---|
| TestEmergencyDetection | 6 | `detect_emergency()` — chest pain, breathing, suicidal, normal, empty, case |
| TestDepartmentSuggestion | 5 | `suggest_department()` — cardiology, dermatology, pediatrics, general, unknown |
| TestEmergencyResponse | 2 | `EMERGENCY_RESPONSE` constant — keys, emergency number |
| TestSettings | 2 | Settings defaults, JWT secret |
| TestSystemPrompt | 4 | Guardrails — no diagnosis, no prescriptions, emergency number, disclaimer |
| TestToolDefinitions | 4 | 16 tools defined, 16 handlers, names match, input schemas exist |
| TestPrepareToolInput | 5 | Parameter mapping — patient_id, clinic_id, date, query |
| TestToolFunctionSignatures | 3 | triage/booking params, all handlers async |
| TestSchemas | 5 | Pydantic models — ChatMessage, PatientLogin, TokenResponse, LabResult, Doctor |

### 2. DocMind RAG — 41 tests
**File:** `docmind-rag/backend/tests/test_docmind.py`

| Test Class | Count | What It Tests |
|---|---|---|
| TestTokenCount | 3 | Whitespace token counting — normal, empty, punctuation |
| TestSplitBySections | 4 | Markdown heading splits, double-newline splits, empty, single section |
| TestSplitSentences | 3 | Sentence boundary detection — period, question, exclamation |
| TestRecursiveSplit | 4 | Chunk size enforcement, single sentence passthrough, recursive splits |
| TestAddOverlap | 4 | Overlap prepending, no overlap, single chunk, overlap count |
| TestChunkText | 4 | Full pipeline — basic pages, empty, custom sizes |
| TestRRFScore | 4 | RRF formula, K constant, dedup, combined scoring |
| TestSettings | 3 | Config defaults — chunk size, overlap, retrieval top_k |
| TestDocMindSchemas | 3 | DocumentResponse, RetrievalMetadata, ConversationMessage |
| TestBM25Tokenizer | 3 | Lowercase, empty, word preservation |
| TestTextExtractor | 4 | TXT extraction, empty file, unsupported extension, extensions list |
| TestRetrievalHelpers | 3 | format_context, build_sources, missing metadata handling |

### 3. AgentFlow — 25 tests
**File:** `agentflow/backend/tests/test_agentflow.py`

| Test Class | Count | What It Tests |
|---|---|---|
| TestConfigDefaults | 5 | LLM provider, model, Slack/email disabled, port |
| TestSchemas | 5 | TaskCreate defaults, ApprovalDecision valid/invalid, TokenResponse |
| TestOrchestratorRouting | 8 | Task-type-to-agent mapping, specialist branching logic |
| TestJWTAuth | 4 | Create/verify round-trip, jti, expired, invalid |
| TestLLMFactory | 3 | Unknown/openai/anthropic provider validation |

### 4. LeadFlow AI — 17 tests
**File:** `leadflow-ai/backend/tests/test_leadflow.py`

| Test Class | Count | What It Tests |
|---|---|---|
| TestConfigDefaults | 2 | Airtable table name, database URL |
| TestModels | 8 | LeadIngest, QualificationResult score/category, PipelineFunnel, Stats, Process, LeadDetail |
| TestQualificationPrompt | 4 | Lead name in prompt, scoring guide, enrichment with/without data |
| TestEmailPrompt | 2 | Lead+qualification in prompt, empty buying signals |
| TestEmailSchema | 1 | EmailGenerationResult structure |

### 5. RagBase — 11 tests
**File:** `ragbase/backend/tests/test_ragbase.py`

| Test Class | Count | What It Tests |
|---|---|---|
| TestSettings | 1 | Config defaults |
| TestSchemas | 4 | UserRegister validation, ApiKeyCreate, WidgetConfigUpdate |
| TestChunking | 3 | Empty input, single sentence, size limit |
| TestJWT | 2 | Round-trip, expired rejection |
| TestAPIKeyHashing | 1 | SHA-256 hashing |

### 6. n8n AI Workflows — 10 tests
**File:** `n8n-ai-workflows/backend/tests/test_n8n.py`

| Test Class | Count | What It Tests |
|---|---|---|
| TestSettings | 1 | Config defaults |
| TestEmailRequest | 2 | Valid request, missing field |
| TestLeadRequest | 2 | Minimal defaults, full request |
| TestResponseSchemas | 3 | EmailResponse, InvoiceResponse, LeadResponse (hot/cold) |
| TestInvoiceApproval | 2 | Threshold logic (>5000), string parsing |

### 7. WhatsBot Pro — 3 tests
**File:** `whatsbot-pro/backend/tests/` (3 test files)
- `test_queue.py` — Redis queue operations
- `test_session.py` — Session state management
- `test_twilio_client.py` — Twilio client initialization

### 8. TriageBot — 8 tests
**File:** `triagebot/backend/tests/` (4 test files)

| File | Count | What It Tests |
|---|---|---|
| test_tools.py | 3 | Emergency keywords, severity map |
| test_triage_engine.py | 3 | System prompt guardrails, tool definitions, max turns |
| test_session.py | 1 | Session state structure |
| test_db.py | 1 | Pydantic schema imports |

### 9. FinancePal — TypeScript (MCP Server)
**File:** `financepal/scripts/test-all.sh` — 22 endpoint assertions
- Revenue, expenses, P&L, cash flow, invoices, overdue, vendors, balances
- Anomaly detection, custom query, schema discovery
- SQL injection protection (5 attack vectors blocked)

## Total Test Count

| Project | Tests | Status |
|---|---|---|
| CareBot | 36 | ALL PASS |
| DocMind RAG | 41 | ALL PASS |
| AgentFlow | 25 | ALL PASS |
| LeadFlow AI | 17 | ALL PASS |
| RagBase | 11 | ALL PASS |
| n8n AI Workflows | 10 | ALL PASS |
| TriageBot | 8 | ALL PASS |
| WhatsBot Pro | 3 | ALL PASS |
| FinancePal | 22 | ALL PASS (bash script) |
| **TOTAL** | **173** | **ALL PASS** |

## Running All Tests (One Command)

```bash
#!/bin/bash
# Save as: run_all_tests.sh
cd "$(dirname "$0")"

TOTAL=0
FAILED=0

for proj in carebot docmind-rag agentflow leadflow-ai ragbase n8n-ai-workflows whatsbot-pro triagebot; do
  echo "========== $proj =========="
  cd "$proj/backend"
  python -m pytest tests/ -v
  if [ $? -ne 0 ]; then
    FAILED=$((FAILED + 1))
  fi
  TOTAL=$((TOTAL + 1))
  cd ../..
done

echo ""
echo "========== RESULTS =========="
echo "Projects tested: $TOTAL"
echo "Projects failed: $FAILED"
```

## Test Design Notes

- All tests are **unit tests** — no database, no API keys, no network calls required
- Tests cover: config/settings, Pydantic schemas, pure logic functions, constants, safety guardrails
- Integration tests (requiring running services) can be added later per-project
- Each project's tests run independently with just `pytest` installed
