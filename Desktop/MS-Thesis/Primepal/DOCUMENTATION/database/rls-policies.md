# Row Level Security (RLS) Policies

All public tables have RLS enabled. The backend uses the `service_role` key (via `get_supabase_admin()`) which bypasses all RLS. Policies below govern access via user JWTs and the `anon` key.

## General Patterns

- **Teachers** can read/write their own classrooms and the students within them
- **Admins** can read all teachers and classrooms (via role in JWT or teachers table lookup)
- **Students** can read/update their own record (added in migration 025)
- **Service role** (`TO service_role`) bypasses RLS entirely; explicit policies are added for clarity
- **Public/anon** access is granted only where needed (student login screen, achievement definitions)

---

## `teachers`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Admins see all teachers, teachers see self` | SELECT | authenticated | `(SELECT role FROM teachers WHERE id = auth.uid()) = 'admin' OR auth.uid() = id` |

**Note**: The original `Teachers can manage own profile` (FOR ALL, `auth.uid() = id`) was dropped in migration 014 and replaced with the admin-aware SELECT policy. Teachers can still insert/update via service role on the backend.

**Source**: 001 (original), 014 (replaced), 900 (catchup)

---

## `classrooms`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Admins see all classrooms, teachers see own` | SELECT | authenticated | `(SELECT role FROM teachers WHERE id = auth.uid()) = 'admin' OR auth.uid() = teacher_id` |
| `Public read classrooms for login` | SELECT | public | `true` |

**Note**: The original `Teachers can manage own classrooms` (FOR ALL, `auth.uid() = teacher_id`) was dropped in migration 014 and replaced with the admin-aware SELECT policy. The public read policy allows unauthenticated access for the student login screen.

**Source**: 001 (original + public read), 014 (replaced), 900 (catchup)

---

## `students`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Teachers can manage own students` | ALL | authenticated | `classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())` |
| `Public read students for login` | SELECT | public | `true` |
| `Students can read own record` | SELECT | authenticated | `id = auth.uid()` |
| `Students can update own profile` | UPDATE | authenticated | USING: `id = auth.uid()`, WITH CHECK: `id = auth.uid()` |

**Source**: 001 (teachers + public), 025 (student self-access)

---

## `student_interactions`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Teachers can read their classroom interactions` | SELECT | authenticated | `classroom_id IN (SELECT id FROM public.classrooms WHERE teacher_id = auth.uid())` |

**Note**: Inserts are done via service role (backend admin client). No INSERT policy exists for authenticated users.

**Source**: 007

---

## `snc_knowledge_base`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Allow authenticated access` | ALL | authenticated | `auth.role() = 'authenticated'` |

**Note**: Backend uses service_role key for embedding inserts, which bypasses RLS.

**Source**: 004

---

## `snc_uploads`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Teacher can insert own uploads` | INSERT | authenticated | `auth.uid() = teacher_id` |
| `Teacher can read own uploads` | SELECT | authenticated | `auth.uid() = teacher_id` |

**Note**: Admin endpoints use service_role key which bypasses RLS.

**Source**: 009

---

## `snc_topics`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `topics_select_all` | SELECT | public | `true` |

**Note**: No insert/update/delete policies. Topic management is admin-only via SQL or service role.

**Source**: 023 (snc_topics_and_active_topics)

---

## `classroom_active_topics`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `active_topics_select` | SELECT | authenticated | `classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())` |
| `active_topics_insert` | INSERT | authenticated | `classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())` |
| `active_topics_delete` | DELETE | authenticated | `classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())` |

**Source**: 023 (snc_topics_and_active_topics)

---

## `grade_topic_selections`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Authenticated users manage grade topic selections` | ALL | authenticated | USING: `true`, WITH CHECK: `true` |

**Note**: Shared account model -- all authenticated users can read and write.

**Source**: 029

---

## `classroom_syllabus`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `teacher_owns_syllabus` | ALL | authenticated | `classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())` |
| `service_role_bypass` | ALL | service_role | `true` / `true` |

**Source**: 015

---

## `announcements`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Teachers can view their own announcements` | SELECT | authenticated | `teacher_id = auth.uid()` |
| `Teachers can create announcements` | INSERT | authenticated | `teacher_id = auth.uid()` |
| `Teachers can update their own announcements` | UPDATE | authenticated | `teacher_id = auth.uid()` |
| `Teachers can delete their own announcements` | DELETE | authenticated | `teacher_id = auth.uid()` |
| `Authenticated users can view active announcements` | SELECT | authenticated | `is_active = true` |

**Note**: Original per-classroom policies from 022 were dropped and replaced with simpler per-teacher policies in 023. Backend handles scope filtering logic.

**Source**: 022 (original), 023 (replaced)

---

## `achievements`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Public read achievements` | SELECT | anon, authenticated | `true` |
| `Service role full access achievements` | ALL | service_role | `true` / `true` |

**Source**: 026, 900

---

## `student_achievements`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Teachers read student achievements` | SELECT | authenticated | `student_id IN (SELECT s.id FROM students s JOIN classrooms c ON s.classroom_id = c.id WHERE c.teacher_id = auth.uid())` |
| `Service role full access student_achievements` | ALL | service_role | `true` / `true` |

**Source**: 026, 900

---

## `admin_invite_codes`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Admins can view invite codes` | SELECT | authenticated | `true` (900 version) or `auth.jwt_claims ->> 'role' = 'admin'` (014 version) |
| `Admins can create invite codes` | INSERT | authenticated | `true` (900 version) or `auth.jwt_claims ->> 'role' = 'admin'` (014 version) |
| `Service role full access admin_invite_codes` | ALL | service_role | `true` / `true` |

**Note**: Migration 014 uses `auth.jwt_claims ->> 'role' = 'admin'` check. The 900 catchup uses `true` (simpler, relies on backend validation). The actual policy depends on which was applied.

**Source**: 014, 900

---

## `admin_audit_log`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Admins can view audit logs` | SELECT | authenticated | `true` (900 version) or `auth.jwt_claims ->> 'role' = 'admin'` (014 version) |
| `System can insert audit logs` | INSERT | authenticated | `true` (900 version) or `auth.jwt_claims ->> 'role' = 'admin'` (014 version) |
| `Service role full access admin_audit_log` | ALL | service_role | `true` / `true` |

**Source**: 014, 900

---

## `evaluation_questions`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Service role full access to evaluation_questions` | ALL | service_role | `true` / `true` |

**Note**: No authenticated user policies. Questions are read via service role on the backend.

**Source**: 031, 900

---

## `evaluation_records`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Service role full access to evaluation_records` | ALL | service_role | `true` / `true` |

**Source**: 031, 900

---

## `evaluation_status`

| Policy Name | Operation | Role | Condition |
|-------------|-----------|------|-----------|
| `Service role full access to evaluation_status` | ALL | service_role | `true` / `true` |
| `Students can read their own evaluation_status` | SELECT | authenticated | `true` |

**Note**: The SELECT policy uses `true` (all authenticated can read all rows), not filtered to own record. This may be intentional for backend simplicity.

**Source**: 031, 900

---

## Storage Policies (`storage.objects`)

| Policy Name | Operation | Bucket | Condition |
|-------------|-----------|--------|-----------|
| `Teachers can upload textbooks` | INSERT | `snc-textbooks` | `auth.role() = 'authenticated'` |
| `Teachers can view textbooks` | SELECT | `snc-textbooks` | `auth.role() = 'authenticated'` |

**Source**: 003

---

## Important Security Notes

- `get_supabase_admin()` uses the **service role key** which bypasses ALL RLS. This is used for cross-user operations (evaluator reports, embedding storage, admin features).
- Never expose the service role key to the frontend.
- Student auth uses custom PyJWT tokens, not Supabase GoTrue. Student RLS policies use `auth.uid()` which works because the backend sets the student UUID in the Supabase client context.
