import { useQuery } from "@tanstack/react-query";
import { studentFetch } from "../api-helpers";

interface StudentProfile {
  id: string;
  student_name: string;
  avatar_url: string;
  classroom_id: string;
  points: number;
  missions_completed: number;
  current_streak: number;
  longest_streak: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface DailySummary {
  points_today: number;
  total_points: number;
  missions_today: number;
}

interface RewardStatus {
  claimed_today: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  threshold: number;
}

interface AchievementsResponse {
  achievements: Badge[];
  total_unlocked: number;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export const queryKeys = {
  studentProfile: ["studentProfile"] as const,
  streak: ["streak"] as const,
  dailySummary: ["dailySummary"] as const,
  rewardStatus: ["rewardStatus"] as const,
  achievements: ["achievements"] as const,
  announcement: (classroomId: string) => ["announcement", classroomId] as const,
  leaderboard: (classroomId: string) => ["leaderboard", classroomId] as const,
};

export function useStudentProfile() {
  return useQuery({
    queryKey: queryKeys.studentProfile,
    queryFn: () => studentFetch<StudentProfile>("/missions/me"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.streak,
    queryFn: () => studentFetch<StreakData>("/rewards/streak"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailySummary() {
  return useQuery({
    queryKey: queryKeys.dailySummary,
    queryFn: () => studentFetch<DailySummary>("/rewards/daily-summary"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRewardStatus() {
  return useQuery({
    queryKey: queryKeys.rewardStatus,
    queryFn: () => studentFetch<RewardStatus>("/rewards/status"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements,
    queryFn: () => studentFetch<AchievementsResponse>("/achievements/me"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnnouncement(classroomId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcement(classroomId ?? ""),
    queryFn: () =>
      studentFetch<Announcement | null>(
        `/announcements/${classroomId}/active`
      ),
    enabled: !!classroomId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLeaderboard(classroomId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leaderboard(classroomId ?? ""),
    queryFn: () =>
      studentFetch<{ students: Array<{ id: string; student_name: string; avatar_url: string; points: number }> }>(
        `/missions/leaderboard/${classroomId}`
      ),
    enabled: !!classroomId,
    staleTime: 60 * 1000,
  });
}
