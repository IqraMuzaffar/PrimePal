import { apiFetch } from "./api";

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
