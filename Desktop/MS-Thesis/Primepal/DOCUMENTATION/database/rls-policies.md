# Row Level Security (RLS) Policies

Supabase enforces RLS on all tables. Policies control data access at the database level.

## General Pattern
- **Teachers** can only see/modify their own classrooms and the students within them
- **Students** can only access their own data (interactions, rewards)
- **Service role** bypasses all RLS (used server-side for admin operations)

## Key Policies

### teachers
- Teachers can read their own row
- Insert/update restricted to auth system

### classrooms
- Teachers can CRUD classrooms where `teacher_id = auth.uid()`
- Students cannot directly access classroom table (backend handles this)

### students
- Teachers can manage students in their classrooms
- Students can read their own row (migration 025)

### student_interactions
- Teachers can read interactions for students in their classrooms
- Students can read their own interactions
- Insert allowed for authenticated users (backend logs via service role)

### snc_knowledge_base
- Read access for authenticated users
- Write restricted to service role (embedding inserts)

### snc-textbooks (Storage)
- Upload restricted to authenticated teachers
- Read restricted to authenticated users

## Important
- The `get_supabase_admin()` client uses the **service role key** which bypasses ALL RLS
- This is necessary for cross-user operations (evaluator reports, embedding storage)
- Never expose the service role key to the frontend
