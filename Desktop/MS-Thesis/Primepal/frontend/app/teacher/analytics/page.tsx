import { getTeacherHeaders } from "@/lib/teacherAuth";
import { apiFetch } from "@/lib/api";
import TabbedDashboard from "@/components/teacher/TabbedDashboard";
import type { AnalyticsDashboardData, ClassroomInfo, SectionInfo } from "@/types/analytics";

interface StudentSummary {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  total_interactions: number;
  mission_accuracy_pct: number;
}

interface ClassroomReportResponse {
  classroom_id: string;
  grade_level: number;
  students: StudentSummary[];
}

interface PageProps {
  searchParams: Promise<{ grade?: string; pillar?: string }>;
}

async function fetchAnalyticsData(
  gradeLevel?: number,
  pillar?: string
): Promise<AnalyticsDashboardData> {
  try {
    const headers = await getTeacherHeaders();

    // Build query string for teacher report
    const reportParams = new URLSearchParams();
    if (gradeLevel) reportParams.set("grade_level", String(gradeLevel));
    const reportQs = reportParams.toString();
    const reportSuffix = reportQs ? `?${reportQs}` : "";

    // Fetch all classrooms (optionally filtered by grade)
    const classroomList = await apiFetch<
      Array<{ id: string; class_name: string; grade_level: number }>
    >("/classroom", { headers });

    // Filter classrooms client-side if grade filter is set
    const filteredClassrooms = gradeLevel
      ? classroomList.filter((c) => c.grade_level === gradeLevel)
      : classroomList;

    // Fetch analytics for each classroom
    const analyticsResults = await Promise.all(
      filteredClassrooms.map(async (room) => {
        try {
          const data = await apiFetch<ClassroomReportResponse>(
            `/evaluator/report/classroom/${room.id}`,
            { headers }
          );
          return {
            ...data,
            classroom_name: room.class_name,
          };
        } catch {
          return {
            classroom_id: room.id,
            classroom_name: room.class_name,
            grade_level: room.grade_level,
            students: [],
          };
        }
      })
    );

    // ── Aggregate data ─────────────────────────────────────────────────

    // All students across classrooms
    const allStudents = analyticsResults.flatMap((classroom) =>
      classroom.students.map((s) => ({
        ...s,
        classroom_id: classroom.classroom_id,
        classroom_name: classroom.classroom_name || "Unknown",
        grade_level: classroom.grade_level,
      }))
    );

    // Summary stats
    const totalInteractions = allStudents.reduce(
      (sum, s) => sum + s.total_interactions,
      0
    );
    const avgAccuracy =
      allStudents.length > 0
        ? allStudents.reduce((sum, s) => sum + s.mission_accuracy_pct, 0) /
          allStudents.length
        : 0;

    // Classroom infos
    const classrooms: ClassroomInfo[] = analyticsResults.map((classroom) => {
      const classroomStudents = classroom.students;
      return {
        id: classroom.classroom_id,
        name: classroom.classroom_name || "Unknown",
        grade: classroom.grade_level,
        studentCount: classroomStudents.length,
        avgAccuracy:
          classroomStudents.length > 0
            ? classroomStudents.reduce((sum, s) => sum + s.mission_accuracy_pct, 0) /
              classroomStudents.length
            : 0,
      };
    });

    // Top 5 students by accuracy
    const topStudents = allStudents
      .sort((a, b) => b.mission_accuracy_pct - a.mission_accuracy_pct)
      .slice(0, 5)
      .map((s) => ({
        id: s.student_id,
        name: s.student_name,
        avatarUrl: s.avatar_url,
        grade: s.grade_level,
        accuracy: s.mission_accuracy_pct,
        totalPoints: Math.round(s.total_interactions * 10), // Mock points calculation
      }));

    // Weak points per grade (mock data for now)
    const weakPointsByGrade: Record<number, string[]> = {
      1: ["Colors", "Numbers", "Animals"],
      2: ["Verbs", "Adjectives", "Food"],
      3: ["Sentences", "Tenses", "Prepositions"],
      4: ["Grammar", "Composition", "Vocabulary"],
      5: ["Complex sentences", "Literature", "Technical terms"],
    };

    // Student table data (first 50 students, sorted by points)
    const studentTableData = {
      items: allStudents
        .map((s) => ({
          id: s.student_id,
          name: s.student_name,
          rollNumber: `${Math.floor(Math.random() * 9000) + 1000}`, // Mock roll number
          grade: s.grade_level,
          className: s.classroom_name,
          classId: s.classroom_id,
          accuracy: s.mission_accuracy_pct,
          totalPoints: Math.round(s.total_interactions * 10),
          avatarUrl: s.avatar_url,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 50),
      totalCount: allStudents.length,
      pageSize: 50,
      currentPage: 1,
    };

    // Section infos (derived from classrooms + students)
    const sections: SectionInfo[] = classrooms.map((classroom, idx) => {
      const classroomStudents = allStudents.filter(
        (s) => s.classroom_id === classroom.id
      );
      const topStudent =
        classroomStudents.length > 0
          ? classroomStudents.reduce((best, s) =>
              s.mission_accuracy_pct > best.mission_accuracy_pct ? s : best
            )
          : null;

      return {
        grade: classroom.grade,
        section: String.fromCharCode(65 + idx), // A, B, C, ...
        sectionId: classroom.id,
        studentCount: classroomStudents.length,
        topStudentName: topStudent?.student_name || "—",
        topStudentAccuracy: topStudent?.mission_accuracy_pct || 0,
      };
    });

    return {
      summaryStats: {
        totalInteractions,
        totalStudents: allStudents.length,
        avgAccuracy: Math.round(avgAccuracy),
        activeClassrooms: classrooms.length,
      },
      classrooms,
      topStudents,
      weakPointsByGrade,
      studentTableData,
      sections,
    };
  } catch (error) {
    console.error("Failed to fetch analytics data:", error);
    // Return empty data structure on error
    return {
      summaryStats: {
        totalInteractions: 0,
        totalStudents: 0,
        avgAccuracy: 0,
        activeClassrooms: 0,
      },
      classrooms: [],
      topStudents: [],
      weakPointsByGrade: {},
      studentTableData: {
        items: [],
        totalCount: 0,
        pageSize: 50,
        currentPage: 1,
      },
      sections: [],
    };
  }
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const gradeLevel = resolvedParams.grade ? Number(resolvedParams.grade) : undefined;
  const pillar = resolvedParams.pillar || undefined;

  const data = await fetchAnalyticsData(gradeLevel, pillar);

  // Empty state
  if (data.summaryStats.activeClassrooms === 0) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Analytics</h1>
          <p className="text-gray-500 mb-8">
            Monitor all classrooms and student performance in one dashboard
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-24 text-gray-400">
            <p className="font-medium text-gray-500">No classrooms yet</p>
            <p className="text-sm mt-1">Create a classroom to start tracking analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  return <TabbedDashboard data={data} gradeLevel={gradeLevel} pillar={pillar} />;
}
