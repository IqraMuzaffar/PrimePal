# Chatbot Quality & Streaming Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve PrimePal chatbot with better prompts, conversation memory, and polished streaming UX.

**Architecture:** Three independent changes to the same 3 files: (1) rewrite the system prompt with personality + few-shot examples, (2) add frontend-managed conversation history passed through the API to the LangChain prompt, (3) fix the streaming UX with phase-aware indicators and error handling.

**Tech Stack:** Python/FastAPI (backend), LangChain + OpenAI (LLM), Next.js/React/TypeScript (frontend), existing test infrastructure (pytest + httpx).

---

### Task 1: Rewrite System Prompt for Quality

**Files:**
- Modify: `backend/app/agents/tutor_agent/chatbot.py:71-103`

- [ ] **Step 1: Replace `_TUTOR_SYSTEM_PROMPT` and `_TUTOR_PROMPT`**

Replace lines 71-103 in `chatbot.py` with:

```python
_TUTOR_SYSTEM_PROMPT = """\
You are PrimePal, a cheerful and patient AI English tutor for Pakistani primary \
school students (Grade {grade_level}). Think of yourself as a friendly older \
sibling who loves teaching English.

PERSONALITY:
- Celebrate effort, not just correctness ("Great try! Let's figure this out together!")
- Use Pakistani cultural references naturally (cricket, mangoes, chai, Eid, school life)
- Never be condescending — treat mistakes as learning opportunities
- End with a question or mini-challenge to keep the student engaged

The student's ORIGINAL message: {original_message}
The student's message in ENGLISH: {translated_message}

LANGUAGE ADAPTATION:
- If the student wrote in Roman Urdu or Minglish, reply in friendly Minglish \
(mix of simple English + Roman Urdu). When you introduce an English grammar/vocabulary \
term, define it briefly in Roman Urdu.
- If the student wrote in English, reply in pure, simple English only.

RESPONSE LENGTH:
- Simple factual question → 1-2 sentences + an example
- Explanation needed → 3-5 sentences with examples
- Student is confused ("I don't understand", "samajh nahi aaya") → break into \
numbered steps and end with a checking question. NEVER repeat the same explanation.

FORMATTING RULES:
- Use **bold** for new vocabulary or grammar terms.
- Start with a fun emoji (🌟, 🎉, 📚, 🐱, 🏏, etc.).
- If listing examples, use a short bulleted list with emoji bullets.

CONTENT RULES:
1. Only use Grade {grade_level} vocabulary and concepts.
2. Base your answer on the SNC curriculum context below. If no context is available, \
use basic Grade {grade_level} English knowledge.

EXAMPLES OF IDEAL RESPONSES:

Student (English, simple question): "What is a verb?"
PrimePal: "🌟 A **verb** is an action word — it tells us what someone DOES! Like \
**run**, **eat**, or **play**. Can you think of something you did today? That's a verb!"

Student (Minglish, confused): "Mujhe adjective samajh nahi aa raha"
PrimePal: "🎉 Koi baat nahi! **Adjective** ek aisa lafz hai jo kisi cheez ko \
describe karta hai — it tells us what something is LIKE. Jaise **big** cat, \
**red** ball, **happy** boy. Socho — tumhari favourite cheez kaisi hai? Woh word \
adjective hai!"

Student (follow-up, needs scaffolding): "I don't understand"
PrimePal: "📚 No worries! Let me break it down:\n\
1. First, think of a **naming word** (noun) — like 'ball'\n\
2. Now, what colour is the ball? Maybe **red**!\n\
3. 'Red' is the **adjective** — it describes the ball!\n\
Try it: what word describes YOUR school bag?"

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context}
"""

_TUTOR_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _TUTOR_SYSTEM_PROMPT),
        ("user", "{translated_message}"),
    ]
)
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

Run: `cd backend && python -m pytest tests/test_chat.py -v`
Expected: All existing tests PASS (the tests mock the LLM, so the prompt text doesn't affect them).

- [ ] **Step 3: Commit**

```bash
git add backend/app/agents/tutor_agent/chatbot.py
git commit -m "feat(chat): rewrite system prompt with personality, few-shot examples, and adaptive length"
```

---

### Task 2: Add Conversation History Support — Backend

**Files:**
- Modify: `backend/app/api/v1/endpoints/chat.py:1-50` (imports + schemas)
- Modify: `backend/app/api/v1/endpoints/chat.py:56-121` (chat endpoint)
- Modify: `backend/app/api/v1/endpoints/chat.py:123-190` (stream endpoint)
- Modify: `backend/app/agents/tutor_agent/chatbot.py:20-25` (imports)
- Modify: `backend/app/agents/tutor_agent/chatbot.py:96-103` (`_TUTOR_PROMPT`)
- Modify: `backend/app/agents/tutor_agent/chatbot.py:174-228` (generation functions)
- Test: `backend/tests/test_chat.py`

- [ ] **Step 1: Write tests for history support**

Add the following tests at the end of `backend/tests/test_chat.py`:

```python
# ── Conversation History Tests ───────────────────────────────────────────────

class TestConversationHistory:
    """Tests for conversation history support in chat endpoints."""

    pytestmark = pytest.mark.asyncio

    @pytest.fixture(autouse=True)
    def _override_student_auth(self):
        from app.core.security import get_current_student
        from app.main import app

        app.dependency_overrides[get_current_student] = lambda: MOCK_STUDENT_GRADE_3
        yield
        app.dependency_overrides.clear()

    async def test_history_passed_to_guardrailed_response(self, client: AsyncClient):
        """When history is provided, it must be forwarded to get_guardrailed_response."""
        llm_mock = AsyncMock(return_value=_make_tutor_response_mock())

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="Give me more examples"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=llm_mock,
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={
                    "message": "Give me more examples",
                    "history": [
                        {"role": "student", "content": "What is a noun?"},
                        {"role": "tutor", "content": "A noun is a naming word!"},
                    ],
                },
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        llm_mock.assert_called_once()
        _, kwargs = llm_mock.call_args
        assert "history" in kwargs
        assert len(kwargs["history"]) == 2

    async def test_empty_history_is_valid(self, client: AsyncClient):
        """Request with empty history array must work (backwards compatible)."""
        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="Hello"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock()),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Hello", "history": []},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200

    async def test_no_history_field_is_backwards_compatible(self, client: AsyncClient):
        """Request without history field must still work (old clients)."""
        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
            patch(
                "app.api.v1.endpoints.chat.translate_to_english",
                new=AsyncMock(return_value="Hello"),
            ),
            patch(
                "app.api.v1.endpoints.chat.retrieve_grade_filtered_chunks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.api.v1.endpoints.chat.get_guardrailed_response",
                new=AsyncMock(return_value=_make_tutor_response_mock()),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Hello"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200

    async def test_history_capped_at_10_messages(self, client: AsyncClient):
        """History with more than 10 items must be rejected (422)."""
        long_history = [
            {"role": "student" if i % 2 == 0 else "tutor", "content": f"msg {i}"}
            for i in range(12)
        ]

        with (
            patch(
                "app.api.v1.endpoints.chat.get_supabase_admin",
                return_value=_make_classroom_supabase_mock(grade_level=3),
            ),
        ):
            resp = await client.post(
                "/api/v1/chat",
                json={"message": "Hello", "history": long_history},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_chat.py::TestConversationHistory -v`
Expected: FAIL — `history` field doesn't exist on `ChatRequest` yet.

- [ ] **Step 3: Update `ChatRequest` schema in `chat.py`**

At the top of `backend/app/api/v1/endpoints/chat.py`, add the `ChatMessage` model and update `ChatRequest`:

```python
class ChatMessage(BaseModel):
    role: str = Field(..., pattern=r"^(student|tutor)$")
    content: str = Field(..., min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=10)
```

- [ ] **Step 4: Add `_convert_history` helper and update imports in `chat.py`**

Add this import at the top of `chat.py`:

```python
from langchain_core.messages import HumanMessage, AIMessage
```

Add this helper function after the schema definitions (before the first endpoint):

```python
def _convert_history(history: list[ChatMessage]) -> list[HumanMessage | AIMessage]:
    """Convert ChatMessage list to LangChain message objects."""
    messages = []
    for msg in history:
        if msg.role == "student":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))
    return messages
```

- [ ] **Step 5: Update the non-streaming `chat` endpoint to pass history**

In the `chat()` function, update the call to `get_guardrailed_response`:

```python
    tutor_response = await get_guardrailed_response(
        original_message=body.message,
        translated_message=translated_query,
        grade_level=grade_level,
        context_chunks=context_chunks,
        history=_convert_history(body.history),
    )
```

- [ ] **Step 6: Update the streaming `chat_stream` endpoint to pass history**

In the `chat_stream()` function, add history conversion before `event_stream()` and update the call to `stream_guardrailed_response`:

```python
    lc_history = _convert_history(body.history)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'status', 'content': 'Thinking...'})}\n\n"

        accumulated_response: list[str] = []
        async for token in stream_guardrailed_response(
            original_message=body.message,
            translated_message=translated_query,
            context_chunks=context_chunks,
            grade_level=grade_level,
            history=lc_history,
        ):
            # ... rest stays the same
```

- [ ] **Step 7: Update `chatbot.py` — imports, prompt template, and function signatures**

In `backend/app/agents/tutor_agent/chatbot.py`:

Add import:

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
```

Replace `_TUTOR_PROMPT` (the one after the system prompt string):

```python
_TUTOR_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _TUTOR_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="history", optional=True),
        ("user", "{translated_message}"),
    ]
)
```

Update `get_guardrailed_response` signature and invocation:

```python
async def get_guardrailed_response(
    original_message: str,
    translated_message: str,
    grade_level: int,
    context_chunks: list[str],
    history: list[HumanMessage | AIMessage] | None = None,
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
            "history": history or [],
        }
    )
    return result
```

Update `stream_guardrailed_response` signature and invocation:

```python
async def stream_guardrailed_response(
    original_message: str,
    translated_message: str,
    context_chunks: list[str],
    grade_level: int,
    history: list[HumanMessage | AIMessage] | None = None,
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
        "history": history or [],
    }):
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content
```

- [ ] **Step 8: Run all chat tests**

Run: `cd backend && python -m pytest tests/test_chat.py -v`
Expected: ALL tests PASS (both old and new).

- [ ] **Step 9: Commit**

```bash
git add backend/app/agents/tutor_agent/chatbot.py backend/app/api/v1/endpoints/chat.py backend/tests/test_chat.py
git commit -m "feat(chat): add conversation history support (last 10 messages)"
```

---

### Task 3: Streaming UX — Backend Error Events

**Files:**
- Modify: `backend/app/api/v1/endpoints/chat.py:123-190` (stream endpoint)

- [ ] **Step 1: Wrap `event_stream()` generator in try/except with error event**

Replace the `event_stream()` inner function in the `chat_stream` endpoint:

```python
    async def event_stream():
        yield f"data: {json.dumps({'type': 'status', 'content': 'Thinking...'})}\n\n"

        try:
            accumulated_response: list[str] = []
            async for token in stream_guardrailed_response(
                original_message=body.message,
                translated_message=translated_query,
                context_chunks=context_chunks,
                grade_level=grade_level,
                history=lc_history,
            ):
                accumulated_response.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Oops! Something went wrong. Please try again!'})}\n\n"

        await asyncio.to_thread(
            log_interaction,
            student_id=student["sub"],
            classroom_id=classroom_id,
            grade_level=grade_level,
            interaction_type="chat",
            original_message=body.message,
            translated_message=translated_query,
            correct=None,
            context_used=len(context_chunks) > 0,
        )
```

- [ ] **Step 2: Run existing tests**

Run: `cd backend && python -m pytest tests/test_chat.py -v`
Expected: All PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/chat.py
git commit -m "feat(chat): add error SSE event for stream failures"
```

---

### Task 4: Streaming UX — Frontend Improvements

**Files:**
- Modify: `frontend/app/student/chat/page.tsx`

- [ ] **Step 1: Replace `loading` boolean with a phase state**

Replace the `loading` state declaration (line 18):

```typescript
const [phase, setPhase] = useState<"idle" | "thinking" | "streaming">("idle");
```

- [ ] **Step 2: Update `sendMessage()` to use phases, send history, and handle error events**

Replace the entire `sendMessage()` function (lines 51-134):

```typescript
  async function sendMessage() {
    const text = input.trim();
    if (!text || phase !== "idle") return;

    const studentMsg: Message = { id: nextId.current++, role: "student", text };
    setMessages((prev) => [...prev, studentMsg]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setPhase("thinking");

    const tutorMsgId = nextId.current++;
    setMessages((prev) => [
      ...prev,
      { id: tutorMsgId, role: "tutor", text: "" },
    ]);

    const BASE_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const token = localStorage.getItem("primepal_student_token");

    // Build history from recent messages (last 10, excluding the just-added student msg)
    const recentMessages = messages.slice(-10);
    const history = recentMessages.map((m) => ({
      role: m.role === "student" ? "student" : "tutor",
      content: m.text,
    }));

    try {
      const response = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lastNewline = buffer.lastIndexOf("\n");
        if (lastNewline === -1) continue;

        const complete = buffer.slice(0, lastNewline);
        buffer = buffer.slice(lastNewline + 1);

        const lines = complete
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              setPhase("streaming");
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tutorMsgId
                    ? { ...msg, text: msg.text + data.content }
                    : msg
                )
              );
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tutorMsgId
                    ? { ...msg, text: data.content }
                    : msg
                )
              );
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tutorMsgId && msg.text === ""
            ? { ...msg, text: "Oops! Something went wrong 😅 Try again!" }
            : msg
        )
      );
    } finally {
      setPhase("idle");
    }
  }
```

- [ ] **Step 3: Update the typing indicator to only show during "thinking" phase**

Replace the typing indicator block (lines 278-294) with:

```tsx
        {phase === "thinking" && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold">
                P
              </div>
              <span className="text-xs text-gray-400">PrimePal is thinking...</span>
            </div>
            <div className="bg-white border-2 border-yellow-200 rounded-2xl rounded-tl-sm shadow-sm self-start">
              <div className="flex gap-1 items-center px-4 py-3">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Update all references from `loading` to `phase`**

Replace all remaining `loading` references:

In `handleInputChange` and `handleKeyDown` — no changes needed (they don't use `loading`).

In the textarea `disabled` prop (line 311):
```tsx
disabled={phase !== "idle"}
```

In the send button `disabled` prop (line 314):
```tsx
disabled={phase !== "idle" || input.trim().length === 0}
```

In the send button `whileHover` (line 315):
```tsx
whileHover={phase === "idle" && input.trim().length > 0 ? { scale: 1.05 } : undefined}
```

In the send button `whileTap` (line 316):
```tsx
whileTap={phase === "idle" && input.trim().length > 0 ? { scale: 0.95 } : undefined}
```

In the send button content (lines 321-345):
```tsx
{phase !== "idle" ? (
  <span className="flex items-center gap-1">
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
    Sending…
  </span>
) : (
  "Send 🚀"
)}
```

- [ ] **Step 5: Add throttled auto-scroll during streaming**

Replace the scroll `useEffect` (lines 38-40) with:

```typescript
  useEffect(() => {
    if (phase === "streaming") {
      // Throttled scroll during streaming — use requestAnimationFrame
      const frame = requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, phase]);
```

- [ ] **Step 6: Build the frontend to check for errors**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/student/chat/page.tsx
git commit -m "feat(chat): phase-aware streaming UX with error handling and conversation history"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && python -m pytest tests/test_chat.py -v`
Expected: All tests PASS.

- [ ] **Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Clean build, no errors.

- [ ] **Step 3: Verify no regressions in other tests**

Run: `cd backend && python -m pytest --timeout=30 -x -q`
Expected: All tests pass.
