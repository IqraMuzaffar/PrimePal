import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface TeacherProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}

let cachedRole: string | null = null;

export function useTeacherRole() {
  const [role, setRole] = useState<string | null>(cachedRole);
  const [loading, setLoading] = useState(cachedRole === null);

  useEffect(() => {
    if (cachedRole !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await getTeacherHeaders();
        const profile = await apiFetch<TeacherProfile>("/auth/me", { headers });
        if (!cancelled) {
          cachedRole = profile.role;
          setRole(profile.role);
        }
      } catch {
        if (!cancelled) setRole("teacher");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { role, isAdmin: role === "admin", loading };
}
