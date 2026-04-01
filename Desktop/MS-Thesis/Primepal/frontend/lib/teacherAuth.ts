// frontend/lib/teacherAuth.ts
import { supabase } from "@/lib/supabase/client";

/**
 * Returns an Authorization header object containing the teacher's Supabase
 * session token. Throws if the session has expired or doesn't exist.
 */
export async function getTeacherHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated — please sign in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}
