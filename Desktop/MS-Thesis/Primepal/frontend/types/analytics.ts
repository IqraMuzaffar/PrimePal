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
}
