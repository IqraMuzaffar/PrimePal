-- Fix for RLS infinite recursion issue
-- This creates a SECURITY DEFINER function that bypasses RLS

-- Step 1: Create a function to safely get user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.teachers WHERE id = auth.uid();
$$;

-- Step 2: Drop the existing recursive RLS policies
DROP POLICY IF EXISTS "Admins see all teachers, teachers see self" ON public.teachers;
DROP POLICY IF EXISTS "Admins see all classrooms, teachers see own" ON public.classrooms;

-- Step 3: Recreate policies using the new function (no recursion)
CREATE POLICY "Admins see all teachers, teachers see self"
ON public.teachers
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'admin' OR auth.uid() = id
);

CREATE POLICY "Admins see all classrooms, teachers see own"
ON public.classrooms
FOR SELECT
TO authenticated
USING (
  public.get_user_role() = 'admin' OR auth.uid() = teacher_id
);

-- Verify the function works
SELECT public.get_user_role(); -- Should return NULL for anon, role for authenticated users
