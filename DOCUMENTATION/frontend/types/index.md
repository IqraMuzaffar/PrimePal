# Frontend TypeScript Types

All shared type definitions live in `frontend/types/`. These match backend Pydantic schemas and are used across components and hooks.

---

## Core Types -- `frontend/types/index.ts`

```typescript
export type UserRole = "teacher" | "student";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Classroom {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  created_at: string;
}

export interface Student {
  id: string;
  student_name: string;
  avatar_url: string;
  secret_pin: string;
  roll_number?: string | null;
  email?: string | null;
}

export type Pillar = "reading" | "writing" | "listening" | "speaking";

export interface Quest {
  id: string;
  week: number;
  grade: number;
  reading: QuestTask;
  writing: QuestTask;
  listening: QuestTask;
  speaking: QuestTask;
}

export interface QuestTask {
  pillar: Pillar;
  prompt: string;
  audio_url?: string;
}

export interface PillarScore {
  pillar: Pillar;
  score: number;
  feedback: string;
}

export interface StudentReport {
  student_id: string;
  scores: PillarScore[];
}

export interface ClassroomReport {
  classroom_id: string;
  pillar_averages: Record<Pillar, number>;
  incomplete_students: string[];
}

export interface SncTopic {
  id: number;
  grade_level: number;
  topic_name: string;
}
```

---

## Mission Types -- `frontend/types/missions.ts`

```typescript
export interface QuestionOption {
  id: string;
  text: string;
  emoji?: string;
}

export interface MissionQuestion {
  id: number;
  task_type: string;
  pillar: string;
  question: string;
  difficulty: string;
  points_value: number;
  emoji_hint: string;
  correct_answer?: string;
  options?: QuestionOption[];
  passage?: string;
  audio_text?: string;
  image_context?: string;
  image_options?: QuestionOption[];
  word_bank?: string[];
  correct_order?: string[];
  word_with_blanks?: string;
  letter_options?: string[];
  sentence_start?: string;
  urdu_hint?: string;
  // Legacy compat
  type?: string;
  question_text?: string;
}

export interface TaskProps {
  question: MissionQuestion;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  disabled: boolean;
}

export type TaskType =
  | 'sentence_picture_match' | 'odd_one_out' | 'fill_blank_word_bank'
  | 'passage_true_false' | 'sentence_scramble' | 'missing_letter'
  | 'guided_translation' | 'listen_and_choose' | 'simon_says'
  | 'listen_and_spell' | 'repeat_after_me' | 'what_is_this'
  | 'finish_the_sentence' | 'multiple_choice' | 'fill_blank';
```

### Timer Constants

```typescript
export const TIMER_SECONDS: Record<string, number> = {
  passage_true_false: 30,
  sentence_scramble: 30,
  guided_translation: 30,
  listen_and_spell: 20,
  finish_the_sentence: 20,
  repeat_after_me: 20,
};

export const DEFAULT_TIMER = 15;

export function getTimerSeconds(taskType: string): number
// Returns the task-specific timer or DEFAULT_TIMER (15s)
```

---

## Analytics Types -- `frontend/types/analytics.ts`

Used by the teacher/admin analytics dashboard.

```typescript
export interface TopStudent {
  id: string;
  name: string;
  avatarUrl: string | null;
  grade: number;
  accuracy: number;
  totalPoints: number;
}

export interface StudentTableItem {
  id: string;
  name: string;
  rollNumber: string;
  grade: number;
  className: string;
  classId: string;
  accuracy: number;
  totalPoints: number;
  avatarUrl: string | null;
}

export interface SectionInfo {
  grade: number;
  section: string;
  sectionId: string;
  studentCount: number;
  topStudentName: string;
  topStudentAccuracy: number;
}

export interface ClassroomInfo {
  id: string;
  name: string;
  grade: number;
  studentCount: number;
  avgAccuracy: number;
}

export interface SummaryStats {
  totalInteractions: number;
  totalStudents: number;
  avgAccuracy: number;
  activeClassrooms: number;
}

export interface StudentTableData {
  items: StudentTableItem[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export interface AnalyticsDashboardData {
  summaryStats: SummaryStats;
  classrooms: ClassroomInfo[];
  topStudents: TopStudent[];
  weakPointsByGrade: Record<number, string[]>;
  studentTableData: StudentTableData;
  sections: SectionInfo[];
  fetchError?: boolean;
}
```

---

## Where Types Are Defined

Note that many hooks files define their own interfaces locally rather than importing from `types/`. The breakdown:

| Location | Types defined |
|----------|---------------|
| `types/index.ts` | `UserRole`, `TokenResponse`, `Classroom`, `Student`, `Pillar`, `Quest`, `QuestTask`, `PillarScore`, `StudentReport`, `ClassroomReport`, `SncTopic` |
| `types/missions.ts` | `QuestionOption`, `MissionQuestion`, `TaskProps`, `TaskType`, `TIMER_SECONDS`, `DEFAULT_TIMER`, `getTimerSeconds()` |
| `types/analytics.ts` | `TopStudent`, `StudentTableItem`, `SectionInfo`, `ClassroomInfo`, `SummaryStats`, `StudentTableData`, `AnalyticsDashboardData` |
| `lib/hooks/queries.ts` | `StudentProfile`, `StreakData`, `DailySummary`, `RewardStatus`, `AchievementProgress`, `AchievementsResponse`, `Announcement`, `LeaderboardEntry`, `LeaderboardResponse` (plus internal-only: `SpellingWord`, `WordsResponse`, `StoryData`, etc.) |
| `lib/hooks/mutations.ts` | `DailyReward`, `CompleteResponse`, `CompleteRequest` (internal) |
| `lib/hooks/teacher-queries.ts` | `TeacherClassroom`, `StudentRow`, `SyllabusWeek`, `TeacherDailyPlan`, `TeacherAnnouncement`, `GradeTopicItem`, `GradeSelectionsResponse`, `ClassroomMissionReport`, `DashboardStats`, `SkillAccuracy` |
| `lib/hooks/admin-queries.ts` | `AdminClassroom`, `AdminTeacher`, `AdminStudent`, `AdminBook`, `EvalResult`, `EvalResultsResponse` |
| `lib/network-queue.ts` | `PendingAnswer` |
| `lib/useTeacherRole.ts` | `TeacherProfile` (internal) |
