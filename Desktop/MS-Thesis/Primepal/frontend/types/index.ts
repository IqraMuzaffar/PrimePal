// frontend/types/index.ts
// Shared TypeScript types matching backend Pydantic schemas

export type UserRole = "teacher" | "student";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Updated: class_name (was "name"), grade_level is number (was string | null)
export interface Classroom {
  id: string;
  class_name: string;
  class_code: string;
  grade_level: number;
  created_at: string;
}

// Updated: student_name + avatar_url matching DB columns
export interface Student {
  id: string;
  student_name: string;
  avatar_url: string;
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
