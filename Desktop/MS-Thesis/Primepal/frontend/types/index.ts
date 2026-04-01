// Shared TypeScript types matching backend Pydantic schemas

export type UserRole = "teacher" | "student";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Classroom {
  id: string;
  name: string;
  class_code: string;
  grade_level: string | null;
}

export interface Student {
  id: string;
  display_name: string;
  avatar_id: string;
}

export type Pillar = "reading" | "writing" | "listening" | "speaking";

export interface Quest {
  id: string;
  week: number;
  grade: number;
  reading: QuestTask;
  writing: QuestTask;
  listening: QuestTask;
  speaking: QuestTask;
}

export interface QuestTask {
  pillar: Pillar;
  prompt: string;
  audio_url?: string;
}

export interface PillarScore {
  pillar: Pillar;
  score: number;
  feedback: string;
}

export interface StudentReport {
  student_id: string;
  scores: PillarScore[];
}

export interface ClassroomReport {
  classroom_id: string;
  pillar_averages: Record<Pillar, number>;
  incomplete_students: string[];
}
