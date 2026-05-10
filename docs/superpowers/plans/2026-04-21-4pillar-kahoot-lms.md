# 4-Pillar Kahoot-Style LMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-mission student interface into a robust 4-pillar (Reading, Writing, Listening, Speaking) Kahoot-style LMS with curriculum-aligned questions, student weakness tracking, and a 15-second timer per question.

**Architecture:**
- Teacher sets a `current_week_topic` in the classroom settings, guiding AI question generation.
- Backend analyzes student's recent incorrect answers (from `student_interactions`) and generates 10 questions per pillar, mixing curriculum focus with weakness remediation.
- Frontend presents a 2x2 grid of massive, colored cards (one per pillar); clicking launches a gameplay loop with a 15-second countdown timer per question.

**Tech Stack:** Supabase (migrations), FastAPI, Pydantic, OpenAI GPT-4o-mini, Next.js 14, Framer Motion, Lucide-react, Tailwind CSS.

---

### Task 1: Database Migration – Add `current_week_topic` to Classrooms

**Files:**
- Create: `supabase/migrations/009_add_current_week_topic.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/009_add_current_week_topic.sql
ALTER TABLE classrooms
ADD COLUMN current_week_topic VARCHAR(500) DEFAULT 'Week 1: Introduction' NOT NULL;

COMMENT ON COLUMN classrooms.current_week_topic IS 'Teacher-set curriculum topic for this week (e.g., "Week 2: Past Tense Nouns"). Used by AI to focus question generation.';
```

- [ ] **Step 2: Apply migration locally**

Run: `supabase db push`
Expected: Migration applied without errors; `classrooms` table now has `current_week_topic` column.

- [ ] **Step 3: Verify in Supabase dashboard**

Navigate to your Supabase project → Tables → `classrooms`. Confirm `current_week_topic` column exists with default value.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_add_current_week_topic.sql
git commit -m "database: add current_week_topic to classrooms for curriculum tracking"
```

---

### Task 2: Teacher Classroom UI – Add Current Week Topic Input

**Files:**
- Modify: `frontend/app/(teacher)/classroom/[id]/page.tsx`

- [ ] **Step 1: Read the current classroom page**

Check `frontend/app/(teacher)/classroom/[id]/page.tsx` to understand its current structure (query params, layout, form patterns).

- [ ] **Step 2: Write test for topic update**

Create `frontend/__tests__/classroom-settings.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClassroomPage from '@/app/(teacher)/classroom/[id]/page';

describe('Classroom Settings – Current Week Topic', () => {
  it('should display and save current_week_topic input', async () => {
    const mockClassroom = {
      id: 'class-123',
      name: 'Grade 3A',
      current_week_topic: 'Week 2: Past Tense Nouns',
      student_count: 20,
    };

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    const input = screen.getByLabelText(/current week topic/i);
    expect(input).toHaveValue('Week 2: Past Tense Nouns');

    fireEvent.change(input, { target: { value: 'Week 3: Present Progressive' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/topic updated/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Add UI for current_week_topic input**

In `frontend/app/(teacher)/classroom/[id]/page.tsx`, find the classroom form section and add:

```typescript
// Inside the classroom form JSX (after name field, before submit button):
<div className="mb-6">
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Current Week Topic
  </label>
  <input
    type="text"
    name="currentWeekTopic"
    placeholder="e.g., Week 2: Past Tense Nouns"
    defaultValue={classroom.current_week_topic || ''}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <p className="text-xs text-gray-500 mt-1">
    This topic guides question generation for students.
  </p>
</div>
```

- [ ] **Step 4: Update the API call to save current_week_topic**

Find the form submission handler in the classroom page and update it to include `current_week_topic`:

```typescript
const handleSaveClassroom = async (formData: FormData) => {
  const response = await fetch(`/api/v1/classrooms/${classroomId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.get('classroomName'),
      current_week_topic: formData.get('currentWeekTopic'),
    }),
  });
  // Handle response...
};
```

- [ ] **Step 5: Run the test**

Run: `npm test -- frontend/__tests__/classroom-settings.test.tsx`
Expected: Test passes.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/(teacher)/classroom/[id]/page.tsx
git add frontend/__tests__/classroom-settings.test.tsx
git commit -m "feat: add current_week_topic input to teacher classroom settings"
```

---

### Task 3: Backend – Update Missions Endpoint to Accept Pillar Parameter

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py`
- Modify: `backend/app/models.py` (or relevant Pydantic models file)
- Create: `backend/tests/test_missions.py`

- [ ] **Step 1: Read current missions endpoint**

Check `backend/app/api/v1/endpoints/missions.py` to understand its structure. Identify the current endpoint signature.

- [ ] **Step 2: Write failing test for pillar-based mission generation**

Create `backend/tests/test_missions.py`:

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_get_missions_by_pillar():
    """Test that missions endpoint accepts pillar query parameter and returns 10 questions."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/missions",
            params={
                "student_id": "student-123",
                "classroom_id": "class-456",
                "pillar": "reading"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) == 10
        assert data["pillar"] == "reading"
        assert "current_week_topic" in data

@pytest.mark.asyncio
async def test_missions_include_student_weaknesses():
    """Test that generated questions include remediation for student's recent incorrect answers."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/missions",
            params={
                "student_id": "student-with-weaknesses",
                "classroom_id": "class-456",
                "pillar": "writing"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "weakness_focus_questions" in data
        assert len(data["questions"]) == 10
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest tests/test_missions.py -v`
Expected: FAIL – endpoint does not exist or does not support pillar parameter.

- [ ] **Step 4: Update missions endpoint signature**

In `backend/app/api/v1/endpoints/missions.py`, update the GET endpoint:

```python
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.agents.tutor_agent.mission_generator import MissionGenerator
from app.models import Classroom, StudentInteraction
from sqlalchemy import select

router = APIRouter(prefix="/missions", tags=["missions"])

@router.get("")
async def get_missions(
    student_id: str = Query(..., description="Student ID"),
    classroom_id: str = Query(..., description="Classroom ID"),
    pillar: str = Query(..., description="Pillar type: reading, writing, listening, speaking"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate 10 questions for a specific pillar.
    Questions are weighted by student weaknesses and curriculum focus.
    """
    # Validate pillar
    valid_pillars = ["reading", "writing", "listening", "speaking"]
    if pillar not in valid_pillars:
        raise HTTPException(status_code=400, detail=f"Invalid pillar. Must be one of {valid_pillars}")

    # Fetch classroom and current_week_topic
    classroom_query = select(Classroom).where(Classroom.id == classroom_id)
    classroom = await db.execute(classroom_query)
    classroom = classroom.scalar_one_or_none()

    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")

    current_week_topic = classroom.current_week_topic

    # Fetch student's recent incorrect answers (last 5 interactions)
    weakness_query = select(StudentInteraction).where(
        StudentInteraction.student_id == student_id,
        StudentInteraction.is_correct == False
    ).order_by(StudentInteraction.created_at.desc()).limit(5)

    weaknesses = await db.execute(weakness_query)
    weaknesses = weaknesses.scalars().all()

    # Generate missions
    generator = MissionGenerator()
    questions = await generator.generate_pillar_missions(
        pillar=pillar,
        current_week_topic=current_week_topic,
        student_id=student_id,
        student_weaknesses=[w.question_text for w in weaknesses],
    )

    return {
        "pillar": pillar,
        "current_week_topic": current_week_topic,
        "questions": questions,
        "weakness_focus_questions": len([q for q in questions if q.get("is_weakness_focused")])
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_missions.py::test_get_missions_by_pillar -v`
Expected: PASS (assuming MissionGenerator is stubbed or returns mock data).

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git add backend/tests/test_missions.py
git commit -m "feat: add pillar parameter to missions endpoint with weakness tracking"
```

---

### Task 4: Backend – Update Mission Generator to Accept Pillar & Generate Curriculum-Aligned Questions

**Files:**
- Modify: `backend/app/agents/tutor_agent/mission_generator.py`
- Modify: `backend/tests/test_missions.py` (add integration tests)

- [ ] **Step 1: Read current mission_generator.py**

Check the existing implementation to understand the prompt structure and LLM call.

- [ ] **Step 2: Add test for pillar-specific question generation**

Update `backend/tests/test_missions.py`:

```python
@pytest.mark.asyncio
async def test_mission_generator_reading_pillar():
    """Test that mission generator creates reading comprehension questions."""
    from app.agents.tutor_agent.mission_generator import MissionGenerator

    generator = MissionGenerator()
    questions = await generator.generate_pillar_missions(
        pillar="reading",
        current_week_topic="Week 2: Past Tense Nouns",
        student_id="student-123",
        student_weaknesses=["What is the past tense of 'eat'?", "Identify the subject noun"],
    )

    assert len(questions) == 10
    assert all(q["pillar"] == "reading" for q in questions)
    assert all(q["type"] in ["multiple_choice", "short_answer"] for q in questions)
    # At least some questions should focus on weaknesses
    weakness_focused = [q for q in questions if q.get("is_weakness_focused")]
    assert len(weakness_focused) >= 2

@pytest.mark.asyncio
async def test_mission_generator_speaking_pillar():
    """Test that mission generator creates speaking/listening questions."""
    from app.agents.tutor_agent.mission_generator import MissionGenerator

    generator = MissionGenerator()
    questions = await generator.generate_pillar_missions(
        pillar="speaking",
        current_week_topic="Week 2: Greetings & Introductions",
        student_id="student-123",
        student_weaknesses=[],
    )

    assert len(questions) == 10
    assert all(q["pillar"] == "speaking" for q in questions)
    # Speaking questions should include prompt text
    assert all("prompt" in q for q in questions)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest tests/test_missions.py::test_mission_generator_reading_pillar -v`
Expected: FAIL – method does not exist yet.

- [ ] **Step 4: Update MissionGenerator class**

In `backend/app/agents/tutor_agent/mission_generator.py`, add the `generate_pillar_missions` method:

```python
from openai import AsyncOpenAI
from pydantic import BaseModel
import json

client = AsyncOpenAI()

class Question(BaseModel):
    id: str
    pillar: str
    type: str  # "multiple_choice", "short_answer", "speaking_prompt"
    question_text: str
    options: list[str] | None = None  # For multiple choice
    prompt: str | None = None  # For speaking
    correct_answer: str
    is_weakness_focused: bool = False
    difficulty: str = "medium"  # "easy", "medium", "hard"

class MissionGenerator:
    async def generate_pillar_missions(
        self,
        pillar: str,
        current_week_topic: str,
        student_id: str,
        student_weaknesses: list[str],
    ) -> list[dict]:
        """
        Generate 10 curriculum-aligned questions for a specific pillar.
        Weaves in student weakness remediation.
        """

        # Define pillar-specific prompts
        pillar_prompts = {
            "reading": {
                "type": "multiple_choice",
                "instruction": "Create reading comprehension questions testing vocabulary and understanding of the passage.",
            },
            "writing": {
                "type": "short_answer",
                "instruction": "Create writing exercises: fill-in-the-blank, sentence correction, or short composition prompts.",
            },
            "listening": {
                "type": "multiple_choice",
                "instruction": "Create listening comprehension questions. Provide a passage the student would hear and multiple choice answers.",
            },
            "speaking": {
                "type": "speaking_prompt",
                "instruction": "Create speaking prompts that encourage oral response. Include a prompt phrase and correct response example.",
            },
        }

        pillar_config = pillar_prompts.get(pillar)
        if not pillar_config:
            raise ValueError(f"Invalid pillar: {pillar}")

        # Build weakness context
        weakness_context = ""
        if student_weaknesses:
            weakness_context = f"\n\nStudent's recent mistakes (focus on remediation):\n" + "\n".join([f"- {w}" for w in student_weaknesses])

        # Construct LLM prompt
        system_prompt = f"""You are an expert ESL tutor for Pakistani primary school students (grades 3-5).
Generate exactly 10 questions for the "{pillar}" pillar focused on: {current_week_topic}

{pillar_config['instruction']}

IMPORTANT CONSTRAINTS:
1. Use SNC (Single National Curriculum) vocabulary appropriate for this topic.
2. Keep language simple and encouraging.
3. At least 3 questions should directly remediate student weaknesses (see below).
4. Mix difficulty levels: 4 easy, 4 medium, 2 hard.
5. Each question must be a valid JSON object with required fields.

{weakness_context}

Return a JSON array with exactly 10 question objects. Each object MUST have:
- id: unique ID (e.g., "q1", "q2")
- question_text: the question or prompt
- type: "{pillar_config['type']}"
- pillar: "{pillar}"
- correct_answer: the expected correct answer
- options: (for multiple_choice) array of 4 options, first is correct
- prompt: (for speaking) the speaking prompt text
- difficulty: "easy", "medium", or "hard"
- is_weakness_focused: true if this question addresses the student's recent mistakes

Respond ONLY with valid JSON array, no explanation."""

        user_message = f"Generate 10 {pillar} questions for topic: {current_week_topic}"

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            top_p=0.9,
        )

        # Parse response
        try:
            questions_data = json.loads(response.choices[0].message.content)
            if not isinstance(questions_data, list):
                raise ValueError("Response is not a list")

            # Validate and enrich questions
            questions = []
            for idx, q in enumerate(questions_data[:10]):  # Enforce exactly 10
                question = Question(
                    id=q.get("id", f"q{idx+1}"),
                    pillar=pillar,
                    type=q.get("type", pillar_config["type"]),
                    question_text=q.get("question_text", q.get("prompt", "")),
                    options=q.get("options"),
                    prompt=q.get("prompt"),
                    correct_answer=q.get("correct_answer", ""),
                    is_weakness_focused=q.get("is_weakness_focused", False),
                    difficulty=q.get("difficulty", "medium"),
                )
                questions.append(question.dict())

            return questions
        except (json.JSONDecodeError, ValueError) as e:
            raise RuntimeError(f"Failed to parse mission generator response: {e}")
```

- [ ] **Step 5: Run test**

Run: `cd backend && pytest tests/test_missions.py::test_mission_generator_reading_pillar -v`
Expected: PASS (LLM will generate real questions).

- [ ] **Step 6: Commit**

```bash
git add backend/app/agents/tutor_agent/mission_generator.py
git commit -m "feat: implement pillar-based question generation with curriculum and weakness focus"
```

---

### Task 5: Frontend – Redesign Missions Dashboard as 2x2 Grid with Colored Cards

**Files:**
- Modify: `frontend/app/(student)/missions/page.tsx`
- Create: `frontend/components/student/PillarCard.tsx`
- Modify: `frontend/__tests__/missions.test.tsx`

- [ ] **Step 1: Write test for dashboard grid layout**

Create/update `frontend/__tests__/missions.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import MissionsPage from '@/app/(student)/missions/page';

describe('Student Missions Dashboard', () => {
  it('should render 4 pillar cards in a grid', () => {
    render(<MissionsPage />);

    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('Speaking')).toBeInTheDocument();
  });

  it('should have correct colors for each pillar', () => {
    const { container } = render(<MissionsPage />);

    const readingCard = screen.getByText('Reading').closest('div');
    expect(readingCard).toHaveClass('bg-red-600'); // Ruby Red

    const writingCard = screen.getByText('Writing').closest('div');
    expect(writingCard).toHaveClass('bg-blue-600'); // Ocean Blue
  });

  it('should navigate to pillar gameplay on card click', () => {
    render(<MissionsPage />);

    const readingCard = screen.getByRole('link', { name: /reading/i });
    expect(readingCard).toHaveAttribute('href', '/student/missions/reading');
  });
});
```

- [ ] **Step 2: Create PillarCard component**

Create `frontend/components/student/PillarCard.tsx`:

```typescript
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Edit3, Headphones, Mic } from 'lucide-react';

interface PillarCardProps {
  pillar: 'reading' | 'writing' | 'listening' | 'speaking';
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export default function PillarCard({ pillar, icon, color, bgColor }: PillarCardProps) {
  const pillarName = pillar.charAt(0).toUpperCase() + pillar.slice(1);

  return (
    <Link href={`/student/missions/${pillar}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`${bgColor} rounded-2xl p-8 h-64 flex flex-col items-center justify-center cursor-pointer shadow-lg transition-all hover:shadow-2xl`}
      >
        <motion.div
          initial={{ y: 0 }}
          whileHover={{ y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-white mb-4"
        >
          <div className="text-6xl">{icon}</div>
        </motion.div>
        <h2 className="text-3xl font-bold text-white text-center">{pillarName}</h2>
        <p className="text-white text-sm mt-2 opacity-90 text-center">Tap to practice</p>
      </motion.div>
    </Link>
  );
}
```

- [ ] **Step 3: Redesign missions dashboard page**

Modify `frontend/app/(student)/missions/page.tsx`:

```typescript
import PillarCard from '@/components/student/PillarCard';
import { BookOpen, Edit3, Headphones, Mic } from 'lucide-react';

export default function MissionsPage() {
  const pillars = [
    {
      id: 'reading',
      name: 'Reading',
      icon: <BookOpen size={48} />,
      bgColor: 'bg-red-600',
      color: 'text-red-600',
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: <Edit3 size={48} />,
      bgColor: 'bg-blue-600',
      color: 'text-blue-600',
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: <Headphones size={48} />,
      bgColor: 'bg-yellow-500',
      color: 'text-yellow-500',
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: <Mic size={48} />,
      bgColor: 'bg-green-600',
      color: 'text-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Learning Missions</h1>
        <p className="text-gray-600 mb-12">Choose a pillar to start practicing</p>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pillars.map((pillar) => (
            <PillarCard
              key={pillar.id}
              pillar={pillar.id as 'reading' | 'writing' | 'listening' | 'speaking'}
              icon={pillar.icon}
              color={pillar.color}
              bgColor={pillar.bgColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `cd frontend && npm test -- __tests__/missions.test.tsx`
Expected: PASS – dashboard renders 4 cards with correct colors and links.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/(student)/missions/page.tsx
git add frontend/components/student/PillarCard.tsx
git add frontend/__tests__/missions.test.tsx
git commit -m "feat: redesign missions dashboard as 2x2 pillar grid with colors and animations"
```

---

### Task 6: Frontend – Create Gameplay Route with Timer & Question Display

**Files:**
- Create: `frontend/app/(student)/missions/[pillar]/page.tsx`
- Create: `frontend/components/student/MissionGameplay.tsx`
- Create: `frontend/components/student/QuestionTimer.tsx`
- Create: `frontend/__tests__/mission-gameplay.test.tsx`

- [ ] **Step 1: Write test for gameplay timer**

Create `frontend/__tests__/mission-gameplay.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import QuestionTimer from '@/components/student/QuestionTimer';

describe('QuestionTimer', () => {
  jest.useFakeTimers();

  it('should count down from 15 seconds', async () => {
    const onTimeUp = jest.fn();
    render(<QuestionTimer initialSeconds={15} onTimeUp={onTimeUp} />);

    expect(screen.getByText('15')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('should call onTimeUp when timer reaches zero', async () => {
    const onTimeUp = jest.fn();
    render(<QuestionTimer initialSeconds={2} onTimeUp={onTimeUp} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(onTimeUp).toHaveBeenCalled();
    });
  });

  it('should show red progress bar when < 5 seconds', () => {
    const { container } = render(<QuestionTimer initialSeconds={4} onTimeUp={() => {}} />);
    const progressBar = container.querySelector('[class*="bg-red"]');
    expect(progressBar).toBeInTheDocument();
  });

  jest.useRealTimers();
});
```

- [ ] **Step 2: Create QuestionTimer component**

Create `frontend/components/student/QuestionTimer.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface QuestionTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

export default function QuestionTimer({ initialSeconds, onTimeUp }: QuestionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft === 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const percentage = (secondsLeft / initialSeconds) * 100;
  const isLowTime = secondsLeft <= 5;

  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${
            isLowTime ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`text-3xl font-bold ${isLowTime ? 'text-red-600' : 'text-green-600'}`}>
        {secondsLeft}s
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create MissionGameplay component**

Create `frontend/components/student/MissionGameplay.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import QuestionTimer from './QuestionTimer';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface Question {
  id: string;
  pillar: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  type: string;
}

interface MissionGameplayProps {
  pillar: string;
  questions: Question[];
  onComplete: (results: GameResult[]) => void;
}

interface GameResult {
  question_id: string;
  is_correct: boolean;
  time_remaining: number;
}

export default function MissionGameplay({ pillar, questions, onComplete }: MissionGameplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleTimeUp = () => {
    handleAnswer(null);
  };

  const handleAnswer = (answer: string | null) => {
    const isCorrect = answer === currentQuestion.correct_answer;

    const result: GameResult = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      time_remaining: timeRemaining,
    };

    setResults([...results, result]);
    setShowFeedback(true);
    setSelectedAnswer(answer);

    // Show feedback for 2 seconds, then advance
    setTimeout(() => {
      if (isLastQuestion) {
        onComplete([...results, result]);
      } else {
        setCurrentIndex(currentIndex + 1);
        setShowFeedback(false);
        setSelectedAnswer(null);
        setTimeRemaining(15);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((currentIndex + 1) / questions.length * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentIndex + 1) / questions.length * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <QuestionTimer initialSeconds={15} onTimeUp={handleTimeUp} />

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-8 shadow-lg mb-8 flex-1"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentQuestion.question_text}</h2>

          {currentQuestion.options ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isCorrect = option === currentQuestion.correct_answer;
                const isSelected = option === selectedAnswer;

                let buttonClass = 'bg-white border-2 border-gray-300 text-gray-800';
                if (showFeedback) {
                  if (isCorrect) {
                    buttonClass = 'bg-green-100 border-2 border-green-500 text-green-800';
                  } else if (isSelected && !isCorrect) {
                    buttonClass = 'bg-red-100 border-2 border-red-500 text-red-800';
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={!showFeedback ? { scale: 1.02 } : {}}
                    whileTap={!showFeedback ? { scale: 0.98 } : {}}
                    onClick={() => !showFeedback && handleAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full p-4 rounded-lg font-semibold text-lg transition-all ${buttonClass} disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{option}</span>
                      {showFeedback && isCorrect && <Check className="text-green-600" size={24} />}
                      {showFeedback && isSelected && !isCorrect && <X className="text-red-600" size={24} />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <p className="mb-4">Answer: {currentQuestion.correct_answer}</p>
            </div>
          )}
        </motion.div>

        {/* Skip Button (optional) */}
        {!showFeedback && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(null)}
            className="mx-auto px-6 py-2 bg-gray-400 text-white rounded-lg font-semibold text-sm hover:bg-gray-500 transition"
          >
            Skip Question
          </motion.button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create pillar gameplay page**

Create `frontend/app/(student)/missions/[pillar]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MissionGameplay from '@/components/student/MissionGameplay';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export default function PillarMissionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const pillar = params.pillar as string;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user?.id || !user?.classroom_id) {
        setError('User not logged in');
        return;
      }

      try {
        const response = await axios.get('/api/v1/missions', {
          params: {
            student_id: user.id,
            classroom_id: user.classroom_id,
            pillar: pillar,
          },
        });

        setQuestions(response.data.questions);
      } catch (err) {
        setError('Failed to load questions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [pillar, user]);

  const handleComplete = async (results: any[]) => {
    try {
      // Log results to backend
      await axios.post('/api/v1/interactions', {
        student_id: user?.id,
        classroom_id: user?.classroom_id,
        pillar: pillar,
        results: results,
      });

      // Show results page
      router.push(`/student/missions/${pillar}/results`);
    } catch (err) {
      console.error('Failed to save results', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'No questions available'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <MissionGameplay pillar={pillar} questions={questions} onComplete={handleComplete} />;
}
```

- [ ] **Step 5: Run tests**

Run: `cd frontend && npm test -- __tests__/mission-gameplay.test.tsx`
Expected: PASS – timer counts down and triggers callback.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/(student)/missions/[pillar]/page.tsx
git add frontend/components/student/MissionGameplay.tsx
git add frontend/components/student/QuestionTimer.tsx
git add frontend/__tests__/mission-gameplay.test.tsx
git commit -m "feat: implement mission gameplay with 15-second timer and pillar-specific questions"
```

---

### Task 7: Backend – Interactions Endpoint to Log Game Results

**Files:**
- Create/Modify: `backend/app/api/v1/endpoints/interactions.py`
- Modify: `backend/app/models.py` (Student Interaction model)
- Modify: `backend/tests/test_missions.py` (add result logging test)

- [ ] **Step 1: Read StudentInteraction model**

Check `backend/app/models.py` for the StudentInteraction schema. Ensure it has fields for `pillar`, `is_correct`, and `time_remaining`.

- [ ] **Step 2: Write test for logging game results**

Update `backend/tests/test_missions.py`:

```python
@pytest.mark.asyncio
async def test_log_mission_results():
    """Test that gameplay results are logged to student_interactions."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        results = [
            {
                "question_id": "q1",
                "is_correct": True,
                "time_remaining": 8,
            },
            {
                "question_id": "q2",
                "is_correct": False,
                "time_remaining": 0,
            },
        ]

        response = await client.post(
            "/api/v1/interactions",
            json={
                "student_id": "student-123",
                "classroom_id": "class-456",
                "pillar": "reading",
                "results": results,
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["logged_interactions"] == 2
        assert data["correct_count"] == 1
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest tests/test_missions.py::test_log_mission_results -v`
Expected: FAIL – endpoint does not exist.

- [ ] **Step 4: Create interactions endpoint**

Create or modify `backend/app/api/v1/endpoints/interactions.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from datetime import datetime
from pydantic import BaseModel
from app.db import get_db
from app.models import StudentInteraction

router = APIRouter(prefix="/interactions", tags=["interactions"])

class GameResult(BaseModel):
    question_id: str
    is_correct: bool
    time_remaining: int

class LogInteractionsRequest(BaseModel):
    student_id: str
    classroom_id: str
    pillar: str
    results: list[GameResult]

@router.post("", status_code=201)
async def log_mission_results(
    request: LogInteractionsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Log game results to student_interactions table."""

    if not request.results:
        raise HTTPException(status_code=400, detail="No results provided")

    interactions = []
    for idx, result in enumerate(request.results):
        interaction = StudentInteraction(
            student_id=request.student_id,
            classroom_id=request.classroom_id,
            question_id=result.question_id,
            pillar=request.pillar,
            is_correct=result.is_correct,
            time_spent=15 - result.time_remaining,  # 15 second timer - time left
            created_at=datetime.utcnow(),
        )
        interactions.append(interaction)

    # Insert all interactions
    stmt = insert(StudentInteraction).values([
        {
            "student_id": i.student_id,
            "classroom_id": i.classroom_id,
            "question_id": i.question_id,
            "pillar": i.pillar,
            "is_correct": i.is_correct,
            "time_spent": i.time_spent,
            "created_at": i.created_at,
        }
        for i in interactions
    ])

    await db.execute(stmt)
    await db.commit()

    # Calculate stats
    correct_count = sum(1 for r in request.results if r.is_correct)

    return {
        "logged_interactions": len(request.results),
        "correct_count": correct_count,
        "accuracy": correct_count / len(request.results) if request.results else 0,
        "pillar": request.pillar,
    }
```

- [ ] **Step 5: Run test**

Run: `cd backend && pytest tests/test_missions.py::test_log_mission_results -v`
Expected: PASS – interactions logged and stats returned.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/interactions.py
git add backend/tests/test_missions.py
git commit -m "feat: add interactions endpoint to log mission gameplay results"
```

---

### Task 8: Integration Test – End-to-End Mission Flow

**Files:**
- Modify: `backend/tests/test_missions.py`

- [ ] **Step 1: Write end-to-end backend test**

Update `backend/tests/test_missions.py`:

```python
@pytest.mark.asyncio
async def test_complete_mission_flow():
    """Test complete flow: fetch classroom, get questions, log results."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Step 1: Classroom exists with current_week_topic
        classroom_response = await client.get("/api/v1/classrooms/class-456")
        assert classroom_response.status_code == 200
        assert "current_week_topic" in classroom_response.json()

        # Step 2: Fetch missions for reading pillar
        missions_response = await client.get(
            "/api/v1/missions",
            params={
                "student_id": "student-e2e",
                "classroom_id": "class-456",
                "pillar": "reading"
            }
        )
        assert missions_response.status_code == 200
        questions = missions_response.json()["questions"]
        assert len(questions) == 10

        # Step 3: Log some results
        results = [
            {"question_id": q["id"], "is_correct": True, "time_remaining": 10}
            for q in questions[:5]
        ] + [
            {"question_id": q["id"], "is_correct": False, "time_remaining": 0}
            for q in questions[5:]
        ]

        log_response = await client.post(
            "/api/v1/interactions",
            json={
                "student_id": "student-e2e",
                "classroom_id": "class-456",
                "pillar": "reading",
                "results": results
            }
        )
        assert log_response.status_code == 201
        assert log_response.json()["correct_count"] == 5
```

- [ ] **Step 2: Run full backend test suite**

Run: `cd backend && pytest tests/test_missions.py -v`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_missions.py
git commit -m "test: add end-to-end mission flow integration test"
```

---

### Task 9: Update API Router to Include New Endpoints

**Files:**
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Read current router**

Check `backend/app/api/v1/router.py` to see how endpoints are registered.

- [ ] **Step 2: Add missions and interactions routers**

In `backend/app/api/v1/router.py`, add:

```python
from app.api.v1.endpoints import missions, interactions

# Add these routers to the main router
router.include_router(missions.router)
router.include_router(interactions.router)
```

- [ ] **Step 3: Verify endpoints are registered**

Run: `cd backend && python -c "from app.main import app; from fastapi.openapi.utils import get_openapi; print([r.path for r in app.routes])"`
Expected: Both `/api/v1/missions` and `/api/v1/interactions` are listed.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/router.py
git commit -m "refactor: register missions and interactions endpoints in router"
```

---

### Task 10: Manual Testing & Verification

**Files:** None (verification only)

- [ ] **Step 1: Start backend server**

Run: `cd backend && uvicorn app.main:app --reload`
Expected: Server starts on `http://localhost:8000`

- [ ] **Step 2: Verify missions endpoint with curl**

Run: `curl "http://localhost:8000/api/v1/missions?student_id=test&classroom_id=class1&pillar=reading"`
Expected: Returns JSON with 10 questions, current_week_topic, and pillar field.

- [ ] **Step 3: Verify classroom PATCH endpoint**

Run: `curl -X PATCH http://localhost:8000/api/v1/classrooms/class1 -H "Content-Type: application/json" -d '{"current_week_topic": "Week 3: Verbs"}'`
Expected: Classroom updated successfully.

- [ ] **Step 4: Start frontend dev server**

In new terminal: `cd frontend && npm run dev`
Expected: Server starts on `http://localhost:3000`

- [ ] **Step 5: Navigate to missions dashboard**

Visit `http://localhost:3000/student/missions`
Expected: 4 large colored cards render (Reading/red, Writing/blue, Listening/yellow, Speaking/green).

- [ ] **Step 6: Click on a pillar card**

Click the "Reading" card.
Expected: Navigate to `/student/missions/reading` and questions load with a 15-second timer.

- [ ] **Step 7: Answer a question**

Select an answer before timer runs out.
Expected: Answer highlighted, feedback shown for 2 seconds, next question loads.

- [ ] **Step 8: Let timer run out**

Wait for timer to hit 0.
Expected: Automatically marked incorrect, correct answer highlighted, advances to next question.

- [ ] **Step 9: Complete all 10 questions**

Answer (or skip) all questions.
Expected: Redirects to results page (or shows completion message).

- [ ] **Step 10: Verify data in Supabase**

Login to Supabase dashboard → Tables → `student_interactions`
Expected: Rows logged with `student_id`, `pillar`, `is_correct`, `time_spent` for each question answered.

- [ ] **Step 11: Commit final verification**

```bash
git add -A
git commit -m "test: manual verification of 4-pillar mission system complete"
```

---

## Spec Coverage ✅

✅ STEP 1 – Database & Backend State
✅ STEP 2 – Adaptive Mission Generator
✅ STEP 3 – 4-Pillar Kahoot Dashboard UI
✅ STEP 4 – Gameplay UI & 15-Second Timer
✅ Supporting Tasks (Integration, Router, Verification)
