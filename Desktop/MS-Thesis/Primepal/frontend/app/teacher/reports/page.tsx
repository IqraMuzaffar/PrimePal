"use client";

import { useState, Suspense, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText, Search, ChevronDown, Download, Star, CheckCircle,
  AlertCircle, Lightbulb, BookOpen, BarChart3, Users, TrendingUp,
  TrendingDown, Minus, ArrowLeft,
} from "lucide-react";
import { teacherFetch } from "@/lib/api-helpers";
import { useTeacherClassrooms, useTeacherStudents } from "@/lib/hooks/teacher-queries";

// ── Types ────────────────────────────────────────────────────────────────────

interface Classroom {
  id: string;
  class_name: string;
  grade_level: number;
}

interface StudentOption {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  classroom_id: string;
}

interface PillarStat {
  pillar: string;
  total: number;
  correct: number;
  accuracy_pct: number;
}

interface DailyScore {
  date: string;
  correct: number;
  total: number;
}

interface DetailedReport {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  avatar_url: string | null;
  classroom_name: string;
  grade_level: number;
  total_points: number;
  total_questions: number;
  overall_accuracy_pct: number;
  pillar_stats: PillarStat[];
  date_range: { from: string | null; to: string | null };
  trend: string;
  daily_scores: DailyScore[];
  engagement_level: string;
  strengths: string[];
  areas_for_improvement: string[];
  recommended_topics: string[];
  teacher_note: string;
}

interface GradeReport {
  grade_level: number;
  total_students: number;
  total_interactions: number;
  overall_accuracy_pct: number;
  pillar_accuracy: Record<string, number>;
  top_weak_topics: string[];
  top_strong_topics: string[];
  quartiles: { top_25: number; middle_50: number; bottom_25: number };
  student_count_by_proficiency: { proficient: number; developing: number; struggling: number };
  ai_summary: string;
}

type View = "home" | "grade" | "student";

// ── Pillar config ────────────────────────────────────────────────────────────

const PILLAR_CONFIG: Record<string, { label: string; color: string; bar: string; bg: string }> = {
  reading:   { label: "Reading",   color: "text-emerald-700", bar: "bg-emerald-500", bg: "bg-emerald-50" },
  writing:   { label: "Writing",   color: "text-violet-700",  bar: "bg-violet-500",  bg: "bg-violet-50" },
  listening: { label: "Listening", color: "text-sky-700",     bar: "bg-sky-500",     bg: "bg-sky-50" },
  speaking:  { label: "Speaking",  color: "text-rose-700",    bar: "bg-rose-500",    bg: "bg-rose-50" },
};

const ENGAGEMENT_STYLE: Record<string, string> = {
  High:   "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Low:    "bg-rose-100 text-rose-700",
};

// ── PDF Export ───────────────────────────────────────────────────────────────

async function exportPDF(report: DetailedReport) {
  try {
    const jsPDFModule = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    const autoTable = autoTableModule.default || autoTableModule;
    if (!jsPDF || !autoTable) return;

    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("en-PK");

    doc.setFontSize(18);
    doc.setTextColor(67, 56, 202);
    doc.text("PrimePal — Student Report Card", 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Student: ${report.student_name}  |  Roll No: ${report.roll_number ?? "—"}`, 14, 28);
    doc.text(`Classroom: ${report.classroom_name}  |  Grade: ${report.grade_level}  |  Date: ${date}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [["Total Questions", "Overall Accuracy", "Total Stars", "Engagement", "Trend"]],
      body: [[
        report.total_questions,
        `${report.overall_accuracy_pct}%`,
        report.total_points,
        report.engagement_level,
        report.trend,
      ]],
      headStyles: { fillColor: [79, 70, 229] },
    });

    const afterStats = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text("Pillar Breakdown (LSRW)", 14, afterStats);

    autoTable(doc, {
      startY: afterStats + 4,
      head: [["Pillar", "Questions", "Correct", "Accuracy"]],
      body: report.pillar_stats.map(p => [
        PILLAR_CONFIG[p.pillar]?.label ?? p.pillar,
        p.total,
        p.correct,
        `${p.accuracy_pct}%`,
      ]),
      headStyles: { fillColor: [99, 102, 241] },
    });

    const afterPillar = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text("AI Insights", 14, afterPillar);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    let y = afterPillar + 6;
    doc.text("Teacher Note:", 14, y);
    y += 5;
    const noteLines = doc.splitTextToSize(report.teacher_note, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 5;

    doc.text("Strengths: " + report.strengths.join("; "), 14, y);
    y += 6;
    doc.text("Areas for Improvement: " + report.areas_for_improvement.join("; "), 14, y);
    y += 6;
    doc.text("Recommended Topics: " + report.recommended_topics.join(", "), 14, y);

    doc.save(`report-${report.student_name.replace(/\s+/g, "-")}-${date}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    alert("Failed to export PDF. Please try again.");
  }
}

// ── Date Range Helper ────────────────────────────────────────────────────────

function getDateRange(range: string): { from: string | null; to: string | null } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { from: d.toISOString().split("T")[0], to };
  }
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: d.toISOString().split("T")[0], to };
  }
  return { from: null, to: null };
}

// ── Trend Icon ───────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="w-5 h-5 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="w-5 h-5 text-rose-600" />;
  return <Minus className="w-5 h-5 text-gray-400" />;
}

function TrendBadge({ trend }: { trend: string }) {
  const styles: Record<string, string> = {
    improving: "bg-emerald-100 text-emerald-700",
    declining: "bg-rose-100 text-rose-700",
    stable: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${styles[trend] ?? styles.stable}`}>
      <TrendIcon trend={trend} />
      {trend.charAt(0).toUpperCase() + trend.slice(1)}
    </span>
  );
}

// ── Accuracy Bar ─────────────────────────────────────────────────────────────

function AccuracyBar({ label, value, color, barColor }: { label: string; value: number; color: string; barColor: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

function ReportsContent() {
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("studentId");

  const [view, setView] = useState<View>(preselectedStudentId ? "student" : "home");

  // Grade report state
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [gradeReport, setGradeReport] = useState<GradeReport | null>(null);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Student report state
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>(preselectedStudentId ?? "");
  const [studentSearch, setStudentSearch] = useState("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [autoGenerateDone, setAutoGenerateDone] = useState(false);

  const { data: classroomsData = [], isLoading: loadingClassrooms } = useTeacherClassrooms();
  const classrooms = classroomsData as Classroom[];
  const { data: studentsData } = useTeacherStudents({});
  const students: StudentOption[] = (studentsData?.students ?? []).map(s => ({
    student_id: s.student_id,
    student_name: s.student_name,
    roll_number: s.roll_number,
    classroom_id: s.classroom_id,
  }));

  // Get unique grade levels from classrooms
  const gradeSet = new Set(classrooms.map(c => c.grade_level));
  const grades = Array.from(gradeSet).sort((a, b) => a - b);

  // Filtered students for student search
  const filteredStudents = students.filter(s => {
    if (selectedClassroom && s.classroom_id !== selectedClassroom) return false;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      return s.student_name.toLowerCase().includes(q) || (s.roll_number?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  // ── Grade Report ──
  async function loadGradeReport(grade: number) {
    setSelectedGrade(grade);
    setView("grade");
    setLoadingGrade(true);
    setGradeError(null);
    setGradeReport(null);
    try {
      const data = await teacherFetch<GradeReport>(`/evaluator/report/grade/${grade}`);
      setGradeReport(data);
    } catch {
      setGradeError("Failed to load grade report. Please try again.");
    } finally {
      setLoadingGrade(false);
    }
  }

  async function downloadGradeCSV(grade: number) {
    try {
      const { getTeacherHeaders } = await import("@/lib/teacherAuth");
      const headers = await getTeacherHeaders();
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const res = await fetch(`${BASE_URL}/evaluator/report/grade/${grade}/csv`, { headers });
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grade-${grade}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export CSV. Please try again.");
    }
  }

  // ── Student Report ──
  const generateStudentReport = useCallback(async (studentId: string, range?: string) => {
    if (!studentId) return;
    setLoadingReport(true);
    setReportError(null);
    setReport(null);
    try {
      const r = range ?? dateRange;
      const { from, to } = getDateRange(r);
      let url = `/evaluator/report/student/${studentId}/detailed`;
      const params = new URLSearchParams();
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      if (params.toString()) url += `?${params.toString()}`;
      const data = await teacherFetch<DetailedReport>(url);
      setReport(data);
      setView("student");
    } catch {
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  }, [dateRange]);

  function handleDateRangeChange(range: string) {
    setDateRange(range);
    if (selectedStudent) {
      generateStudentReport(selectedStudent, range);
    }
  }

  // Set classroom and auto-generate when pre-selected student data loads
  useEffect(() => {
    if (!preselectedStudentId || students.length === 0) return;
    const preStudent = students.find(s => s.student_id === preselectedStudentId);
    if (preStudent && !selectedClassroom) setSelectedClassroom(preStudent.classroom_id);
  }, [students, preselectedStudentId, selectedClassroom]);

  useEffect(() => {
    if (!preselectedStudentId || students.length === 0 || report || loadingReport || autoGenerateDone) return;
    setAutoGenerateDone(true);
    generateStudentReport(preselectedStudentId);
  }, [students, preselectedStudentId, report, loadingReport, autoGenerateDone, generateStudentReport]);

  // ── Render ──
  return (
    <div className="bg-gray-50 min-h-full">
      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">

        {/* Header with back button when not on home */}
        <div className="mb-6 flex items-center gap-3">
          {view !== "home" && (
            <button
              onClick={() => { setView("home"); setReport(null); setGradeReport(null); }}
              className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              {view === "home" && "Reports"}
              {view === "grade" && `Grade ${selectedGrade} Report`}
              {view === "student" && "Student Report Card"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {view === "home" && "View grade-level summaries or individual student reports"}
              {view === "grade" && "Aggregate performance across all sections"}
              {view === "student" && "AI-powered learning report with trend analysis"}
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HOME VIEW                                                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {view === "home" && (
          <div className="space-y-6">

            {/* Grade Reports Section */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Grade Reports
              </h2>
              {grades.length === 0 && !loadingClassrooms ? (
                <p className="text-sm text-gray-400">No classrooms found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {grades.map(g => (
                    <button
                      key={g}
                      onClick={() => loadGradeReport(g)}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all text-center group"
                    >
                      <p className="text-3xl font-bold text-indigo-600 group-hover:scale-110 transition-transform">{g}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Grade {g}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Student Search Section */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Individual Student Report
              </h2>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  {/* Classroom filter */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Classroom (optional)
                    </label>
                    <div className="relative">
                      <select
                        value={selectedClassroom}
                        onChange={e => { setSelectedClassroom(e.target.value); setSelectedStudent(""); setReport(null); }}
                        className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none"
                      >
                        <option value="">All Classrooms</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>Grade {c.grade_level} - {c.class_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Student search/select */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Search / Select Student
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Type to search..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                    {studentSearch && filteredStudents.length > 0 && (
                      <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {filteredStudents.slice(0, 10).map(s => (
                          <button
                            key={s.student_id}
                            onClick={() => {
                              setSelectedStudent(s.student_id);
                              setStudentSearch(s.student_name);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors"
                          >
                            {s.student_name}{s.roll_number ? ` (#${s.roll_number})` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                    {!studentSearch && (
                      <div className="relative mt-1">
                        <select
                          value={selectedStudent}
                          onChange={e => setSelectedStudent(e.target.value)}
                          className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none"
                          disabled={loadingClassrooms}
                        >
                          <option value="">-- Choose a student --</option>
                          {filteredStudents.map(s => (
                            <option key={s.student_id} value={s.student_id}>
                              {s.student_name}{s.roll_number ? ` (#${s.roll_number})` : ""}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={() => generateStudentReport(selectedStudent)}
                    disabled={!selectedStudent || loadingReport}
                    className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
                  >
                    {loadingReport ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText size={15} />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* GRADE REPORT VIEW                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {view === "grade" && (
          <div className="space-y-5">
            {loadingGrade && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Generating grade report with AI summary...</p>
                </div>
              </div>
            )}

            {gradeError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-sm text-rose-700">{gradeError}</p>
              </div>
            )}

            {gradeReport && (
              <>
                {/* Summary stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-3xl font-bold text-gray-900">{gradeReport.total_students}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Total Students</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-3xl font-bold text-gray-900">{gradeReport.total_interactions}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Total Interactions</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className={`text-3xl font-bold ${gradeReport.overall_accuracy_pct >= 70 ? "text-emerald-600" : gradeReport.overall_accuracy_pct >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                      {gradeReport.overall_accuracy_pct}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Overall Accuracy</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <button
                      onClick={() => downloadGradeCSV(selectedGrade)}
                      className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm transition-colors"
                    >
                      <Download size={15} />
                      Export CSV
                    </button>
                    <p className="text-xs text-gray-500 mt-2 font-medium">Download Data</p>
                  </div>
                </div>

                {/* Pillar accuracy */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Pillar Accuracy
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {["reading", "writing", "listening", "speaking"].map(p => {
                      const cfg = PILLAR_CONFIG[p];
                      const val = gradeReport.pillar_accuracy[p] ?? 0;
                      return (
                        <AccuracyBar key={p} label={cfg.label} value={val} color={cfg.color} barColor={cfg.bar} />
                      );
                    })}
                  </div>
                </div>

                {/* Proficiency + Quartiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Proficiency distribution */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Proficiency Distribution</h3>
                    <div className="space-y-3">
                      {[
                        { key: "proficient", label: "Proficient (>70%)", color: "bg-emerald-500", textColor: "text-emerald-700" },
                        { key: "developing", label: "Developing (40-70%)", color: "bg-amber-500", textColor: "text-amber-700" },
                        { key: "struggling", label: "Struggling (<40%)", color: "bg-rose-500", textColor: "text-rose-700" },
                      ].map(level => {
                        const count = gradeReport.student_count_by_proficiency[level.key as keyof typeof gradeReport.student_count_by_proficiency] ?? 0;
                        const pct = gradeReport.total_students > 0 ? Math.round(count / gradeReport.total_students * 100) : 0;
                        return (
                          <div key={level.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold ${level.textColor}`}>{level.label}</span>
                              <span className="text-sm font-bold text-gray-700">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${level.color} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quartiles */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Performance Quartiles</h3>
                    <div className="space-y-4">
                      {[
                        { key: "top_25", label: "Top 25%", color: "bg-emerald-100 text-emerald-700", icon: "text-emerald-500" },
                        { key: "middle_50", label: "Middle 50%", color: "bg-blue-100 text-blue-700", icon: "text-blue-500" },
                        { key: "bottom_25", label: "Bottom 25%", color: "bg-rose-100 text-rose-700", icon: "text-rose-500" },
                      ].map(q => {
                        const count = gradeReport.quartiles[q.key as keyof typeof gradeReport.quartiles] ?? 0;
                        return (
                          <div key={q.key} className={`flex items-center justify-between rounded-xl p-3 ${q.color}`}>
                            <span className="text-sm font-semibold">{q.label}</span>
                            <span className="text-lg font-bold">{count} students</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Strong / Weak topics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Strongest Areas
                    </h3>
                    <div className="space-y-2">
                      {gradeReport.top_strong_topics.map((t, i) => (
                        <span key={i} className="inline-block mr-2 bg-emerald-50 text-emerald-700 font-medium text-sm px-3 py-1.5 rounded-lg capitalize">
                          {t}
                        </span>
                      ))}
                      {gradeReport.top_strong_topics.length === 0 && (
                        <p className="text-sm text-gray-400">No data yet</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Needs Attention
                    </h3>
                    <div className="space-y-2">
                      {gradeReport.top_weak_topics.map((t, i) => (
                        <span key={i} className="inline-block mr-2 bg-amber-50 text-amber-700 font-medium text-sm px-3 py-1.5 rounded-lg capitalize">
                          {t}
                        </span>
                      ))}
                      {gradeReport.top_weak_topics.length === 0 && (
                        <p className="text-sm text-gray-400">No data yet</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    AI Summary
                  </h3>
                  <blockquote className="border-l-4 border-indigo-300 pl-4 text-sm text-gray-600 italic">
                    {gradeReport.ai_summary}
                  </blockquote>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STUDENT REPORT VIEW                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {view === "student" && (
          <div className="space-y-5">
            {/* Loading state */}
            {loadingReport && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">AI is analysing student performance...</p>
                </div>
              </div>
            )}

            {/* Error */}
            {reportError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <p className="text-sm text-rose-700">{reportError}</p>
              </div>
            )}

            {report && (
              <>
                {/* Profile + date filter + export */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
                    {report.student_name[0]}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{report.student_name}</h2>
                    <p className="text-sm text-gray-500">
                      {report.roll_number ? `Roll #${report.roll_number}  ·  ` : ""}{report.classroom_name}  ·  Grade {report.grade_level}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ENGAGEMENT_STYLE[report.engagement_level] ?? "bg-gray-100 text-gray-600"}`}>
                        {report.engagement_level} Engagement
                      </span>
                      <TrendBadge trend={report.trend} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Date range filter */}
                    <select
                      value={dateRange}
                      onChange={e => handleDateRangeChange(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="all">All Time</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                    </select>
                    <button
                      onClick={() => exportPDF(report)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm transition-colors"
                    >
                      <Download size={15} />
                      Export PDF
                    </button>
                  </div>
                </div>

                {/* Overall stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-3xl font-bold text-gray-900">{report.total_questions}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Total Questions</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className={`text-3xl font-bold ${report.overall_accuracy_pct >= 70 ? "text-emerald-600" : report.overall_accuracy_pct >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                      {report.overall_accuracy_pct}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Overall Accuracy</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-3xl font-bold text-indigo-600">{report.total_points}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Stars Earned</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center flex flex-col items-center justify-center">
                    <TrendIcon trend={report.trend} />
                    <p className="text-sm font-bold text-gray-700 mt-1 capitalize">{report.trend}</p>
                    <p className="text-xs text-gray-500 font-medium">Trend</p>
                  </div>
                </div>

                {/* Pillar breakdown */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Pillar Breakdown (LSRW)
                  </h3>
                  {report.pillar_stats.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No pillar activity recorded yet</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {["reading", "writing", "listening", "speaking"].map(pillarKey => {
                        const stat = report.pillar_stats.find(p => p.pillar === pillarKey);
                        const cfg = PILLAR_CONFIG[pillarKey];
                        return (
                          <div key={pillarKey} className={`border border-gray-100 rounded-xl p-4 ${cfg.bg}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-semibold text-sm ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              {stat ? (
                                <span className={`text-sm font-bold ${cfg.color}`}>{stat.accuracy_pct}%</span>
                              ) : (
                                <span className="text-xs text-gray-400">No activity</span>
                              )}
                            </div>
                            <div className="w-full bg-white/60 rounded-full h-2.5 mb-1.5">
                              <div
                                className={`h-2.5 rounded-full ${cfg.bar} transition-all duration-500`}
                                style={{ width: stat ? `${stat.accuracy_pct}%` : "0%" }}
                              />
                            </div>
                            {stat && (
                              <p className="text-xs text-gray-500">{stat.correct} / {stat.total} correct</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Daily Scores Timeline */}
                {report.daily_scores.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      Daily Scores
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Correct</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.daily_scores.slice(-14).map(ds => {
                            const acc = ds.total > 0 ? Math.round(ds.correct / ds.total * 100) : 0;
                            return (
                              <tr key={ds.date} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium text-gray-700">{ds.date}</td>
                                <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{ds.correct}</td>
                                <td className="py-2 px-3 text-right text-gray-600">{ds.total}</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`font-bold ${acc >= 70 ? "text-emerald-600" : acc >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                                    {acc}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    AI Insights
                  </h3>

                  <blockquote className="border-l-4 border-indigo-300 pl-4 text-sm italic text-gray-600">
                    {report.teacher_note}
                  </blockquote>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <CheckCircle size={12} /> Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {report.strengths.map((s, i) => (
                          <li key={i} className="text-xs bg-emerald-50 text-emerald-800 rounded-lg px-3 py-1.5 font-medium">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <AlertCircle size={12} /> Needs Work
                      </h4>
                      <ul className="space-y-1.5">
                        {report.areas_for_improvement.map((s, i) => (
                          <li key={i} className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-1.5 font-medium">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Star size={12} /> Recommended Topics
                      </h4>
                      <ul className="space-y-1.5">
                        {report.recommended_topics.map((s, i) => (
                          <li key={i} className="text-xs bg-indigo-50 text-indigo-800 rounded-lg px-3 py-1.5 font-medium">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-full py-20">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
