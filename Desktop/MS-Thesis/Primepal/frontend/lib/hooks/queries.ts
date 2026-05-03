import { useQuery } from "@tanstack/react-query";
import { studentFetch } from "../api-helpers";
import type { MissionQuestion } from "@/types/missions";

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
  studentLeaderboard: ["studentLeaderboard"] as const,
  spellingWords: ["spellingWords"] as const,
  storyTime: ["storyTime"] as const,
  speakingPrompts: ["speakingPrompts"] as const,
  evalStatus: ["evalStatus"] as const,
  evalQuestions: (type: string) => ["evalQuestions", type] as const,
  missionPillar: (pillar: string) => ["missionPillar", pillar] as const,
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

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
  is_current_student: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  current_student_rank: number;
  total_students: number;
}

interface SpellingWord {
  word: string;
  emoji: string;
}

interface WordsResponse {
  words: SpellingWord[];
  topic: string;
  week_number: number;
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

interface SpeakingPrompt {
  id: number;
  prompt: string;
  hint: string;
}

interface PromptsData {
  prompts: SpeakingPrompt[];
  topic: string;
  week_number: number;
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

export function useStudentLeaderboard() {
  return useQuery({
    queryKey: queryKeys.studentLeaderboard,
    queryFn: () => studentFetch<LeaderboardResponse>("/missions/leaderboard"),
    staleTime: 60 * 1000,
  });
}

export function useSpellingWords() {
  return useQuery({
    queryKey: queryKeys.spellingWords,
    queryFn: () => studentFetch<WordsResponse>("/spelling-bee/words"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useStoryTime() {
  return useQuery({
    queryKey: queryKeys.storyTime,
    queryFn: () => studentFetch<StoryData>("/story-time/story"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSpeakingPrompts() {
  return useQuery({
    queryKey: queryKeys.speakingPrompts,
    queryFn: () => studentFetch<PromptsData>("/speaking/prompts"),
    staleTime: 10 * 60 * 1000,
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
