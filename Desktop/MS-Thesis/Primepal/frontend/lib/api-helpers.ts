import { apiFetch } from "./api";
import { getAdminHeaders } from "./adminAuth";
import { getTeacherHeaders } from "./teacherAuth";

export function getStudentClassroomId(): string | null {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("primepal_student_token")
      : null;
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.classroom_id ?? null;
  } catch {
    return null;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function adminFetch<T>(path: string): Promise<T> {
  const headers = await getAdminHeaders();
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.detail ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function adminMutate<T>(
  path: string,
  body: unknown,
  method: string = "POST"
): Promise<T> {
  const headers = await getAdminHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.detail ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function teacherFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getTeacherHeaders();
  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...(headers as Record<string, string>),
      ...options?.headers,
    },
  });
}

export async function teacherMutate<T>(
  path: string,
  body: unknown,
  method: string = "POST"
): Promise<T> {
  const headers = await getTeacherHeaders();
  return apiFetch<T>(path, {
    method,
    headers: {
      ...(headers as Record<string, string>),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function studentFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("primepal_student_token")
      : null;
  if (!token) throw new Error("Not authenticated");
  return apiFetch<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}

export function studentMutate<T>(
  path: string,
  body: unknown,
  method: string = "POST"
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("primepal_student_token")
      : null;
  if (!token) throw new Error("Not authenticated");
  return apiFetch<T>(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}
