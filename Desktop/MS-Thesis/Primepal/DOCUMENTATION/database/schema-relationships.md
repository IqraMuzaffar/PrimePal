# Schema Relationships & Foreign Key Map

## Entity Relationship Diagram (Text)

```
auth.users (Supabase managed)
  |
  +--< teachers.id (PK, FK -> auth.users.id)
  |      |
  |      +--< classrooms.teacher_id (ON DELETE CASCADE)
  |      |      |
  |      |      +--< students.classroom_id (ON DELETE CASCADE)
  |      |      |      |
  |      |      |      +--< student_achievements.student_id (ON DELETE CASCADE)
  |      |      |      +--< evaluation_records.student_id (ON DELETE CASCADE)
  |      |      |      +--< evaluation_status.student_id (PK, ON DELETE CASCADE)
  |      |      |
  |      |      +--< classroom_syllabus.classroom_id (ON DELETE CASCADE)
  |      |      +--< classroom_active_topics.classroom_id (composite PK, ON DELETE CASCADE)
  |      |      +--< announcements.classroom_id (nullable, ON DELETE CASCADE)
  |      |
  |      +--< announcements.teacher_id (ON DELETE CASCADE)
  |      +--< admin_invite_codes.created_by (ON DELETE SET NULL)
  |      +--< admin_audit_log.admin_id (ON DELETE SET NULL)
  |
  snc_topics.id (SERIAL PK)
     |
     +--< classroom_active_topics.topic_id (composite PK, ON DELETE CASCADE)
     +--< grade_topic_selections.topic_id (ON DELETE CASCADE)
  
  achievements.id (UUID PK)
     |
     +--< student_achievements.achievement_id (ON DELETE CASCADE)
  
  evaluation_questions.id (UUID PK)
     |
     +--< evaluation_records.question_id

  -- Standalone tables (no FK references to them):
  --   student_interactions (student_id, classroom_id are NOT FK-constrained)
  --   snc_knowledge_base
  --   snc_uploads (teacher_id is NOT FK-constrained)
```

## Foreign Key Reference

| Source Table | Column | References | On Delete |
|-------------|--------|------------|-----------|
| `teachers` | `id` | `auth.users(id)` | (default -- no explicit ON DELETE) |
| `classrooms` | `teacher_id` | `teachers(id)` | CASCADE |
| `students` | `classroom_id` | `classrooms(id)` | CASCADE |
| `student_achievements` | `student_id` | `students(id)` | CASCADE |
| `student_achievements` | `achievement_id` | `achievements(id)` | CASCADE |
| `classroom_syllabus` | `classroom_id` | `classrooms(id)` | CASCADE |
| `classroom_active_topics` | `classroom_id` | `classrooms(id)` | CASCADE |
| `classroom_active_topics` | `topic_id` | `snc_topics(id)` | CASCADE |
| `grade_topic_selections` | `topic_id` | `snc_topics(id)` | CASCADE |
| `announcements` | `classroom_id` | `classrooms(id)` | CASCADE |
| `announcements` | `teacher_id` | `teachers(id)` | CASCADE |
| `admin_invite_codes` | `created_by` | `teachers(id)` | SET NULL |
| `admin_audit_log` | `admin_id` | `teachers(id)` | SET NULL |
| `evaluation_records` | `student_id` | `students(id)` | CASCADE |
| `evaluation_records` | `question_id` | `evaluation_questions(id)` | (default -- no explicit ON DELETE) |
| `evaluation_status` | `student_id` | `students(id)` | CASCADE |

### Tables Without FK Constraints

The following tables have columns that logically reference other tables but do **not** have SQL-level FK constraints:

| Table | Column | Logical Reference |
|-------|--------|-------------------|
| `student_interactions` | `student_id` | `students(id)` |
| `student_interactions` | `classroom_id` | `classrooms(id)` |
| `snc_uploads` | `teacher_id` | `teachers(id)` (Supabase auth UID) |

## Key Relationship Patterns

### Teacher -> Classroom -> Student (Ownership Chain)

The primary ownership chain. A teacher owns classrooms via `teacher_id`. Classrooms contain students via `classroom_id`. Deleting a teacher cascades through classrooms to students and all their dependent data (achievements, evaluations).

### Student Activity Hub

`students` is the central entity for activity tracking:
- `student_achievements` -- unlocked badges
- `evaluation_records` -- pre/post test answers
- `evaluation_status` -- test completion state
- `student_interactions` -- all AI interaction logs (logical FK only, no DB constraint)

### Dual Topic Systems

Topics are managed at two levels:
1. **Classroom-level**: `classroom_active_topics` links classrooms to specific `snc_topics`. If no rows exist for a classroom, ALL grade topics are treated as active.
2. **Grade-level**: `grade_topic_selections` links grade levels to `snc_topics` for school-wide defaults. This is a global override layer.

### Evaluation Isolation

The evaluation system (`evaluation_questions`, `evaluation_records`, `evaluation_status`) is intentionally separate from the gamification system. Pre/post test data does not flow into points, achievements, or streaks.

### Announcements Scoping

Announcements can be scoped to:
- A single classroom: `classroom_id` set, `scope = 'classroom'`
- A grade level: `classroom_id` NULL, `scope = 'grade_level'`, `target_grade_level` set
- School-wide: `classroom_id` NULL, `scope = 'school_wide'`

## Unique Constraints

| Table | Constraint Name | Columns |
|-------|----------------|---------|
| `teachers` | (from `email` column) | `email` (UNIQUE) |
| `classrooms` | (from `class_code` column) | `class_code` (UNIQUE) |
| `classrooms` | `unique_teacher_grade_section` | `(teacher_id, grade_level, class_name)` |
| `admin_invite_codes` | (from `code` column) | `code` (UNIQUE) |
| `classroom_syllabus` | (unnamed) | `(classroom_id, week_number)` |
| `classroom_active_topics` | (composite PK) | `(classroom_id, topic_id)` |
| `student_achievements` | (unnamed) | `(student_id, achievement_id)` |
| `grade_topic_selections` | (unnamed) | `(grade_level, topic_id)` |

## Cascade Deletion Chain

Deleting a **teacher** triggers the following cascade:
1. `classrooms` where `teacher_id` matches are deleted
2. `students` in those classrooms are deleted
3. `student_achievements` for those students are deleted
4. `evaluation_records` for those students are deleted
5. `evaluation_status` for those students is deleted
6. `classroom_syllabus` for those classrooms is deleted
7. `classroom_active_topics` for those classrooms is deleted
8. `announcements` for those classrooms/teacher are deleted

Deleting an **snc_topic** triggers:
1. `classroom_active_topics` referencing that topic are deleted
2. `grade_topic_selections` referencing that topic are deleted
