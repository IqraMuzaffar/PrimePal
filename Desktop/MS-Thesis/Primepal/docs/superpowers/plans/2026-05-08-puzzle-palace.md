# Puzzle Palace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Spelling Bee module with Puzzle Palace — a 5-room, 10-question activity reusing existing mission task types and UI components.

**Architecture:** New backend endpoint generates 2 questions per task type by calling existing `generate_pillar_missions()`. New frontend page renders a room-by-room flow using existing `TaskRouter`. Points submitted via existing `/missions/complete`. Spelling Bee code is fully removed.

**Tech Stack:** FastAPI (backend), Next.js 14 + React (frontend), existing TaskRouter components, TanStack Query hooks, Supabase

---

### Task 1: Create Puzzle Palace Backend Endpoint

**Files:**
- Create: `backend/app/api/v1/endpoints/puzzle_palace.py`
- Modify: `backend/app/api/v1/router.py:3,19` (import + register route)

- [ ] **Step 1: Create the endpoint file**

Create `backend/app/api/v1/endpoints/puzzle_palace.py`:

```python
"""
Feature: Puzzle Palace (Student-side word & reading puzzles)

Endpoints (all require student JWT):
  GET /api/v1/puzzle-palace/rooms — Generate 10 questions across 5 rooms
"""

import asyncio
import hashlib
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, make_cache_key
from app.api.v1.endpoints.classroom import get_active_topics
from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks
from app.agents.tutor_agent.mission_generator import (
    MissionQuestion,
    generate_pillar_missions,
)
from app.api.v1.endpoints.missions import _strip_answer, MissionQuestionOut

logger = logging.getLogger(__name__)
router = APIRouter()

# The 5 rooms in fixed order: (room_name, task_type, pillar)
ROOMS = [
    ("Fill the Gap", "fill_blank_word_bank", "reading"),
    ("Scramble Fix", "sentence_scramble", "writing"),
    ("Odd One Out", "odd_one_out", "reading"),
    ("Missing Letter", "missing_letter", "writing"),
    ("True or False", "passage_true_false", "reading"),
]

_SEED_PHRASE = "vocabulary words lesson"


class RoomOut(BaseModel):
    room_number: int
    room_name: str
    task_type: str
    pillar: str
    questions: list[MissionQuestionOut]


class PuzzlePalaceResponse(BaseModel):
    rooms: list[RoomOut]
    topic: str


@router.get("/rooms", response_model=PuzzlePalaceResponse, summary="Get Puzzle Palace rooms")
async def get_puzzle_palace_rooms(student: dict = Depends(get_current_student)):
    """
    Generate 10 questions across 5 rooms (2 per room).
    Each room uses a different task type. Reuses pillar mission generation.
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # Fetch grade level
    classroom_resp = await asyncio.to_thread(
        lambda: supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    grade_level: int = classroom_resp.data["grade_level"]

    # Resolve active topics
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topic_display = ", ".join(active_topic_names) if active_topic_names else f"Grade {grade_level} English"
    topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]

    # Check cache (1 hour TTL)
    cache_key = make_cache_key("puzzle_palace", classroom_id, str(grade_level), topics_hash)
    cached = await cache_get(cache_key)
    if cached:
        logger.info("Cache hit for puzzle palace: %s", cache_key)
        return PuzzlePalaceResponse(**cached)

    # Retrieve SNC context chunks for RAG grounding
    seed_phrase = f"English topics: {', '.join(active_topic_names)}" if active_topic_names else _SEED_PHRASE
    try:
        context_chunks = await retrieve_grade_filtered_chunks(
            query=seed_phrase,
            grade_level=grade_level,
            supabase_admin_client=supabase,
            match_count=5,
        )
    except Exception as exc:
        logger.error("RAG retrieval failed for puzzle palace: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not retrieve curriculum content. Please try again.",
        )

    # Generate 2 questions per room by calling pillar missions for each pillar
    # Group rooms by pillar to batch generation
    reading_types = [r for r in ROOMS if r[2] == "reading"]
    writing_types = [r for r in ROOMS if r[2] == "writing"]

    reading_qs, writing_qs = await asyncio.gather(
        generate_pillar_missions(
            pillar="reading",
            grade_level=grade_level,
            active_topics=active_topic_names,
            student_id=student_id,
            student_weaknesses=[],
            context_chunks=context_chunks,
            count=len(reading_types) * 2,  # 6 questions (3 rooms x 2)
        ),
        generate_pillar_missions(
            pillar="writing",
            grade_level=grade_level,
            active_topics=active_topic_names,
            student_id=student_id,
            student_weaknesses=[],
            context_chunks=context_chunks,
            count=len(writing_types) * 2,  # 4 questions (2 rooms x 2)
        ),
    )

    # Assign questions to rooms by task_type
    # Build a pool per task_type
    pool: dict[str, list[dict]] = {}
    for q in reading_qs + writing_qs:
        tt = q.get("task_type", "") if isinstance(q, dict) else getattr(q, "task_type", "")
        pool.setdefault(tt, []).append(q)

    rooms_out: list[RoomOut] = []
    question_id = 1

    for idx, (room_name, task_type, pillar) in enumerate(ROOMS):
        available = pool.get(task_type, [])
        room_questions = available[:2]

        # If not enough questions of the exact type, fill from same-pillar pool
        if len(room_questions) < 2:
            all_pillar = reading_qs if pillar == "reading" else writing_qs
            for q in all_pillar:
                if len(room_questions) >= 2:
                    break
                if q not in room_questions:
                    room_questions.append(q)

        # Assign IDs and ensure points_value = 10
        stripped: list[MissionQuestionOut] = []
        for q in room_questions:
            if isinstance(q, dict):
                q["id"] = question_id
                q["points_value"] = 10
                q["pillar"] = pillar
            else:
                q.id = question_id
                q.points_value = 10
                q.pillar = pillar
            stripped.append(_strip_answer(q))
            question_id += 1

        rooms_out.append(RoomOut(
            room_number=idx + 1,
            room_name=room_name,
            task_type=task_type,
            pillar=pillar,
            questions=stripped,
        ))

    response = PuzzlePalaceResponse(rooms=rooms_out, topic=topic_display)

    # Cache for 1 hour
    await cache_set(cache_key, response.model_dump(), ttl=3600)

    return response
```

- [ ] **Step 2: Register the route in the API router**

In `backend/app/api/v1/router.py`, add the import and route registration.

Change the import line from:
```python
from app.api.v1.endpoints import achievements, admin, auth, chat, classroom, curriculum, evaluations, evaluator, interactions, missions, rewards, spelling_bee, story_time, student_scores, teacher, topics
```
to:
```python
from app.api.v1.endpoints import achievements, admin, auth, chat, classroom, curriculum, evaluations, evaluator, interactions, missions, puzzle_palace, rewards, story_time, student_scores, teacher, topics
```

Add after the line `api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])`:
```python
api_router.include_router(puzzle_palace.router, prefix="/puzzle-palace", tags=["puzzle-palace"])
```

Remove the line:
```python
api_router.include_router(spelling_bee.router, prefix="/spelling-bee", tags=["spelling-bee"])
```

- [ ] **Step 3: Verify backend starts**

Run: `cd backend && python -c "from app.api.v1.endpoints.puzzle_palace import router; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/puzzle_palace.py backend/app/api/v1/router.py
git commit -m "feat: add Puzzle Palace backend endpoint, remove Spelling Bee route"
```

---

### Task 2: Remove Spelling Bee Backend

**Files:**
- Delete: `backend/app/api/v1/endpoints/spelling_bee.py`

- [ ] **Step 1: Delete the spelling bee endpoint file**

```bash
rm backend/app/api/v1/endpoints/spelling_bee.py
```

- [ ] **Step 2: Verify no remaining imports**

Run: `grep -r "spelling_bee" backend/app/api/ --include="*.py"`
Expected: No results (we already removed the import in Task 1)

- [ ] **Step 3: Check interaction logger for spelling_bee references**

In `backend/app/agents/evaluator_agent/interaction_logger.py` and `backend/app/api/v1/endpoints/rewards.py`, search for `spelling_bee`. These files only log/query by interaction_type string — no code changes needed since old `spelling_bee` interactions in the DB are historical data.

- [ ] **Step 4: Commit**

```bash
git add -u backend/app/api/v1/endpoints/spelling_bee.py
git commit -m "chore: remove Spelling Bee backend endpoint"
```

---

### Task 3: Create Puzzle Palace Frontend Page

**Files:**
- Create: `frontend/app/student/puzzle-palace/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/app/student/puzzle-palace/page.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, Trophy, RotateCcw } from 'lucide-react';
import TaskRouter from '@/components/student/tasks/TaskRouter';
import PageHero from '@/components/student/PageHero';
import { useMissionComplete } from '@/lib/hooks/mutations';
import { studentFetch } from '@/lib/api-helpers';
import { MissionQuestion } from '@/types/missions';
import { useQuery } from '@tanstack/react-query';

/* ── Types ──────────────────────────────────────────────────── */

interface Room {
  room_number: number;
  room_name: string;
  task_type: string;
  pillar: string;
  questions: MissionQuestion[];
}

interface PuzzlePalaceData {
  rooms: Room[];
  topic: string;
}

/* ── Room emojis & colors ───────────────────────────────────── */

const ROOM_META: Record<string, { emoji: string; color: string }> = {
  'Fill the Gap':   { emoji: '📝', color: 'from-blue-400 to-blue-600' },
  'Scramble Fix':   { emoji: '🔀', color: 'from-emerald-400 to-emerald-600' },
  'Odd One Out':    { emoji: '🔍', color: 'from-amber-400 to-amber-600' },
  'Missing Letter': { emoji: '🔤', color: 'from-rose-400 to-rose-600' },
  'True or False':  { emoji: '✅', color: 'from-purple-400 to-purple-600' },
};

/* ── Game states ────────────────────────────────────────────── */

type GameState = 'loading' | 'intro' | 'playing' | 'room-result' | 'finished';

export default function PuzzlePalacePage() {
  const router = useRouter();
  const completeMission = useMissionComplete();

  const { data, isLoading, error, refetch } = useQuery<PuzzlePalaceData>({
    queryKey: ['puzzlePalace'],
    queryFn: () => studentFetch<PuzzlePalaceData>('/puzzle-palace/rooms'),
    staleTime: 1000 * 60 * 30,
  });

  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentRoom, setCurrentRoom] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [roomResults, setRoomResults] = useState<boolean[][]>([]);
  const [totalScore, setTotalScore] = useState(0);

  const rooms = data?.rooms ?? [];
  const room = rooms[currentRoom];
  const question = room?.questions[currentQuestion];

  const handleAnswer = useCallback(
    (answer: string, isCorrect: boolean) => {
      if (showFeedback || !room) return;
      setShowFeedback(true);

      if (isCorrect) setTotalScore((s) => s + 10);

      // Record to backend
      completeMission.mutate({
        question_correct: isCorrect,
        task_type: room.task_type,
        pillar: room.pillar,
        points_value: 10,
        submitted_at: new Date().toISOString(),
      });

      // Update room results
      setRoomResults((prev) => {
        const copy = [...prev];
        if (!copy[currentRoom]) copy[currentRoom] = [];
        copy[currentRoom][currentQuestion] = isCorrect;
        return copy;
      });

      // After 1.5s, advance
      setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestion < 1) {
          // Next question in same room
          setCurrentQuestion(1);
        } else {
          // Room done
          setGameState('room-result');
        }
      }, 1500);
    },
    [showFeedback, room, currentRoom, currentQuestion, completeMission],
  );

  const handleNextRoom = () => {
    if (currentRoom < rooms.length - 1) {
      setCurrentRoom((r) => r + 1);
      setCurrentQuestion(0);
      setGameState('playing');
    } else {
      setGameState('finished');
    }
  };

  /* ── Loading ──────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error || !data || rooms.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold text-center">Failed to load puzzles. Try again!</p>
        <button
          onClick={() => refetch()}
          className="px-6 py-3 bg-violet-500 text-white font-bold rounded-2xl shadow-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Intro screen ─────────────────────────────────────────── */

  if (gameState === 'intro') {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <PageHero
          emoji="🏰"
          title="Puzzle Palace"
          subtitle={`${rooms.length} rooms to clear — 2 puzzles each!`}
        />
        <div className="mt-6 space-y-3">
          {rooms.map((r, i) => {
            const meta = ROOM_META[r.room_name] ?? { emoji: '🧩', color: 'from-slate-400 to-slate-600' };
            return (
              <div
                key={r.room_number}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100"
              >
                <span className="text-2xl">{meta.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">Room {r.room_number}: {r.room_name}</p>
                  <p className="text-xs text-slate-500 font-semibold capitalize">{r.pillar}</p>
                </div>
                <span className="text-xs font-bold text-slate-400">2 Qs</span>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => { setGameState('playing'); setCurrentRoom(0); setCurrentQuestion(0); }}
          className="mt-8 w-full py-4 rounded-2xl font-baloo font-extrabold text-xl
                     bg-gradient-to-br from-violet-400 to-violet-600 text-white
                     shadow-[0_6px_0_#5b21b6,0_8px_18px_rgba(124,58,237,0.3)]
                     active:translate-y-1 active:shadow-[0_2px_0_#5b21b6]
                     transition-all flex items-center justify-center gap-2"
        >
          Enter the Palace! 🏰
        </button>
      </div>
    );
  }

  /* ── Playing (question screen) ────────────────────────────── */

  if (gameState === 'playing' && room && question) {
    const meta = ROOM_META[room.room_name] ?? { emoji: '🧩', color: 'from-slate-400 to-slate-600' };
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Room header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.emoji}</span>
            <span className="font-bold text-slate-800 text-sm">Room {room.room_number}: {room.room_name}</span>
          </div>
          <span className="text-xs font-bold text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
            Q{currentQuestion + 1}/2
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-500`}
            style={{ width: `${((currentRoom * 2 + currentQuestion + 1) / 10) * 100}%` }}
          />
        </div>

        {/* Score chip */}
        <div className="flex justify-end mb-3">
          <span className="text-sm font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
            ⭐ {totalScore}
          </span>
        </div>

        {/* Task component */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100">
          <TaskRouter
            question={question}
            onAnswer={handleAnswer}
            showFeedback={showFeedback}
            disabled={showFeedback}
          />
        </div>
      </div>
    );
  }

  /* ── Room result ──────────────────────────────────────────── */

  if (gameState === 'room-result' && room) {
    const results = roomResults[currentRoom] ?? [];
    const roomScore = results.filter(Boolean).length * 10;
    const isLast = currentRoom >= rooms.length - 1;
    const meta = ROOM_META[room.room_name] ?? { emoji: '🧩', color: 'from-slate-400 to-slate-600' };

    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <span className="text-5xl mb-4 block">{meta.emoji}</span>
        <h2 className="font-baloo font-extrabold text-2xl text-slate-900 mb-1">
          Room {room.room_number} Complete!
        </h2>
        <p className="text-slate-500 font-semibold text-sm mb-6">{room.room_name}</p>

        <div className="flex justify-center gap-4 mb-6">
          {results.map((correct, i) => (
            <div
              key={i}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md ${
                correct ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
              }`}
            >
              {correct ? '✓' : '✗'}
            </div>
          ))}
        </div>

        <p className="font-bold text-lg text-slate-700 mb-6">
          +{roomScore} points this room
        </p>

        <button
          onClick={handleNextRoom}
          className="w-full py-4 rounded-2xl font-baloo font-extrabold text-lg
                     bg-gradient-to-br from-violet-400 to-violet-600 text-white
                     shadow-[0_6px_0_#5b21b6] active:translate-y-1 active:shadow-[0_2px_0_#5b21b6]
                     transition-all flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>See Results <Trophy size={20} /></>
          ) : (
            <>Next Room <ChevronRight size={20} /></>
          )}
        </button>
      </div>
    );
  }

  /* ── Finished ─────────────────────────────────────────────── */

  if (gameState === 'finished') {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <span className="text-6xl mb-4 block animate-floatUp">🏆</span>
        <h2 className="font-baloo font-extrabold text-3xl text-slate-900 mb-2">
          Palace Cleared!
        </h2>
        <p className="text-slate-500 font-semibold mb-6">You scored</p>

        <div className="inline-block bg-gradient-to-br from-amber-400 to-amber-500 text-white font-extrabold text-4xl px-8 py-4 rounded-3xl shadow-lg mb-8">
          {totalScore}/100
        </div>

        {/* Per-room breakdown */}
        <div className="space-y-2 mb-8">
          {rooms.map((r, i) => {
            const results = roomResults[i] ?? [];
            const correct = results.filter(Boolean).length;
            const meta = ROOM_META[r.room_name] ?? { emoji: '🧩', color: 'from-slate-400 to-slate-600' };
            return (
              <div key={r.room_number} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100">
                <span className="text-xl">{meta.emoji}</span>
                <span className="flex-1 text-left font-bold text-slate-700 text-sm">{r.room_name}</span>
                <span className="font-bold text-sm text-slate-600">{correct}/2</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/student/home')}
            className="flex-1 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 shadow-sm"
          >
            Home
          </button>
          <button
            onClick={() => {
              setGameState('intro');
              setCurrentRoom(0);
              setCurrentQuestion(0);
              setRoomResults([]);
              setTotalScore(0);
              refetch();
            }}
            className="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-br from-violet-400 to-violet-600 shadow-md flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Play Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `cd frontend && npx next build 2>&1 | grep -E "(error|puzzle)" -i | head -10`
Expected: No errors related to puzzle-palace

- [ ] **Step 3: Commit**

```bash
git add frontend/app/student/puzzle-palace/page.tsx
git commit -m "feat: add Puzzle Palace frontend page with room-by-room flow"
```

---

### Task 4: Update Student Home Page — Replace Spelling Bee Card

**Files:**
- Modify: `frontend/app/student/home/page.tsx:20-26`

- [ ] **Step 1: Replace the Spelling Bee card entry**

In `frontend/app/student/home/page.tsx`, change the `ACTIVITY_CARDS` array. Replace:

```typescript
  { href: "/student/spelling-bee", icon: "🐝", title: "Spelling Bee",    subtitle: "30-second challenge",                     tone: "amber"  as const },
```

with:

```typescript
  { href: "/student/puzzle-palace", icon: "🏰", title: "Puzzle Palace",   subtitle: "5 rooms of word puzzles",                 tone: "amber"  as const },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/student/home/page.tsx
git commit -m "feat: replace Spelling Bee card with Puzzle Palace on student home"
```

---

### Task 5: Remove Spelling Bee Frontend

**Files:**
- Delete: `frontend/app/student/spelling-bee/page.tsx`

- [ ] **Step 1: Delete the spelling bee page**

```bash
rm -rf frontend/app/student/spelling-bee/
```

- [ ] **Step 2: Verify no remaining frontend references**

Run: `grep -r "spelling-bee\|spelling_bee\|SpellingBee" frontend/app/ frontend/components/ frontend/lib/ --include="*.ts" --include="*.tsx" | grep -v node_modules`

Expected: No results (the home page card was already updated in Task 4)

- [ ] **Step 3: Commit**

```bash
git add -u frontend/app/student/spelling-bee/
git commit -m "chore: remove Spelling Bee frontend"
```

---

### Task 6: Add studentFetch Helper (if missing)

**Files:**
- Check: `frontend/lib/api-helpers.ts`

- [ ] **Step 1: Check if studentFetch exists**

Run: `grep "studentFetch" frontend/lib/api-helpers.ts`

If it exists, skip this task. If not, add it — this is the student-authenticated fetch helper used by the Puzzle Palace page:

```typescript
export async function studentFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("primepal_student_token");
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Commit (only if changes were made)**

```bash
git add frontend/lib/api-helpers.ts
git commit -m "feat: add studentFetch helper for student-authed GET requests"
```

---

### Task 7: End-to-End Smoke Test

- [ ] **Step 1: Start backend**

Run: `cd backend && uvicorn app.main:app --reload`

- [ ] **Step 2: Test endpoint with curl (using a valid student JWT)**

```bash
curl -H "Authorization: Bearer <student_jwt>" http://localhost:8000/api/v1/puzzle-palace/rooms | python -m json.tool | head -30
```

Expected: JSON with `rooms` array containing 5 rooms, each with 2 questions

- [ ] **Step 3: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 4: Navigate to Puzzle Palace**

1. Log in as a student at `/student/play`
2. Go to home page — verify "Puzzle Palace" card appears (not "Spelling Bee")
3. Click the card — verify intro screen shows 5 rooms
4. Click "Enter the Palace" — answer questions through all 5 rooms
5. Verify points are awarded and final score screen shows

- [ ] **Step 5: Verify Spelling Bee is gone**

Navigate to `/student/spelling-bee` — should show 404

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Puzzle Palace complete — replaces Spelling Bee module"
```
