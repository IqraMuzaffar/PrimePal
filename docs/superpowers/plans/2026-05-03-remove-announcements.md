# Remove Announcements Feature - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely remove the announcements feature from PrimePal codebase (frontend, backend, database, documentation).

**Architecture:** Feature removal following dependency order - remove UI references first, then API endpoints, then database schema. Each removal is verified before proceeding to avoid broken references.

**Tech Stack:** Next.js 14, FastAPI, Supabase PostgreSQL, TanStack Query

---

## File Inventory

**Frontend Deletions:**
- `frontend/app/teacher/announcements/page.tsx` - Complete page directory

**Frontend Modifications:**
- `frontend/lib/hooks/teacher-queries.ts` - Remove announcement hooks/interfaces
- `frontend/lib/hooks/queries.ts` - Remove student announcement hooks
- `frontend/components/teacher/TeacherShell.tsx` - Remove nav link
- `frontend/app/student/home/page.tsx` - Remove announcement banner

**Backend Deletions:**
- `backend/app/api/v1/endpoints/announcements.py` - Complete endpoint file

**Backend Modifications:**
- `backend/app/api/v1/router.py` - Remove router registration
- `backend/app/core/permissions.py` - Remove announcement permissions
- `backend/tests/test_full_journey.py` - Remove announcement test

**Database:**
- `supabase/migrations/026_drop_announcements.sql` - New migration to drop table

**Documentation Deletions:**
- `DOCUMENTATION/backend/endpoints/announcements.md`

**Documentation Modifications:**
- `DOCUMENTATION/backend/endpoints/index.md`
- `DOCUMENTATION/api-reference/index.md`
- `DOCUMENTATION/database/tables.md`
- `DOCUMENTATION/database/migrations.md`
- `DOCUMENTATION/database/index.md`
- `DOCUMENTATION/frontend/pages/index.md`

---

## Task 1: Remove Student UI Announcements Display

**Files:**
- Modify: `frontend/app/student/home/page.tsx`
- Modify: `frontend/lib/hooks/queries.ts`

- [ ] **Step 1: Remove announcement hook from student queries**

Edit `frontend/lib/hooks/queries.ts`:

Remove these lines (50-61):
```typescript
export interface Announcement {
  id: string;
  classroom_id: string;
  teacher_id: string;
  message_en: string;
  message_ur: string;
  is_active: boolean;
  scope: "classroom" | "grade_level" | "school_wide";
  target_grade_level?: number;
  created_at: string;
  updated_at: string;
}
```

Remove line 69:
```typescript
announcement: () => ["announcement"] as const,
```

Remove lines 139-150:
```typescript
export function useAnnouncement() {
  return useQuery({
    queryKey: queryKeys.announcement(),
    queryFn: async () => {
      const response = await fetch(`${API_URL}/announcements/active/${getClassroomId()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Failed to fetch announcement");
      return response.json() as Promise<Announcement | null>;
    },
  });
}
```

- [ ] **Step 2: Remove announcement display from student home**

Edit `frontend/app/student/home/page.tsx`:

Remove line 6:
```typescript
import { useAnnouncement } from "@/lib/hooks/queries";
```

Remove line 113:
```typescript
const { data: announcement } = useAnnouncement();
```

Remove lines 208-225:
```typescript
{announcement && (
  <div className="mb-6 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-1">
    <div className="rounded-md bg-white p-4">
      <div className="flex items-start gap-3">
        <Megaphone className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Teacher Announcement
          </h3>
          <p className="text-gray-700 mb-2">{announcement.message_en}</p>
          {announcement.message_ur && (
            <p className="text-gray-700 text-right font-urdu">
              {announcement.message_ur}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify student home page builds**

Run:
```bash
cd frontend
npm run build
```

Expected: Build succeeds with no errors related to announcements

- [ ] **Step 4: Commit student UI removal**

```bash
git add frontend/app/student/home/page.tsx frontend/lib/hooks/queries.ts
git commit -m "refactor: remove announcement display from student dashboard

- Remove useAnnouncement hook from student queries
- Remove announcement banner from student home page
- Part of announcements feature removal"
```

---

## Task 2: Remove Teacher Announcements Page and Hooks

**Files:**
- Delete: `frontend/app/teacher/announcements/` (entire directory)
- Modify: `frontend/lib/hooks/teacher-queries.ts`

- [ ] **Step 1: Remove teacher announcement hooks and interfaces**

Edit `frontend/lib/hooks/teacher-queries.ts`:

Remove lines 54-65:
```typescript
export interface TeacherAnnouncement {
  id: string;
  classroom_id: string;
  teacher_id: string;
  message_en: string;
  message_ur: string;
  is_active: boolean;
  scope: "classroom" | "grade_level" | "school_wide";
  target_grade_level?: number;
  created_at: string;
  updated_at: string;
  classroom_name?: string;
}
```

Remove lines 112-113:
```typescript
announcements: () => [...teacherQueryKeys.all, "announcements"] as const,
```

Remove lines 148-158:
```typescript
export function useTeacherAnnouncements() {
  return useQuery<TeacherAnnouncement[]>({
    queryKey: teacherQueryKeys.announcements(),
    queryFn: async () => {
      const data = await apiFetch<{ announcements: TeacherAnnouncement[] }>(
        "/announcements"
      );
      return data.announcements;
    },
  });
}
```

Remove lines 210-224:
```typescript
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { classroom_id: string; message: string }) =>
      apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.announcements() });
    },
  });
}
```

Remove lines 226-247:
```typescript
export function useToggleAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) =>
      apiFetch(`/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.announcements() });
    },
  });
}
```

- [ ] **Step 2: Delete teacher announcements page**

Run:
```bash
rm -rf frontend/app/teacher/announcements
```

- [ ] **Step 3: Verify teacher pages build**

Run:
```bash
cd frontend
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 4: Commit teacher hooks and page removal**

```bash
git add frontend/lib/hooks/teacher-queries.ts frontend/app/teacher/announcements
git commit -m "refactor: remove teacher announcements page and hooks

- Remove TeacherAnnouncement interface
- Remove useTeacherAnnouncements, useCreateAnnouncement, useToggleAnnouncement hooks
- Delete /teacher/announcements page
- Part of announcements feature removal"
```

---

## Task 3: Remove Navigation Link from Teacher Dashboard

**Files:**
- Modify: `frontend/components/teacher/TeacherShell.tsx`

- [ ] **Step 1: Remove announcements navigation link**

Edit `frontend/components/teacher/TeacherShell.tsx`:

Remove from line 6:
```typescript
Megaphone,
```

Remove from navigation items (around line 14):
```typescript
{ href: "/teacher/announcements", icon: Megaphone, label: "Announcements" },
```

The navigation array should go directly from Classroom to another item without Announcements.

- [ ] **Step 2: Verify teacher shell renders correctly**

Run:
```bash
cd frontend
npm run dev
```

Visit http://localhost:3001/teacher/dashboard (with valid teacher login)
Expected: Navigation menu displays without announcements link, no console errors

- [ ] **Step 3: Stop dev server and commit**

```bash
git add frontend/components/teacher/TeacherShell.tsx
git commit -m "refactor: remove announcements link from teacher navigation

- Remove Megaphone icon import
- Remove announcements navigation item
- Part of announcements feature removal"
```

---

## Task 4: Remove Backend Announcements Endpoint

**Files:**
- Delete: `backend/app/api/v1/endpoints/announcements.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Remove announcements router registration**

Edit `backend/app/api/v1/router.py`:

Remove from imports (line 3):
```python
from app.api.v1.endpoints import announcements
```

Remove from router includes (around line 9):
```python
api_router.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
```

- [ ] **Step 2: Delete announcements endpoint file**

Run:
```bash
rm backend/app/api/v1/endpoints/announcements.py
```

- [ ] **Step 3: Verify backend starts without errors**

Run:
```bash
cd backend
uvicorn app.main:app --reload
```

Expected: Server starts successfully, logs show no announcements routes registered

Check routes:
```bash
curl -s http://localhost:8000/docs | grep -i announcement
```
Expected: No announcements endpoints listed

- [ ] **Step 4: Stop server and commit**

```bash
git add backend/app/api/v1/router.py backend/app/api/v1/endpoints/announcements.py
git commit -m "refactor: remove announcements API endpoint

- Remove announcements router registration
- Delete announcements.py endpoint file
- Part of announcements feature removal"
```

---

## Task 5: Remove Announcement Permissions

**Files:**
- Modify: `backend/app/core/permissions.py`

- [ ] **Step 1: Remove announcement permissions from teacher role**

Edit `backend/app/core/permissions.py`:

Remove lines 14-16 from TEACHER_PERMISSIONS:
```python
"announcement:read",
"announcement:create",
"announcement:update",
```

- [ ] **Step 2: Verify permissions module loads correctly**

Run:
```bash
cd backend
python -c "from app.core.permissions import TEACHER_PERMISSIONS; print('Teacher permissions:', TEACHER_PERMISSIONS)"
```

Expected: Prints teacher permissions list without announcement permissions

- [ ] **Step 3: Commit permissions update**

```bash
git add backend/app/core/permissions.py
git commit -m "refactor: remove announcement permissions from teacher role

- Remove announcement:read, announcement:create, announcement:update
- Part of announcements feature removal"
```

---

## Task 6: Remove Announcement Integration Test

**Files:**
- Modify: `backend/tests/test_full_journey.py`

- [ ] **Step 1: Remove announcement test function**

Edit `backend/tests/test_full_journey.py`:

Remove lines 328-342:
```python
def test_03_teacher_creates_announcement():
    """Test that teacher can create and manage announcements."""
    teacher_token = _get_teacher_token()
    classroom_id = _get_first_classroom_id(teacher_token)

    response = requests.post(
        f"{BASE_URL}/announcements",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"classroom_id": classroom_id, "message": "Important: Exam on Friday!"}
    )
    assert response.status_code == 201
    announcement = response.json()
    assert announcement["message_en"] == "Important: Exam on Friday!"
    assert announcement["is_active"] is True

    print(f"✓ Teacher created announcement for classroom {classroom_id}")
```

If there are references to this test in test ordering, remove those as well.

- [ ] **Step 2: Run remaining integration tests**

Run:
```bash
cd backend
pytest tests/test_full_journey.py -v
```

Expected: All remaining tests pass, no test_03_teacher_creates_announcement in output

- [ ] **Step 3: Commit test removal**

```bash
git add backend/tests/test_full_journey.py
git commit -m "test: remove announcement integration test

- Remove test_03_teacher_creates_announcement
- Part of announcements feature removal"
```

---

## Task 7: Create Database Migration to Drop Announcements Table

**Files:**
- Create: `supabase/migrations/026_drop_announcements.sql`

- [ ] **Step 1: Write migration to drop announcements table**

Create `supabase/migrations/026_drop_announcements.sql`:

```sql
-- Migration: Drop announcements table and related objects
-- This removes the announcements feature completely from the database

-- Drop RLS policies first (if they exist)
DROP POLICY IF EXISTS "Teachers can view all announcements" ON announcements;
DROP POLICY IF EXISTS "Teachers can create announcements for their classrooms" ON announcements;
DROP POLICY IF EXISTS "Teachers can update their own announcements" ON announcements;
DROP POLICY IF EXISTS "Students can view active announcements" ON announcements;
DROP POLICY IF EXISTS "Students can view active announcements for their classroom" ON announcements;
DROP POLICY IF EXISTS "Teachers can view announcements for their scope" ON announcements;
DROP POLICY IF EXISTS "Students can view active scoped announcements" ON announcements;

-- Drop indexes
DROP INDEX IF EXISTS idx_announcements_classroom_active;
DROP INDEX IF EXISTS idx_announcements_teacher;
DROP INDEX IF EXISTS idx_announcements_scope_grade;
DROP INDEX IF EXISTS idx_announcements_active_scope;

-- Drop the announcements table
DROP TABLE IF EXISTS announcements CASCADE;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Announcements table and all related objects have been dropped';
END $$;
```

- [ ] **Step 2: Test migration in local Supabase (if available)**

If you have local Supabase running:
```bash
supabase db reset
```

Otherwise, verify SQL syntax:
```bash
cd supabase/migrations
cat 026_drop_announcements.sql
```

Expected: SQL is valid, no syntax errors

- [ ] **Step 3: Commit migration**

```bash
git add supabase/migrations/026_drop_announcements.sql
git commit -m "refactor: add migration to drop announcements table

- Drop all RLS policies for announcements
- Drop all indexes for announcements
- Drop announcements table with CASCADE
- Part of announcements feature removal"
```

---

## Task 8: Remove Announcements Endpoint Documentation

**Files:**
- Delete: `DOCUMENTATION/backend/endpoints/announcements.md`
- Modify: `DOCUMENTATION/backend/endpoints/index.md`

- [ ] **Step 1: Delete announcements endpoint documentation**

Run:
```bash
rm DOCUMENTATION/backend/endpoints/announcements.md
```

- [ ] **Step 2: Update endpoints index**

Edit `DOCUMENTATION/backend/endpoints/index.md`:

Find and remove the announcements entry from the endpoint listing. The exact line depends on the current structure, but it will look like:

```markdown
- **[announcements.md](announcements.md)** — Teacher announcements (create, list, toggle status)
```

Or similar table entry:

```markdown
| announcements | `/announcements/*` | Teacher (create, update), Student (read active) | Bilingual announcements with scope |
```

- [ ] **Step 3: Verify documentation structure**

Run:
```bash
cd DOCUMENTATION/backend/endpoints
ls -la
cat index.md | grep -i announcement
```

Expected: No announcements.md file, no announcement references in index

- [ ] **Step 4: Commit documentation removal**

```bash
git add DOCUMENTATION/backend/endpoints/announcements.md DOCUMENTATION/backend/endpoints/index.md
git commit -m "docs: remove announcements endpoint documentation

- Delete announcements.md endpoint doc
- Remove announcements from endpoints index
- Part of announcements feature removal"
```

---

## Task 9: Update API Reference Documentation

**Files:**
- Modify: `DOCUMENTATION/api-reference/index.md`

- [ ] **Step 1: Remove announcements from API reference**

Edit `DOCUMENTATION/api-reference/index.md`:

Find and remove all announcements endpoint entries. They will look similar to:

```markdown
| POST | `/api/v1/announcements` | Teacher | Create announcement |
| GET | `/api/v1/announcements` | Teacher | List all teacher's announcements |
| GET | `/api/v1/announcements/classroom/{id}` | Teacher | Get classroom announcements |
| GET | `/api/v1/announcements/active/{classroom_id}` | Student | Get active announcements |
| PATCH | `/api/v1/announcements/{id}` | Teacher | Update announcement status |
```

- [ ] **Step 2: Verify API reference is clean**

Run:
```bash
cat DOCUMENTATION/api-reference/index.md | grep -i announcement
```

Expected: No output (no announcement references found)

- [ ] **Step 3: Commit API reference update**

```bash
git add DOCUMENTATION/api-reference/index.md
git commit -m "docs: remove announcements from API reference

- Remove all announcements endpoints from API listing
- Part of announcements feature removal"
```

---

## Task 10: Update Database Documentation

**Files:**
- Modify: `DOCUMENTATION/database/tables.md`
- Modify: `DOCUMENTATION/database/migrations.md`
- Modify: `DOCUMENTATION/database/index.md`

- [ ] **Step 1: Remove announcements table from tables documentation**

Edit `DOCUMENTATION/database/tables.md`:

Find and remove the announcements table section. It will include:
- Table name header
- Column definitions
- Indexes
- RLS policies
- Example section

Remove the entire section about the `announcements` table.

- [ ] **Step 2: Update migrations documentation**

Edit `DOCUMENTATION/database/migrations.md`:

Update entries for migrations 022 and 023 to indicate they are superseded:

```markdown
- **022_announcements_bilingual.sql** — ~~Creates announcements table~~ (Removed in 026)
- **023_announcements_scope_levels.sql** — ~~Adds scope to announcements~~ (Removed in 026)
```

Add entry for new migration:
```markdown
- **026_drop_announcements.sql** — Drops announcements table (feature removed)
```

- [ ] **Step 3: Update database index**

Edit `DOCUMENTATION/database/index.md`:

Remove any references to the announcements table from the overview or table listing.

- [ ] **Step 4: Verify database docs are clean**

Run:
```bash
grep -r "announcements" DOCUMENTATION/database/ --exclude-dir=.git
```

Expected: Only references are in migrations.md showing the feature was removed

- [ ] **Step 5: Commit database documentation updates**

```bash
git add DOCUMENTATION/database/tables.md DOCUMENTATION/database/migrations.md DOCUMENTATION/database/index.md
git commit -m "docs: remove announcements from database documentation

- Remove announcements table from tables.md
- Mark migrations 022, 023 as superseded in migrations.md
- Add migration 026 entry for announcements removal
- Remove announcements from database index
- Part of announcements feature removal"
```

---

## Task 11: Update Frontend Pages Documentation

**Files:**
- Modify: `DOCUMENTATION/frontend/pages/index.md`

- [ ] **Step 1: Remove announcements page from frontend docs**

Edit `DOCUMENTATION/frontend/pages/index.md`:

Find and remove the entry for `/teacher/announcements` page. It might look like:

```markdown
- `/teacher/announcements` — Teacher announcements management (create, toggle, view)
```

Or in a table:
```markdown
| /teacher/announcements | Teacher announces to classrooms (bilingual) |
```

- [ ] **Step 2: Verify frontend pages docs**

Run:
```bash
cat DOCUMENTATION/frontend/pages/index.md | grep -i announcement
```

Expected: No output (no announcement references)

- [ ] **Step 3: Commit frontend pages documentation update**

```bash
git add DOCUMENTATION/frontend/pages/index.md
git commit -m "docs: remove announcements page from frontend documentation

- Remove /teacher/announcements from pages index
- Part of announcements feature removal"
```

---

## Task 12: Clean Up AI Context and Test Plan References

**Files:**
- Modify: `AI_CONTEXT.md`
- Modify: `COMPREHENSIVE_TEST_PLAN.md`
- Modify: `TICKETS/teacher/00-INDEX.md`

- [ ] **Step 1: Remove announcements from AI_CONTEXT.md**

Edit `AI_CONTEXT.md`:

Find and remove all references to announcements feature. Search for "announcement" (case-insensitive) and remove entries from:
- Feature lists
- Architecture descriptions
- API endpoint listings
- Any other mentions

- [ ] **Step 2: Remove announcements from test plan**

Edit `COMPREHENSIVE_TEST_PLAN.md`:

Find and remove announcement test cases and references.

- [ ] **Step 3: Remove announcements from teacher tickets index**

Edit `TICKETS/teacher/00-INDEX.md`:

Remove announcements from the teacher feature index listing.

- [ ] **Step 4: Verify cleanup**

Run:
```bash
grep -i "announcement" AI_CONTEXT.md COMPREHENSIVE_TEST_PLAN.md TICKETS/teacher/00-INDEX.md
```

Expected: Minimal or no references (or clearly marked as "removed feature")

- [ ] **Step 5: Commit documentation cleanup**

```bash
git add AI_CONTEXT.md COMPREHENSIVE_TEST_PLAN.md TICKETS/teacher/00-INDEX.md
git commit -m "docs: remove announcements from context and test documentation

- Remove announcements feature from AI_CONTEXT.md
- Remove announcement tests from COMPREHENSIVE_TEST_PLAN.md
- Remove announcements from teacher features index
- Part of announcements feature removal"
```

---

## Task 13: Final Verification and Integration Test

**Files:**
- None (verification only)

- [ ] **Step 1: Verify frontend builds successfully**

Run:
```bash
cd frontend
npm run build
```

Expected: Build completes with no errors, no references to announcements in build output

- [ ] **Step 2: Verify backend starts successfully**

Run:
```bash
cd backend
uvicorn app.main:app --reload
```

Expected: Server starts with no errors, check logs for no announcement-related warnings

Visit: http://localhost:8000/docs
Expected: No `/announcements` endpoints in API docs

- [ ] **Step 3: Verify frontend works in dev mode**

Run:
```bash
cd frontend
npm run dev
```

Visit pages:
- Student home: http://localhost:3001/student/home (no announcement banner)
- Teacher dashboard: http://localhost:3001/teacher/dashboard (no announcements link in nav)

Expected: All pages load without errors, no announcement UI elements visible

- [ ] **Step 4: Search codebase for remaining references**

Run:
```bash
cd /c/Users/Iqra\ Muzaffar/Desktop/MS-Thesis/Primepal
grep -r "announcement" --include="*.tsx" --include="*.ts" --include="*.py" frontend/ backend/ | grep -v node_modules | grep -v .next | grep -v __pycache__
```

Expected: No functional code references (only comments or historical references acceptable)

- [ ] **Step 5: Run backend tests**

Run:
```bash
cd backend
pytest -v
```

Expected: All tests pass, no announcement-related tests present

- [ ] **Step 6: Document verification results**

Create verification report in commit message format:

```
Verification complete:
✓ Frontend builds without errors
✓ Backend starts without errors
✓ No /announcements endpoints in API docs
✓ Student home has no announcement banner
✓ Teacher nav has no announcements link
✓ No announcement code references in codebase
✓ All backend tests pass
```

---

## Task 14: Final Commit and Summary

**Files:**
- None (cleanup only)

- [ ] **Step 1: Review all commits**

Run:
```bash
git log --oneline --all --graph -15
```

Expected: See series of commits for announcements removal

- [ ] **Step 2: Create summary commit (if needed)**

If there are any uncommitted changes:
```bash
git status
git add -A
git commit -m "chore: final cleanup after announcements feature removal"
```

- [ ] **Step 3: Create removal summary document**

Create `docs/removed-features/announcements-removal-2026-05-03.md`:

```markdown
# Announcements Feature Removal

**Date:** 2026-05-03
**Reason:** Feature removed from product scope

## What Was Removed

### Frontend
- `/teacher/announcements` page (create, list, toggle announcements)
- Student announcement banner on home page
- Teacher navigation link to announcements
- React Query hooks: useTeacherAnnouncements, useCreateAnnouncement, useToggleAnnouncement, useAnnouncement
- TypeScript interfaces: TeacherAnnouncement, Announcement

### Backend
- `/api/v1/announcements/*` endpoints (5 total)
- Teacher permissions: announcement:read, announcement:create, announcement:update
- Integration test for announcements

### Database
- `announcements` table (dropped via migration 026)
- Related indexes and RLS policies

### Documentation
- Backend endpoint documentation
- API reference entries
- Database table documentation
- Frontend pages documentation

## Migration Path

If announcements feature needs to be restored:
1. Revert migration 026 (or recreate from migrations 022, 023)
2. Restore backend endpoint from git history: `app/api/v1/endpoints/announcements.py`
3. Re-register router in `app/api/v1/router.py`
4. Restore frontend hooks and pages from git history
5. Restore permissions and tests

## Commits

See git log with message filter:
```bash
git log --all --grep="announcements feature removal"
```
```

- [ ] **Step 4: Commit removal summary**

```bash
git add docs/removed-features/announcements-removal-2026-05-03.md
git commit -m "docs: add announcements feature removal summary

Document what was removed and how to restore if needed"
```

- [ ] **Step 5: Final verification command**

Run comprehensive check:
```bash
echo "=== Frontend Build ===" && cd frontend && npm run build && \
echo "=== Backend Tests ===" && cd ../backend && pytest -v && \
echo "=== Code Search ===" && cd .. && grep -r "announcement" --include="*.tsx" --include="*.ts" --include="*.py" frontend/ backend/ | grep -v node_modules | grep -v .next | grep -v __pycache__ | wc -l && \
echo "=== REMOVAL COMPLETE ==="
```

Expected: Build passes, tests pass, minimal code references (0-5)

---

## Completion Checklist

- [ ] All 21 identified files/references removed or updated
- [ ] Frontend builds successfully
- [ ] Backend starts successfully
- [ ] No announcements endpoints in API docs
- [ ] No announcements UI elements visible
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Removal summary created
- [ ] All changes committed

## Rollback Plan

If removal needs to be reverted:

1. **Database**: Revert migration 026 or re-run migrations 022, 023
2. **Backend**: Restore files from commit before removal series
3. **Frontend**: Restore files from commit before removal series
4. **Documentation**: Restore from git history

All removed code is preserved in git history and can be restored with:
```bash
# Find the last commit before removal
git log --oneline --all | grep "before announcements removal"

# Restore specific files
git checkout <commit-hash> -- path/to/file
```

---

**Plan Status:** Ready for execution
**Estimated Time:** 45-60 minutes (all tasks)
**Risk Level:** Low (pure removal, no new functionality)
