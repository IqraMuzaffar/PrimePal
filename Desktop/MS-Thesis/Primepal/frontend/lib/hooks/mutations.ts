import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentMutate } from "../api-helpers";
import { queryKeys } from "./queries";

interface CompleteResponse {
  points_awarded: number;
  new_total: number;
  current_streak: number;
}

interface CompleteRequest {
  question_correct: boolean;
  question_type?: string;
  task_type?: string;
  pillar?: string;
  points_value?: number;
  answer_data?: Record<string, unknown>;
  submitted_at?: string;
}

export function useMissionComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompleteRequest) =>
      studentMutate<CompleteResponse>("/missions/complete", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.streak });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailySummary });
      queryClient.invalidateQueries({ queryKey: queryKeys.pointsBreakdown });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyProgress });
      queryClient.invalidateQueries({ queryKey: ["myScores"] });
    },
  });
}
