import { useQuery } from "@tanstack/react-query";
import { studentFetch } from "../api-helpers";
import type { MissionQuestion } from "@/types/missions";

export interface StudentProfile {
  student_id: string;
  student_name: string;
  roll_number?: string | null;
  avatar_url?: string | null;
  points: number;
  missions_completed: number;
  avatar_style?: string;
  theme_color?: string;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface DailySummary {
  today_points: number;
  total_points: number;
  missions_today: number;
}

export interface AchievementProgress {
  id: string;
  name: string;
  description: string;
  description_ur: string;
  icon: string;
  tier: string;
  threshold_type: string;
  threshold_value: number;
  unlocked: boolean;
  unlocked_at: string | null;
  current_progress: number;
}

export interface AchievementsResponse {
  achievements: AchievementProgress[];
}

export interface PillarProgress {
  pillar: string;
  done: number;
  target: number;
  pct: number;
}

export interface WeeklyProgress {
  week_topic: string | null;
  pillars: PillarProgress[];
}

export interface ActivityPoints {
  activity: string;
  points: number;
  count: number;
}

export interface PointsBreakdown {
  today: ActivityPoints[];
  this_week: ActivityPoints[];
  total_points: number;
}

export interface PillarScore {
  pillar: string;
  total: number;
  correct: number;
  accuracy_pct: number;
}

export interface MyScoresData {
  total_questions: number;
  total_correct: number;
  overall_accuracy_pct: number;
  total_points: number;
  pillar_scores: PillarScore[];
  time_range_label: string;
}

export const queryKeys = {
  studentProfile: ["studentProfile"] as const,
  streak: ["streak"] as const,
  dailySummary: ["dailySummary"] as const,
  achievements: ["achievements"] as const,
  storyTime: ["storyTime"] as const,
  evalStatus: ["evalStatus"] as const,
  evalQuestions: (type: string) => ["evalQuestions", type] as const,
  missionPillar: (pillar: string) => ["missionPillar", pillar] as const,
  weeklyProgress: ["weeklyProgress"] as const,
  pointsBreakdown: ["pointsBreakdown"] as const,
  myScores: (timeRange: string) => ["myScores", timeRange] as const,
  dailyPillarStatus: ["dailyPillarStatus"] as const,
  puzzlePalaceDailyStatus: ["puzzlePalaceDailyStatus"] as const,
  storyTimeDailyStatus: ["storyTimeDailyStatus"] as const,
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

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements,
    queryFn: () => studentFetch<AchievementsResponse>("/achievements/me"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}


interface ComprehensionQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
}

interface StoryData {
  story_title: string;
  story_text: string;
  topic: string;
  week_number: number;
  questions: ComprehensionQuestion[];
}

interface EvalStatus {
  needs_pre_test: boolean;
  needs_post_test: boolean;
  pre_completed: boolean;
  post_completed: boolean;
}

interface EvalQuestion {
  id: string;
  section: string;
  pillar: string | null;
  question_index: number;
  question_text: string;
  question_text_ur: string | null;
  task_type: string;
  options: Array<{ label: string; value: string; emoji?: string }> | null;
  audio_text: string | null;
}


export function useStoryTime(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.storyTime,
    queryFn: () => studentFetch<StoryData>("/story-time/story"),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
    enabled,
  });
}

export function useEvalStatus() {
  return useQuery({
    queryKey: queryKeys.evalStatus,
    queryFn: () => studentFetch<EvalStatus>("/evaluations/status"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEvalQuestions(type: "pre" | "post" | null) {
  return useQuery({
    queryKey: queryKeys.evalQuestions(type ?? ""),
    queryFn: () =>
      studentFetch<EvalQuestion[]>(`/evaluations/questions?type=${type}`),
    enabled: !!type,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMissionPillar(pillar: string) {
  return useQuery({
    queryKey: queryKeys.missionPillar(pillar),
    queryFn: () =>
      studentFetch<{ questions: MissionQuestion[] }>(
        `/missions/pillar?pillar=${pillar}`
      ),
    enabled: !!pillar,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyProgress() {
  return useQuery({
    queryKey: queryKeys.weeklyProgress,
    queryFn: () => studentFetch<WeeklyProgress>("/missions/weekly-progress"),
    staleTime: 5 * 60 * 1000,
  });
}

interface DailyPillarStatus {
  pillar: string;
  done: number;
  limit: number;
  completed: boolean;
}

interface DailyPillarStatusResponse {
  pillars: DailyPillarStatus[];
}

export function useDailyPillarStatus() {
  return useQuery({
    queryKey: queryKeys.dailyPillarStatus,
    queryFn: () => studentFetch<DailyPillarStatusResponse>("/missions/daily-pillar-status"),
    staleTime: 60 * 1000, // 1 minute — must refresh quickly after completion
  });
}

export function usePointsBreakdown() {
  return useQuery({
    queryKey: queryKeys.pointsBreakdown,
    queryFn: () => studentFetch<PointsBreakdown>("/rewards/points-breakdown"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyScores(timeRange: string = "everything") {
  return useQuery({
    queryKey: queryKeys.myScores(timeRange),
    queryFn: () => studentFetch<MyScoresData>(`/student/my-scores?time_range=${timeRange}`),
    staleTime: 30 * 1000,
  });
}

export interface DailyActivityStatus {
  attempts_used: number;
  attempts_limit: number;
  can_play: boolean;
}

export function usePuzzlePalaceDailyStatus() {
  return useQuery({
    queryKey: queryKeys.puzzlePalaceDailyStatus,
    queryFn: () => studentFetch<DailyActivityStatus>("/puzzle-palace/daily-status"),
    staleTime: 60 * 1000,
  });
}

export function useStoryTimeDailyStatus() {
  return useQuery({
    queryKey: queryKeys.storyTimeDailyStatus,
    queryFn: () => studentFetch<DailyActivityStatus>("/story-time/daily-status"),
    staleTime: 60 * 1000,
  });
}
