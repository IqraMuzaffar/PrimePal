import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherFetch, teacherMutate } from "../api-helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeacherClassroom {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  section?: string;
  current_week_topic?: string;
}

export interface StudentRow {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  avatar_url: string | null;
  classroom_id: string;
  classroom_name: string;
  grade_level: number;
  total_points: number;
  total_interactions: number;
  mission_accuracy_pct: number;
  active_this_week: boolean;
}

export interface SyllabusWeek {
  id: string;
  week_number: number;
  topic_title: string;
  status: "locked" | "active" | "completed";
}

export interface TeacherDailyPlan {
  summary: string;
  focus_areas: Array<{ topic: string; pillar: string; reason: string }>;
  suggested_activities: Array<{
    title: string;
    description: string;
    target_pillar: string;
    estimated_minutes: number;
  }>;
  student_groups: Array<{
    group_name: string;
    student_names: string[];
    recommendation: string;
  }>;
  snc_references: string[];
  generated_at: string;
}

export interface GradeTopicItem {
  topic_id: number;
  topic_name: string;
  skill: string;
  is_active: boolean;
}

export interface GradeSelectionsResponse {
  grade_level: number;
  topics: GradeTopicItem[];
}

export interface ClassroomMissionReport {
  classroom_id: string;
  grade_level: number;
  students: Array<{
    student_id: string;
    student_name: string;
    avatar_url: string | null;
    roll_number: string | null;
    total_interactions: number;
    mission_accuracy_pct: number;
  }>;
}

export interface DashboardStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
  active_this_week: number;
}

export interface SkillAccuracy {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
  active_today: number;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const teacherQueryKeys = {
  classrooms: ["teacher", "classrooms"] as const,
  classroom: (id: string) => ["teacher", "classroom", id] as const,
  topics: (grade: number) => ["teacher", "topics", grade] as const,
  missionReport: (classroomId: string) =>
    ["teacher", "missionReport", classroomId] as const,
  dashboardStats: (params: string) =>
    ["teacher", "dashboardStats", params] as const,
  skillAccuracy: (grade?: number, section?: string) =>
    ["teacher", "skillAccuracy", grade ?? "all", section ?? "all"] as const,
  students: (params: string) => ["teacher", "students", params] as const,
  syllabus: (classroomId: string) =>
    ["teacher", "syllabus", classroomId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTeacherClassrooms() {
  return useQuery({
    queryKey: teacherQueryKeys.classrooms,
    queryFn: () => teacherFetch<TeacherClassroom[]>("/classroom/"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeacherClassroom(id: string) {
  return useQuery({
    queryKey: teacherQueryKeys.classroom(id),
    queryFn: () =>
      teacherFetch<
        TeacherClassroom & { students: Array<Record<string, unknown>> }
      >(`/classroom/${id}`),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });
}

export function useTeacherTopics(grade: number) {
  return useQuery({
    queryKey: teacherQueryKeys.topics(grade),
    queryFn: () =>
      teacherFetch<GradeSelectionsResponse>(`/topics/grade-selections/${grade}`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useClassroomMissionReport(classroomId: string | undefined) {
  return useQuery({
    queryKey: teacherQueryKeys.missionReport(classroomId ?? ""),
    queryFn: () =>
      teacherFetch<ClassroomMissionReport>(
        `/evaluator/report/classroom/${classroomId}`
      ),
    enabled: !!classroomId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeacherDashboardStats(params: {
  gradeLevel?: number;
  pillar?: string;
  section?: string;
}) {
  const qs = new URLSearchParams();
  if (params.gradeLevel) qs.set("grade_level", String(params.gradeLevel));
  if (params.pillar) qs.set("pillar", params.pillar);
  if (params.section) qs.set("section", params.section);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return useQuery({
    queryKey: teacherQueryKeys.dashboardStats(suffix),
    queryFn: () =>
      teacherFetch<DashboardStats>(`/evaluator/dashboard-stats${suffix}`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeacherSkillAccuracy(gradeLevel?: number, section?: string) {
  const qs = new URLSearchParams();
  if (gradeLevel) qs.set("grade_level", String(gradeLevel));
  if (section) qs.set("section", section);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return useQuery({
    queryKey: teacherQueryKeys.skillAccuracy(gradeLevel, section),
    queryFn: () =>
      teacherFetch<SkillAccuracy>(`/evaluator/skill-accuracy${suffix}`),
    staleTime: 2 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useSaveTopics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      grade,
      topicIds,
    }: {
      grade: number;
      topicIds: number[];
    }) =>
      teacherMutate<{ saved: number }>(
        `/topics/grade-selections/${grade}`,
        { topic_ids: topicIds },
        "PUT"
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: teacherQueryKeys.topics(variables.grade),
      });
    },
  });
}

// Always fetches the full unfiltered dataset — filtering is done client-side.
// This means filter changes never trigger a network request.
export function useTeacherStudents() {
  return useQuery({
    queryKey: teacherQueryKeys.students(""),
    queryFn: () =>
      teacherFetch<{ students: StudentRow[] }>(`/evaluator/students`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTeacherSyllabus(classroomId: string) {
  return useQuery({
    queryKey: teacherQueryKeys.syllabus(classroomId),
    queryFn: () =>
      teacherFetch<{ weeks: SyllabusWeek[] }>(
        `/classroom/${classroomId}/syllabus`
      ),
    staleTime: 2 * 60 * 1000,
    enabled: !!classroomId,
  });
}

export function useGenerateDailyPlan() {
  return useMutation({
    mutationFn: (gradeLevel: number) =>
      teacherMutate<TeacherDailyPlan>(
        "/evaluator/teacher-assistant/daily-plan",
        { grade_level: gradeLevel }
      ),
  });
}

export function useUnlockNextWeek(classroomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      activeWeekNumber,
      nextWeekNumber,
    }: {
      activeWeekNumber: number;
      nextWeekNumber: number;
    }) => {
      await teacherMutate(
        `/classroom/${classroomId}/syllabus/${activeWeekNumber}`,
        { status: "completed" },
        "PATCH"
      );
      await teacherMutate(
        `/classroom/${classroomId}/syllabus/${nextWeekNumber}`,
        { status: "active" },
        "PATCH"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: teacherQueryKeys.syllabus(classroomId),
      });
    },
  });
}

// Always fetches the full unfiltered dataset — filtering is done client-side.
// This means filter changes never trigger a network request.
export function useTeacherAnalytics() {
  return useQuery({
    queryKey: ["teacher", "analytics"],
    queryFn: () =>
      teacherFetch<import("@/types/analytics").TeacherAnalyticsData>(
        "/teacher/analytics"
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
