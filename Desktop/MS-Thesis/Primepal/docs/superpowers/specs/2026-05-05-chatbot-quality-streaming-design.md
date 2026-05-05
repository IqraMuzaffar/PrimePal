# Chatbot Quality & Streaming Improvements — Design Spec

**Date:** 2026-05-05
**Branch:** `student-my-scores`
**Status:** Approved

## Problem

The PrimePal chatbot has three issues:
1. Responses feel generic — not warm, kid-friendly, or culturally grounded enough
2. Every message is stateless — the tutor can't follow up on what was just discussed
3. Streaming UX is janky — typing indicator overlaps with token display, no error handling, ignored status events

## Scope

Three areas of improvement across backend (`chatbot.py`, `chat.py`) and frontend (`chat/page.tsx`). No new database tables. No model upgrades. No new dependencies.

---

## 1. Enhanced System Prompt (Response Quality)

### What changes

Rewrite `_TUTOR_SYSTEM_PROMPT` in `chatbot.py` with:

**Personality traits:**
- PrimePal is a cheerful, patient Pakistani English tutor — like a friendly older sibling
- Celebrates effort, not just correctness ("Great try! Let's look at this together")
- Uses Pakistani cultural references where natural (cricket, mangoes, Urdu greetings)
- Never condescending — treats mistakes as learning opportunities

**Adaptive response length:**
- Replace rigid "2-4 sentences max" with: "Match your response length to the question. Simple fact → 1-2 sentences. Explanation → 3-5 sentences with an example. Confused student → break it into numbered steps."

**Few-shot examples (2-3):**
Include example exchanges directly in the system prompt so the LLM has concrete tone/format targets:

```
Example 1 (English student, simple question):
Student: "What is a verb?"
PrimePal: "🌟 A **verb** is an action word — it tells us what someone DOES! Like **run**, **eat**, or **play**. Can you think of something you did today? That's a verb!"

Example 2 (Minglish student, confused):
Student: "Mujhe adjective samajh nahi aa raha"
PrimePal: "🎉 Koi baat nahi! **Adjective** ek aisa lafz hai jo kisi cheez ko describe karta hai. Jaise **big** cat, **red** ball, **happy** boy. Socho — tumhari favourite cheez kaisi hai? Woh word adjective hai!"

Example 3 (Follow-up / scaffolding):
Student: "I don't understand"
PrimePal: "📚 No worries! Let me break it down:
1. First, think of a **naming word** (noun) — like 'ball'
2. Now, what colour is the ball? Maybe **red**!
3. 'Red' is the **adjective** — it describes the ball!
Try it: what word describes YOUR school bag?"
```

**Scaffolding rule:**
- When a student says "I don't understand" or similar, never just repeat the same explanation — break it into smaller steps and end with a question to check understanding.

### Files changed
- `backend/app/agents/tutor_agent/chatbot.py` — `_TUTOR_SYSTEM_PROMPT` rewrite

---

## 2. Conversation Memory (Frontend-Managed History)

### Architecture

The frontend sends the last 5 conversation turns (student + tutor messages) alongside the new message. The backend injects them into the LangChain prompt as conversation history.

### Request schema change

```python
# In chat.py
class ChatMessage(BaseModel):
    role: str  # "student" or "tutor"
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=10)
```

- `history` is optional — empty list for first message (backwards compatible)
- `max_length=10` caps at 10 messages (5 turns) to control token usage

### Prompt changes

Update `_TUTOR_PROMPT` in `chatbot.py` to include conversation history:

```python
_TUTOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _TUTOR_SYSTEM_PROMPT),
    # Conversation history injected as alternating human/ai messages
    MessagesPlaceholder(variable_name="history", optional=True),
    ("user", "{translated_message}"),
])
```

The endpoint converts `ChatMessage` objects into LangChain `HumanMessage`/`AIMessage` objects before passing to the chain.

### Frontend changes

In `page.tsx`, when sending a message, include the last 10 messages from state:

```typescript
const history = messages.slice(-10).map(m => ({
  role: m.role === "student" ? "student" : "tutor",
  content: m.text,
}));
```

### Files changed
- `backend/app/api/v1/endpoints/chat.py` — `ChatRequest` schema, history conversion in both endpoints
- `backend/app/agents/tutor_agent/chatbot.py` — prompt template uses `MessagesPlaceholder`, functions accept `history` param
- `frontend/app/student/chat/page.tsx` — sends `history` array with each request

---

## 3. Streaming UX Fixes

### Backend: Error event

Wrap the `stream_guardrailed_response` generator in a try/except inside `event_stream()`. On failure, yield an error SSE event:

```python
async def event_stream():
    yield f"data: {json.dumps({'type': 'status', 'content': 'Thinking...'})}\n\n"
    try:
        accumulated_response = []
        async for token in stream_guardrailed_response(...):
            accumulated_response.append(token)
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception:
        yield f"data: {json.dumps({'type': 'error', 'content': 'Something went wrong. Please try again!'})}\n\n"
    # log interaction after (whether success or error)
```

### Frontend: Phase-aware typing indicator

The frontend currently shows bouncing dots via the `loading` state, which is `true` for the entire stream. Change to a two-phase approach:

- **Phase 1 (thinking):** Show bouncing dots. Starts when user sends message. Ends when first `token` event arrives.
- **Phase 2 (streaming):** Hide bouncing dots. Tokens render directly in the message bubble.

New state: `streaming` boolean (or replace `loading` with an enum `"idle" | "thinking" | "streaming"`).

### Frontend: Error event handling

When a `{"type": "error"}` event is received:
- Set the tutor message text to the error content
- Stop the loading/streaming state
- Optionally show a "Retry" button on that message

### Frontend: Smooth auto-scroll during streaming

Currently `scrollIntoView` fires on the `messages` state change via `useEffect`. During streaming, each token triggers a re-render + scroll, which can be jerky.

Fix: use `requestAnimationFrame` or a throttled scroll (every 100ms) during the streaming phase instead of scrolling on every single token update.

### Files changed
- `backend/app/api/v1/endpoints/chat.py` — try/except + error event in `event_stream()`
- `frontend/app/student/chat/page.tsx` — phase-aware indicator, error handling, throttled scroll

---

## Files Summary

| File | Changes |
|------|---------|
| `backend/app/agents/tutor_agent/chatbot.py` | System prompt rewrite, `MessagesPlaceholder` for history, function signatures updated |
| `backend/app/api/v1/endpoints/chat.py` | `ChatRequest` schema with `history`, history→LangChain conversion, error SSE event |
| `frontend/app/student/chat/page.tsx` | Send history, phase-aware loading, error handling, throttled scroll |

## Out of Scope

- Model upgrade (staying on gpt-4o-mini)
- Server-side session storage
- New database tables
- Chat history persistence across sessions
- WebSocket migration
