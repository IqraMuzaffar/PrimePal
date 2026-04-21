import { supabase } from "@/lib/supabase/client";

/**
 * Returns an Authorization header object containing the admin's Supabase
 * session token. Throws if the session has expired or doesn't exist.
 */
export async function getAdminHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated — please sign in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Verify the current user is an admin by checking the JWT role claim.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return false;

  // Decode JWT (basic decode without verification)
  try {
    const payload = JSON.parse(
      atob(session.access_token.split(".")[1])
    );
    return payload.role === "admin";
  } catch {
    return false;
  }
}
