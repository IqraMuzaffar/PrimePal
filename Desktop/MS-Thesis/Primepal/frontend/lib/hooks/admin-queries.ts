import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch, adminMutate } from "../api-helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminClassroom {
  id: string;
  class_name: string;
  grade_level: number;
  section?: string;
  class_code: string;
  teacher_id: string;
  teachers?: { full_name: string };
  student_count?: number;
}

export interface AdminTeacher {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface AdminStudent {
  id: string;
  student_name: string;
  roll_number?: string;
  email?: string;
  classroom_id: string;
  classroom_name: string;
  grade_level: number | null;
  secret_pin?: string;
}

export interface AdminBook {
  id: string;
  filename: string;
  grade_level: number;
  book_title: string;
  total_chunks: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface EvalResult {
  student_id: string;
  student_name: string | null;
  evaluation_type: string;
  total: number;
  correct: number;
  psychometric_avg: number | null;
}

export interface EvalResultsResponse {
  results: EvalResult[];
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const adminQueryKeys = {
  classrooms: ["admin", "classrooms"] as const,
  teachers: ["admin", "teachers"] as const,
  students: ["admin", "students"] as const,
  books: ["admin", "books"] as const,
  evalResults: ["admin", "evalResults"] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useAdminClassrooms() {
  return useQuery({
    queryKey: adminQueryKeys.classrooms,
    queryFn: () => adminFetch<AdminClassroom[]>("/admin/classrooms"),
    staleTime: 60 * 1000,
  });
}

export function useAdminTeachers() {
  return useQuery({
    queryKey: adminQueryKeys.teachers,
    queryFn: () => adminFetch<AdminTeacher[]>("/admin/teachers"),
    staleTime: 60 * 1000,
  });
}

export function useAdminStudents() {
  return useQuery({
    queryKey: adminQueryKeys.students,
    queryFn: () => adminFetch<AdminStudent[]>("/admin/students"),
    staleTime: 60 * 1000,
  });
}

export function useAdminBooks() {
  return useQuery({
    queryKey: adminQueryKeys.books,
    queryFn: () => adminFetch<AdminBook[]>("/admin/curriculum/books"),
    staleTime: 30 * 1000,
  });
}

export function useAdminEvalResults() {
  return useQuery({
    queryKey: adminQueryKeys.evalResults,
    queryFn: () => adminFetch<EvalResultsResponse>("/evaluations/results"),
    staleTime: 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateAdminClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adminMutate<AdminClassroom>("/admin/classrooms", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classrooms });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students });
    },
  });
}

export function useUpdateAdminClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminMutate<AdminClassroom>(`/admin/classrooms/${id}`, body, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classrooms });
    },
  });
}

export function useDeleteAdminClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminMutate<void>(`/admin/classrooms/${id}`, {}, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classrooms });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students });
    },
  });
}

export function useCreateAdminStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adminMutate<{ secret_pin: string }>("/admin/students", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students });
    },
  });
}

export function useUpdateAdminStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminMutate<AdminStudent>(`/admin/students/${id}`, body, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students });
    },
  });
}

export function useDeleteAdminStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminMutate<void>(`/admin/students/${id}`, {}, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students });
    },
  });
}

export function useResetStudentPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminMutate<{ new_pin: string }>(`/admin/students/${id}/reset-pin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students });
    },
  });
}

export function useInviteAdmin() {
  return useMutation({
    mutationFn: (body: { email: string; expires_in_days: number }) =>
      adminMutate<{ code: string }>("/admin/invite-code", body),
  });
}

export function useUpdateAdminTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminMutate<AdminTeacher>(`/admin/teachers/${id}`, body, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers });
    },
  });
}

export function useDeleteAdminTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminMutate<void>(`/admin/teachers/${id}`, body, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classrooms });
    },
  });
}

export function useTriggerPostTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string>) =>
      adminMutate<{ students_unlocked: number }>(
        "/evaluations/trigger-post-test",
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.evalResults });
    },
  });
}
