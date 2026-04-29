"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Search, ChevronDown, Download, Star, CheckCircle, AlertCircle, Lightbulb, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

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
  engagement_level: string;
  strengths: string[];
  areas_for_improvement: string[];
  recommended_topics: string[];
  teacher_note: string;
}

// ── Pillar config ────────────────────────────────────────────────────────────

const PILLAR_CONFIG: Record<string, { emoji: string; label: string; color: string; bar: string }> = {
  reading:   { emoji: "📚", label: "Reading",   color: "text-emerald-700", bar: "bg-emerald-500" },
  writing:   { emoji: "✍️",  label: "Writing",   color: "text-violet-700",  bar: "bg-violet-500" },
  listening: { emoji: "👂", label: "Listening", color: "text-sky-700",     bar: "bg-sky-500" },
  speaking:  { emoji: "🎤", label: "Speaking",  color: "text-rose-700",    bar: "bg-rose-500" },
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

    if (!jsPDF || !autoTable) {
      console.error("jsPDF or autoTable module not loaded correctly");
      return;
    }

    const doc = new jsPDF();
  const date = new Date().toLocaleDateString("en-PK");

  // Header
  doc.setFontSize(18);
  doc.setTextColor(67, 56, 202);
  doc.text("PrimePal — Student Report Card", 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Student: ${report.student_name}  |  Roll No: ${report.roll_number ?? "—"}`, 14, 28);
  doc.text(`Classroom: ${report.classroom_name}  |  Grade: ${report.grade_level}  |  Date: ${date}`, 14, 35);

  // Overall stats table
  autoTable(doc, {
    startY: 42,
    head: [["Total Questions", "Overall Accuracy", "Total Stars", "Engagement"]],
    body: [[
      report.total_questions,
      `${report.overall_accuracy_pct}%`,
      `⭐ ${report.total_points}`,
      report.engagement_level,
    ]],
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Pillar stats
  const afterStats = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Pillar Breakdown (LSRW)", 14, afterStats);

  autoTable(doc, {
    startY: afterStats + 4,
    head: [["Pillar", "Questions", "Correct", "Accuracy"]],
    body: report.pillar_stats.map(p => [
      `${PILLAR_CONFIG[p.pillar]?.emoji ?? ""} ${PILLAR_CONFIG[p.pillar]?.label ?? p.pillar}`,
      p.total,
      p.correct,
      `${p.accuracy_pct}%`,
    ]),
    headStyles: { fillColor: [99, 102, 241] },
  });

  // AI Insights
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

// ── Main Page ─────────────────────────────────────────────────────────────────

function ReportsContent() {
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("studentId");

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>(preselectedStudentId ?? "");
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load classrooms + all students on mount
  useEffect(() => {
    async function load() {
      try {
        const headers = await getTeacherHeaders();
        const [clsData, stuData] = await Promise.all([
          apiFetch<Classroom[]>("/classroom/", { headers }),
          apiFetch<{ students: StudentOption[] }>("/evaluator/students", { headers }),
        ]);
        setClassrooms(clsData);
        setStudents(stuData.students || []);

        // If a studentId was pre-selected via URL, auto-load report
        if (preselectedStudentId) {
          const preStudent = stuData.students.find(s => s.student_id === preselectedStudentId);
          if (preStudent) {
            setSelectedClassroom(preStudent.classroom_id);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingClassrooms(false);
      }
    }
    load();
  }, [preselectedStudentId]);

  // Auto-generate report when student is pre-selected via URL
  useEffect(() => {
    if (preselectedStudentId && students.length > 0 && !report && !loadingReport) {
      generateReport(preselectedStudentId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, preselectedStudentId]);

  const classroomStudents = selectedClassroom
    ? students.filter(s => s.classroom_id === selectedClassroom)
    : students;

  async function generateReport(studentId: string) {
    if (!studentId) return;
    setLoadingReport(true);
    setReportError(null);
    setReport(null);
    try {
      const headers = await getTeacherHeaders();
      const data = await apiFetch<DetailedReport>(
        `/evaluator/report/student/${studentId}/detailed`,
        { headers }
      );
      setReport(data);
    } catch {
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-6 lg:py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Student Report Cards
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Select a student to generate a full AI-powered learning report
          </p>
        </div>

        {/* Selector panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
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
                    <option key={c.id} value={c.id}>Grade {c.grade_level} — {c.class_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Student select */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Select Student
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={selectedStudent}
                  onChange={e => { setSelectedStudent(e.target.value); setReport(null); }}
                  className="w-full pl-8 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none"
                  disabled={loadingClassrooms}
                >
                  <option value="">— Choose a student —</option>
                  {classroomStudents.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_name}{s.roll_number ? ` (#${s.roll_number})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={() => generateReport(selectedStudent)}
              disabled={!selectedStudent || loadingReport}
              className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {loadingReport ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText size={15} />
                  Generate Report
                </>
              )}
            </button>
          </div>
          {loadingReport && (
            <p className="text-xs text-indigo-500 mt-3 text-center">
              AI is analysing student performance… this takes ~10 seconds
            </p>
          )}
        </div>

        {/* Error */}
        {reportError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">{reportError}</p>
          </div>
        )}

        {/* Report Card */}
        {report && (
          <div className="space-y-5">

            {/* Profile + export */}
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
                  <span className="text-sm font-bold text-amber-600">⭐ {report.total_points} Stars</span>
                </div>
              </div>
              <button
                onClick={() => exportPDF(report)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm transition-colors shrink-0"
              >
                <Download size={15} />
                Export PDF
              </button>
            </div>

            {/* Overall stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center col-span-2 sm:col-span-1">
                <p className="text-3xl font-bold text-indigo-600">⭐ {report.total_points}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Stars Earned</p>
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
                      <div key={pillarKey} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold text-sm ${cfg.color}`}>
                            {cfg.emoji} {cfg.label}
                          </span>
                          {stat ? (
                            <span className={`text-sm font-bold ${cfg.color}`}>{stat.accuracy_pct}%</span>
                          ) : (
                            <span className="text-xs text-gray-400">No activity</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
                          <div
                            className={`h-2 rounded-full ${cfg.bar} transition-all duration-500`}
                            style={{ width: stat ? `${stat.accuracy_pct}%` : "0%" }}
                          />
                        </div>
                        {stat && (
                          <p className="text-xs text-gray-400">{stat.correct} / {stat.total} correct</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                AI Insights
              </h3>

              {/* Teacher note */}
              <blockquote className="border-l-4 border-indigo-300 pl-4 text-sm italic text-gray-600">
                {report.teacher_note}
              </blockquote>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Strengths */}
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

                {/* Areas to improve */}
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

                {/* Recommended topics */}
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
