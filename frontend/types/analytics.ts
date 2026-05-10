// frontend/types/analytics.ts

export interface TopStudent {
  id: string;
  name: string;
  avatarUrl: string | null;
  grade: number;
  accuracy: number;
  totalPoints: number;
}

export interface StudentTableItem {
  id: string;
  name: string;
  rollNumber: string;
  grade: number;
  className: string;
  classId: string;
  accuracy: number;
  totalPoints: number;
  avatarUrl: string | null;
}

export interface SectionInfo {
  grade: number;
  section: string;
  sectionId: string;
  studentCount: number;
  topStudentName: string;
  topStudentAccuracy: number;
}

export interface ClassroomInfo {
  id: string;
  name: string;
  grade: number;
  studentCount: number;
  avgAccuracy: number;
}

export interface SummaryStats {
  totalInteractions: number;
  totalStudents: number;
  avgAccuracy: number;
  activeClassrooms: number;
}

export interface StudentTableData {
  items: StudentTableItem[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export interface AnalyticsDashboardData {
  summaryStats: SummaryStats;
  classrooms: ClassroomInfo[];
  topStudents: TopStudent[];
  weakPointsByGrade: Record<number, string[]>;
  studentTableData: StudentTableData;
  sections: SectionInfo[];
  fetchError?: boolean;
}

// Teacher Analytics Dashboard Types (new /api/v1/teacher/analytics endpoint)
export interface TeacherSummaryStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
  active_this_week: number;
}

export interface TeacherTopStudent {
  name: string;
  accuracy: number;
}

export interface TeacherGradeBreakdown {
  grade_level: number;
  student_count: number;
  avg_accuracy: number;
  total_interactions: number;
  top_student: TeacherTopStudent | null;
  struggling_count: number;
}

export interface TeacherPillarBreakdown {
  pillar: string;
  avg_accuracy: number;
  total_attempts: number;
  top_performers: number;
  needs_help: number;
}

export interface TeacherStudentRanking {
  student_id: string;
  name: string;
  avatar_url: string | null;
  grade_level: number;
  overall_accuracy: number;
  total_interactions: number;
  strongest_pillar?: string | null;
  weakest_pillar?: string | null;
  recent_activity?: string | null;
}

export interface TeacherWeeklyTrend {
  week_start: string;
  week_label: string;
  avg_accuracy: number;
  total_interactions: number;
}

export interface TeacherAnalyticsData {
  summary_stats: TeacherSummaryStats;
  grade_breakdown: TeacherGradeBreakdown[];
  pillar_breakdown: TeacherPillarBreakdown[];
  top_students: TeacherStudentRanking[];
  struggling_students: TeacherStudentRanking[];
  weekly_trends: TeacherWeeklyTrend[];
}
