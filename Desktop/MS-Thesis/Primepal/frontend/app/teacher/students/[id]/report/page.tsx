"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Download } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface PillarStat {
  pillar: string;
  total: number;
  correct: number;
  accuracy_pct: number;
}

interface StudentDetailedReport {
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

const PILLAR_COLORS = {
  reading: { bg: "bg-emerald-50", badge: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", icon: "📚" },
  writing: { bg: "bg-violet-50", badge: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", icon: "✍️" },
  listening: { bg: "bg-blue-50", badge: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", icon: "👂" },
  speaking: { bg: "bg-rose-50", badge: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", icon: "🎤" },
};

const ENGAGEMENT_COLORS = {
  high: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

export default function StudentReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get("classroomId");

  const [report, setReport] = useState<StudentDetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const headers = await getTeacherHeaders();
        const data = await apiFetch<StudentDetailedReport>(
          `/evaluator/report/student/${params.id}/detailed`,
          { headers }
        );
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [params.id]);

  function exportToPDF() {
    if (!report) return;

    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 15;

      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("Student Report Card", margin, y);
      y += 8;

      // Student info
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Student: ${report.student_name}`, margin, y);
      y += 5;
      doc.text(`Classroom: ${report.classroom_name}`, margin, y);
      y += 5;
      doc.text(`Grade: ${report.grade_level}`, margin, y);
      y += 5;
      if (report.roll_number) {
        doc.text(`Roll Number: ${report.roll_number}`, margin, y);
        y += 5;
      }
      doc.text(`Total Points: ${report.total_points}`, margin, y);
      y += 8;

      // Overall stats
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Overall Performance", margin, y);
      y += 6;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`Total Questions: ${report.total_questions}`, margin, y);
      y += 5;
      doc.text(`Overall Accuracy: ${report.overall_accuracy_pct}%`, margin, y);
      y += 5;
      doc.text(`Engagement Level: ${report.engagement_level}`, margin, y);
      y += 8;

      // Pillar stats table
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Performance by Pillar", margin, y);
      y += 6;

      const pillarData = report.pillar_stats.map((p) => [
        p.pillar.charAt(0).toUpperCase() + p.pillar.slice(1),
        p.total.toString(),
        p.correct.toString(),
        `${p.accuracy_pct}%`,
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Pillar", "Total", "Correct", "Accuracy"]],
        body: pillarData,
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: 255,
          fontStyle: "bold",
        },
        bodyStyles: {
          textColor: [55, 65, 81],
        },
        alternateRowStyles: {
          fillColor: [243, 244, 246],
        },
        margin: { top: y },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Strengths
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Strengths", margin, y);
      y += 6;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      report.strengths.forEach((strength) => {
        y += 5;
        const lines = doc.splitTextToSize(`• ${strength}`, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 3;
      });

      y += 3;

      // Areas for Improvement
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Areas for Improvement", margin, y);
      y += 6;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      report.areas_for_improvement.forEach((area) => {
        y += 5;
        const lines = doc.splitTextToSize(`• ${area}`, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 3;
      });

      y += 3;

      // Recommended Topics
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Recommended Topics", margin, y);
      y += 6;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      report.recommended_topics.forEach((topic) => {
        y += 5;
        const lines = doc.splitTextToSize(`• ${topic}`, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 3;
      });

      y += 3;

      // Teacher Note
      if (report.teacher_note) {
        doc.setFont(undefined, "bold");
        doc.setFontSize(12);
        doc.text("Teacher Note", margin, y);
        y += 6;

        doc.setFont(undefined, "italic");
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(report.teacher_note, pageWidth - margin * 2);
        doc.text(noteLines, margin, y);
      }

      // Generate filename with date
      const date = new Date().toISOString().split("T")[0];
      doc.save(`report-${report.student_name.replace(/\s+/g, "-")}-${date}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error || "Report not found"}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                router.push(
                  classroomId
                    ? `/teacher/classroom/${classroomId}`
                    : "/teacher/analytics"
                )
              }
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Report</h1>
              <p className="text-sm text-gray-500">Detailed performance analysis</p>
            </div>
          </div>
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            <Download size={18} />
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            {report.avatar_url ? (
              <Image
                src={report.avatar_url}
                alt={report.student_name}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-3xl">
                ⭐
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{report.student_name}</h2>
              {report.roll_number && (
                <p className="text-sm text-gray-500">Roll: {report.roll_number}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  Grade {report.grade_level}
                </span>
                <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {report.classroom_name}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-indigo-600">
                {report.total_points}
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Stars
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-4"
        >
          {/* Total Questions */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-indigo-700">
              {report.total_questions}
            </div>
            <div className="text-xs font-medium text-gray-600 mt-1">
              Total Questions
            </div>
          </div>

          {/* Overall Accuracy */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-700">
              {report.overall_accuracy_pct}%
            </div>
            <div className="text-xs font-medium text-gray-600 mt-1">
              Overall Accuracy
            </div>
          </div>

          {/* Engagement */}
          <div
            className={`${
              report.engagement_level === "high"
                ? "bg-green-50 border-green-200"
                : report.engagement_level === "medium"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-red-50 border-red-200"
            } border rounded-xl p-4`}
          >
            <div
              className={`text-2xl font-bold ${
                report.engagement_level === "high"
                  ? "text-green-700"
                  : report.engagement_level === "medium"
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              {report.engagement_level.charAt(0).toUpperCase() +
                report.engagement_level.slice(1)}
            </div>
            <div className="text-xs font-medium text-gray-600 mt-1">
              Engagement Level
            </div>
          </div>
        </motion.div>

        {/* Pillar Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance by Pillar</h3>
          <div className="grid grid-cols-2 gap-4">
            {report.pillar_stats.map((pillar, idx) => {
              const colors =
                PILLAR_COLORS[pillar.pillar as keyof typeof PILLAR_COLORS] ||
                PILLAR_COLORS.reading;
              const accuracy = pillar.accuracy_pct;
              const accuracyColor =
                accuracy >= 70
                  ? "bg-green-100 text-green-700"
                  : accuracy >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700";

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{colors.icon}</span>
                      <div>
                        <h4 className={`text-sm font-bold capitalize ${colors.text}`}>
                          {pillar.pillar}
                        </h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {pillar.correct} of {pillar.total} correct
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white rounded-full h-3 overflow-hidden mb-3 border border-gray-200">
                    <div
                      className={`h-full ${
                        accuracy >= 70
                          ? "bg-green-500"
                          : accuracy >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(accuracy, 100)}%` }}
                    />
                  </div>

                  <div className={`text-center text-sm font-bold ${accuracyColor} px-3 py-1 rounded-lg`}>
                    {accuracy}% Accurate
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Strengths */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
              ✨ Strengths
            </h3>
            <div className="space-y-2">
              {report.strengths.length > 0 ? (
                report.strengths.map((strength, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + idx * 0.05 }}
                    className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-900"
                  >
                    {strength}
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No data yet</p>
              )}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
              🎯 Areas for Improvement
            </h3>
            <div className="space-y-2">
              {report.areas_for_improvement.length > 0 ? (
                report.areas_for_improvement.map((area, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-900"
                  >
                    {area}
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No data yet</p>
              )}
            </div>
          </div>

          {/* Recommended Topics */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
              📚 Recommended Topics
            </h3>
            <div className="space-y-2">
              {report.recommended_topics.length > 0 ? (
                report.recommended_topics.map((topic, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.05 }}
                    className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-900"
                  >
                    {topic}
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No data yet</p>
              )}
            </div>
          </div>

          {/* Teacher Note */}
          {report.teacher_note && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
                💬 Teacher Note
              </h3>
              <p className="text-sm text-gray-700 italic leading-relaxed">
                "{report.teacher_note}"
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
