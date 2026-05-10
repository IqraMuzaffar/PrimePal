# React Query Hooks

All data fetching uses TanStack React Query via custom hooks. Hooks are organized by role: student, teacher, and admin.

---

## Query Client -- `frontend/lib/query-client.ts`

Singleton factory with SSR safety.

```typescript
function makeQueryClient(): QueryClient
// Default options: staleTime 5min, retry 1, refetchOnWindowFocus false

export function getQueryClient(): QueryClient
// Returns a new client on server, reuses a singleton on browser
```

## Query Provider -- `frontend/lib/query-provider.tsx`

```typescript
export function QueryProvider({ children }: { children: React.ReactNode })
```

Client component that wraps the app tree in `QueryClientProvider` using the singleton from `getQueryClient()`.

---

## Student Hooks -- `frontend/lib/hooks/queries.ts`

### Query Keys

```typescript
export const queryKeys = {
  studentProfile:   ["studentProfile"],
  streak:           ["streak"],
  dailySummary:     ["dailySummary"],
  rewardStatus:     ["rewardStatus"],
  achievements:     ["achievements"],
  announcement:     (classroomId: string) => ["announcement", classroomId],
  leaderboard:      (classroomId: string) => ["leaderboard", classroomId],
  studentLeaderboard: ["studentLeaderboard"],
  spellingWords:    ["spellingWords"],
  storyTime:        ["storyTime"],
  speakingPrompts:  ["speakingPrompts"],
  evalStatus:       ["evalStatus"],
  evalQuestions:    (type: string) => ["evalQuestions", type],
  missionPillar:    (pillar: string) => ["missionPillar", pillar],
};
```

### Interfaces (defined in queries.ts)

```typescript
export interface StudentProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
  missions_completed: number;
  avatar_style: string;
  theme_color: string;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface DailySummary {
  today_points: number;
  total_points: number;
  missions_today: number;
}

export interface RewardStatus {
  has_claimed_today: boolean;
  last_claimed_at: string | null;
}

export interface AchievementProgress {
  id: string;
  name: string;
  description: string;
  description_ur: string;
  icon: string;
  tier: string;
  threshold_type: string;
  threshold_value: number;
  unlocked: boolean;
  unlocked_at: string | null;
  current_progress: number;
}

export interface AchievementsResponse {
  achievements: AchievementProgress[];
}

export interface Announcement {
  id: string;
  classroom_id: string | null;
  teacher_id: string;
  message_en: string;
  message_ur: string;
  scope: string;
  target_grade_level: null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
  is_current_student: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  current_student_rank: number;
  total_students: number;
}
```

### Hook Reference

| Hook | Endpoint | Return Type | staleTime | Notes |
|------|----------|-------------|-----------|-------|
| `useStudentProfile()` | `GET /missions/me` | `StudentProfile` | 5 min | |
| `useStreak()` | `GET /rewards/streak` | `StreakData` | 5 min | |
| `useDailySummary()` | `GET /rewards/daily-summary` | `DailySummary` | 5 min | |
| `useRewardStatus()` | `GET /rewards/status` | `RewardStatus` | 2 min | |
| `useAchievements()` | `GET /achievements/me` | `AchievementsResponse` | 5 min | |
| `useAnnouncement()` | `GET /announcements/{classroomId}/active` | `Announcement \| null` | 10 min | Enabled only when `classroomId` exists |
| `useLeaderboard(classroomId)` | `GET /missions/leaderboard` | `LeaderboardResponse` | 1 min | Enabled only when `classroomId` exists |
| `useStudentLeaderboard()` | `GET /missions/leaderboard` | `LeaderboardResponse` | 1 min | |
| `useSpellingWords()` | `GET /spelling-bee/words` | `WordsResponse` | 10 min | |
| `useStoryTime()` | `GET /story-time/story` | `StoryData` | 10 min | |
| `useSpeakingPrompts()` | `GET /speaking/prompts` | `PromptsData` | 10 min | |
| `useEvalStatus()` | `GET /evaluations/status` | `EvalStatus` | 2 min | |
| `useEvalQuestions(type)` | `GET /evaluations/questions?type={type}` | `EvalQuestion[]` | 10 min | `type` is `"pre"` or `"post"`, enabled only when non-null |
| `useMissionPillar(pillar)` | `GET /missions/pillar?pillar={pillar}` | `{ questions: MissionQuestion[] }` | 5 min | Enabled only when `pillar` is truthy |
| `useClassroomId()` | -- | `string \| null` | -- | Utility; reads from JWT via `getStudentClassroomId()` |

### Internal-only Interfaces (not exported)

```typescript
interface SpellingWord { word: string; emoji: string; }
interface WordsResponse { words: SpellingWord[]; topic: string; week_number: number; }
interface ComprehensionQuestion { id: number; question: string; options: string[]; correct_index: number; }
interface StoryData { story_title: string; story_text: string; topic: string; week_number: number; questions: ComprehensionQuestion[]; }
interface SpeakingPrompt { id: number; prompt: string; hint: string; }
interface PromptsData { prompts: SpeakingPrompt[]; topic: string; week_number: number; }
interface EvalStatus { needs_pre_test: boolean; needs_post_test: boolean; pre_completed: boolean; post_completed: boolean; }
interface EvalQuestion {
  id: string; section: string; pillar: string | null; question_index: number;
  question_text: string; question_text_ur: string | null; task_type: string;
  options: Array<{ label: string; value: string; emoji?: string }> | null;
  audio_text: string | null;
}
```

---

## Student Mutations -- `frontend/lib/hooks/mutations.ts`

### `useClaimReward()`

- **Endpoint:** `POST /rewards/claim-daily`
- **Body:** `{}`
- **Return type:** `DailyReward`
- **Invalidates:** `rewardStatus`, `dailySummary`, `studentProfile`

```typescript
interface DailyReward {
  reward_type: string;
  amount: number;
  new_total: number;
  message: string;
  new_achievements: unknown[];
}
```

### `useMissionComplete()`

- **Endpoint:** `POST /missions/complete`
- **Body:** `CompleteRequest`
- **Return type:** `CompleteResponse`
- **Invalidates:** `studentProfile`, `streak`, `achievements`, `dailySummary`

```typescript
interface CompleteRequest {
  question_correct: boolean;
  question_type?: string;
  task_type?: string;
  pillar?: string;
  points_value?: number;
  answer_data?: Record<string, unknown>;
  submitted_at?: string;
}

interface CompleteResponse {
  points_awarded: number;
  new_total: number;
  current_streak: number;
}
```

---

## Teacher Hooks -- `frontend/lib/hooks/teacher-queries.ts`

### Query Keys

```typescript
export const teacherQueryKeys = {
  classrooms:     ["teacher", "classrooms"],
  classroom:      (id: string) => ["teacher", "classroom", id],
  announcements:  (classroomId: string) => ["teacher", "announcements", classroomId],
  topics:         (grade: number) => ["teacher", "topics", grade],
  missionReport:  (classroomId: string) => ["teacher", "missionReport", classroomId],
  dashboardStats: (params: string) => ["teacher", "dashboardStats", params],
  skillAccuracy:  (grade?: number) => ["teacher", "skillAccuracy", grade ?? "all"],
  students:       (params: string) => ["teacher", "students", params],
  syllabus:       (classroomId: string) => ["teacher", "syllabus", classroomId],
};
```

### Interfaces

```typescript
export interface TeacherClassroom {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  section?: string;
  current_week_topic?: string;
}

export interface StudentRow {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  avatar_url: string | null;
  classroom_id: string;
  classroom_name: string;
  grade_level: number;
  total_points: number;
  total_interactions: number;
  mission_accuracy_pct: number;
  active_this_week: boolean;
}

export interface SyllabusWeek {
  id: string;
  week_number: number;
  topic_title: string;
  status: "locked" | "active" | "completed";
}

export interface TeacherDailyPlan {
  summary: string;
  focus_areas: Array<{ topic: string; pillar: string; reason: string }>;
  suggested_activities: Array<{
    title: string; description: string;
    target_pillar: string; estimated_minutes: number;
  }>;
  student_groups: Array<{
    group_name: string; student_names: string[]; recommendation: string;
  }>;
  snc_references: string[];
  generated_at: string;
}

export interface TeacherAnnouncement {
  id: string;
  classroom_id: string | null;
  teacher_id: string;
  message_en: string;
  message_ur: string;
  scope: "classroom" | "grade_level" | "school_wide";
  target_grade_level: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeTopicItem {
  topic_id: number;
  topic_name: string;
  skill: string;
  is_active: boolean;
}

export interface GradeSelectionsResponse {
  grade_level: number;
  topics: GradeTopicItem[];
}

export interface ClassroomMissionReport {
  classroom_id: string;
  grade_level: number;
  students: Array<{
    student_id: string; student_name: string;
    avatar_url: string | null; roll_number: string | null;
    total_interactions: number; mission_accuracy_pct: number;
  }>;
}

export interface DashboardStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
  active_this_week: number;
}

export interface SkillAccuracy {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
  active_today: number;
}
```

### Teacher Query Hooks

| Hook | Endpoint | Return Type | staleTime | Notes |
|------|----------|-------------|-----------|-------|
| `useTeacherClassrooms()` | `GET /classroom/` | `TeacherClassroom[]` | 2 min | |
| `useTeacherClassroom(id)` | `GET /classroom/{id}` | `TeacherClassroom & { students: ... }` | 2 min | Enabled when `id` truthy |
| `useTeacherAnnouncements(classroomId)` | `GET /announcements/classroom/{classroomId}` | `{ announcements: TeacherAnnouncement[]; total_count: number }` | 1 min | Enabled when `classroomId` exists |
| `useTeacherTopics(grade)` | `GET /topics/grade-selections/{grade}` | `GradeSelectionsResponse` | 2 min | |
| `useClassroomMissionReport(classroomId)` | `GET /evaluator/report/classroom/{classroomId}` | `ClassroomMissionReport` | 2 min | Enabled when `classroomId` exists |
| `useTeacherDashboardStats({ gradeLevel?, pillar? })` | `GET /evaluator/dashboard-stats?...` | `DashboardStats` | 2 min | Builds query string from params |
| `useTeacherSkillAccuracy(gradeLevel?)` | `GET /evaluator/skill-accuracy?...` | `SkillAccuracy` | 2 min | |
| `useTeacherStudents({ gradeLevel?, pillar?, search? })` | `GET /evaluator/students?...` | `{ students: StudentRow[] }` | 2 min | Builds query string from params |
| `useTeacherSyllabus(classroomId)` | `GET /classroom/{classroomId}/syllabus` | `{ weeks: SyllabusWeek[] }` | 2 min | Enabled when `classroomId` truthy |

### Teacher Mutations

| Hook | Endpoint | Method | Invalidates |
|------|----------|--------|-------------|
| `useCreateAnnouncement()` | `POST /announcements/` | POST | `announcements(classroomId)` |
| `useToggleAnnouncement()` | `PATCH /announcements/{id}/toggle` | PATCH | `announcements(classroomId)` |
| `useSaveTopics()` | `PUT /topics/grade-selections/{grade}` | PUT | `topics(grade)` |
| `useGenerateDailyPlan()` | `POST /evaluator/teacher-assistant/daily-plan` | POST | -- (returns `TeacherDailyPlan`) |
| `useUnlockNextWeek(classroomId)` | `PATCH /classroom/{id}/syllabus/{weekNumber}` (x2) | PATCH | `syllabus(classroomId)` |

`useUnlockNextWeek` performs two sequential PATCH calls: first marks the active week as `"completed"`, then marks the next week as `"active"`.

---

## Admin Hooks -- `frontend/lib/hooks/admin-queries.ts`

### Query Keys

```typescript
export const adminQueryKeys = {
  classrooms:  ["admin", "classrooms"],
  teachers:    ["admin", "teachers"],
  students:    ["admin", "students"],
  books:       ["admin", "books"],
  evalResults: ["admin", "evalResults"],
};
```

### Interfaces

```typescript
export interface AdminClassroom {
  id: string;
  class_name: string;
  grade_level: number;
  section?: string;
  class_code: string;
  teacher_id: string;
  teachers?: { full_name: string };
  student_count?: number;
}

export interface AdminTeacher {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface AdminStudent {
  id: string;
  student_name: string;
  roll_number?: string;
  email?: string;
  classroom_id: string;
  classroom_name: string;
  grade_level: number | null;
  secret_pin?: string;
}

export interface AdminBook {
  id: string;
  filename: string;
  grade_level: number;
  book_title: string;
  total_chunks: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface EvalResult {
  student_id: string;
  student_name: string | null;
  evaluation_type: string;
  total: number;
  correct: number;
  psychometric_avg: number | null;
}

export interface EvalResultsResponse {
  results: EvalResult[];
}
```

### Admin Query Hooks

| Hook | Endpoint | Return Type | staleTime |
|------|----------|-------------|-----------|
| `useAdminClassrooms()` | `GET /admin/classrooms` | `AdminClassroom[]` | 1 min |
| `useAdminTeachers()` | `GET /admin/teachers` | `AdminTeacher[]` | 1 min |
| `useAdminStudents()` | `GET /admin/students` | `AdminStudent[]` | 1 min |
| `useAdminBooks()` | `GET /admin/curriculum/books` | `AdminBook[]` | 30 sec |
| `useAdminEvalResults()` | `GET /evaluations/results` | `EvalResultsResponse` | 1 min |

### Admin Mutations

| Hook | Endpoint | Method | Body | Invalidates |
|------|----------|--------|------|-------------|
| `useCreateAdminClassroom()` | `POST /admin/classrooms` | POST | `Record<string, unknown>` | `classrooms`, `students` |
| `useUpdateAdminClassroom()` | `PUT /admin/classrooms/{id}` | PUT | `{ id, body }` | `classrooms` |
| `useDeleteAdminClassroom()` | `DELETE /admin/classrooms/{id}` | DELETE | `id: string` | `classrooms`, `students` |
| `useCreateAdminStudent()` | `POST /admin/students` | POST | `Record<string, unknown>` | `students` |
| `useUpdateAdminStudent()` | `PUT /admin/students/{id}` | PUT | `{ id, body }` | `students` |
| `useDeleteAdminStudent()` | `DELETE /admin/students/{id}` | DELETE | `id: string` | `students` |
| `useResetStudentPin()` | `POST /admin/students/{id}/reset-pin` | POST | `id: string` | `students` |
| `useInviteAdmin()` | `POST /admin/invite-code` | POST | `{ email, expires_in_days }` | -- |
| `useUpdateAdminTeacher()` | `PUT /admin/teachers/{id}` | PUT | `{ id, body }` | `teachers` |
| `useDeleteAdminTeacher()` | `DELETE /admin/teachers/{id}` | DELETE | `{ id, body }` | `teachers`, `classrooms` |
| `useTriggerPostTest()` | `POST /evaluations/trigger-post-test` | POST | `Record<string, string>` | `evalResults` |
