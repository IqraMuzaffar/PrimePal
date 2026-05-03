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
 * Verify the current user is an admin by calling the backend /auth/me endpoint,
 * which checks the `role` column in the teachers table.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return false;

  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.role === "admin";
  } catch {
    return false;
  }
}
