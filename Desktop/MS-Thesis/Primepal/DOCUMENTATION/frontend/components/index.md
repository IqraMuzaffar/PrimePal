# Frontend Components

Reusable components organized by domain.

## Student Components (`components/student/`)

| Component | Description |
|-----------|-------------|
| `AnimatedBackground.tsx` | Animated gradient background for student pages |
| `AudioProvider.tsx` | Background music provider (plays `/sounds/bgm.wav`) |
| `AvatarCustomizeModal.tsx` | Modal for customizing student avatar |
| `DailyChestModal.tsx` | Interactive daily reward chest animation |
| `DynamicBackground.tsx` | Day/night cycle + 3-tier journey visual system |
| `MissionsDashboard.tsx` | Four-pillar mission selection UI |
| `MissionGameplay.tsx` | Active mission question interface |
| `PillarCard.tsx` | Individual pillar card (reading/writing/listening/speaking) |
| `QuestionTimer.tsx` | 15-second countdown timer for mission questions |
| `SpeakingPronunciationFeedback.tsx` | Word-level pronunciation accuracy visualization |

## Teacher Components (`components/teacher/`)

| Component | Description |
|-----------|-------------|
| `TeacherShell.tsx` | Main layout wrapper with sidebar navigation |
| `TabbedDashboard.tsx` | Tab-based dashboard container |
| `TabNavigation.tsx` | Tab navigation component |
| `SearchBar.tsx` | Reusable search input |
| `CreateClassroomModal.tsx` | Modal: create new classroom (name + grade) |
| `BulkAddStudentsModal.tsx` | Modal: bulk add students via comma/newline names |
| `EditStudentModal.tsx` | Modal: edit student details |
| `FileUploadZone.tsx` | Drag-drop PDF upload with 3-phase progress |
| `UploadBookModal.tsx` | Modal: upload SNC textbook with metadata |
| `AnalyticsOverview.tsx` | Global analytics summary view |
| `AnalyticsByGrade.tsx` | Analytics broken down by grade level |
| `AnalyticsByClass.tsx` | Analytics broken down by classroom |
| `AnalyticsByStudent.tsx` | Per-student analytics detail |
