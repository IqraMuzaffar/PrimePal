"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Download, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiFetch } from "@/lib/api";

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

type PageState = "loading" | "ready" | "error";

const PILLAR_CONFIG: Record<string, { emoji: string; color: string; bgColor: string }> = {
  reading: { emoji: "📚", color: "text-emerald-600", bgColor: "bg-emerald-50" },
  writing: { emoji: "✍️", color: "text-violet-600", bgColor: "bg-violet-50" },
  listening: { emoji: "👂", color: "text-blue-600", bgColor: "bg-blue-50" },
  speaking: { emoji: "🎤", color: "text-rose-600", bgColor: "bg-rose-50" },
};

export default function StudentReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get("classroomId") || "";

  const [state, setState] = useState<PageState>("loading");
  const [report, setReport] = useState<StudentDetailedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const studentId = Array.isArray(params.id) ? params.id[0] : params.id;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("primepal_teacher_token")
            : null;
        const data = await apiFetch<StudentDetailedReport>(
          `/evaluator/report/student/${studentId}/detailed`,
          {
            headers: { Authorization: `Bearer ${token ?? ""}` },
          }
        );
        setReport(data);
        setState("ready");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load report";
        setError(msg);
        setState("error");
      }
    };
    fetchReport();
  }, [params.id]);

  const handleExportPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;

    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Student Report Card", margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("Student Information", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const infoLines = [
      `Name: ${report.student_name}`,
      `Roll Number: ${report.roll_number || "—"}`,
      `Classroom: ${report.classroom_name}`,
      `Grade: ${report.grade_level}`,
      `Total Points: ${report.total_points}`,
    ];
    infoLines.forEach((line) => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });

    yPos += 4;

    const statsData = [
      ["Total Questions", report.total_questions.toString()],
      ["Overall Accuracy", `${report.overall_accuracy_pct}%`],
      ["Engagement Level", report.engagement_level],
    ];
    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: statsData,
      margin: margin,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("Pillar Breakdown", margin, yPos);
    yPos += 8;

    const pillarData = report.pillar_stats.map((p) => [
      p.pillar.charAt(0).toUpperCase() + p.pillar.slice(1),
      p.total.toString(),
      p.correct.toString(),
      `${p.accuracy_pct}%`,
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [["Pillar", "Total", "Correct", "Accuracy"]],
      body: pillarData,
      margin: margin,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("AI Insights", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(50);

    if (report.strengths.length > 0) {
      doc.text("Strengths:", margin, yPos);
      yPos += 6;
      report.strengths.forEach((s) => {
        doc.text(`• ${s}`, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    if (report.areas_for_improvement.length > 0) {
      doc.text("Areas for Improvement:", margin, yPos);
      yPos += 6;
      report.areas_for_improvement.forEach((a) => {
        doc.text(`• ${a}`, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    if (report.recommended_topics.length > 0) {
      doc.text("Recommended Topics:", margin, yPos);
      yPos += 6;
      report.recommended_topics.forEach((r) => {
        doc.text(`• ${r}`, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    if (report.teacher_note) {
      doc.text("Teacher Note:", margin, yPos);
      yPos += 6;
      const wrappedText = doc.splitTextToSize(report.teacher_note, pageWidth - 2 * margin);
      wrappedText.forEach((line: string) => {
        doc.text(line, margin + 5, yPos);
        yPos += 5;
      });
    }

    const filename = `report-${report.student_name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  };

  const goBack = () => {
    if (classroomId) {
      router.push(`/teacher/classroom/${classroomId}`);
    } else {
      router.back();
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading report...</p>
        </div>
      </div>
    );
  }

  if (state === "error" || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6 font-medium"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <p className="text-red-600 font-medium">Error loading report</p>
          <p className="text-slate-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">📊 Student Report</h1>
              <p className="text-slate-500 text-sm mt-1">{report.classroom_name}</p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-indigo-600 text-white font-extrabold px-4 py-2 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg"
            title="Export as PDF"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
              {report.avatar_url ? (
                <Image
                  src={report.avatar_url}
                  alt={report.student_name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">⭐</div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-slate-800">{report.student_name}</h2>
              {report.roll_number && (
                <p className="text-slate-600 text-sm">Roll: {report.roll_number}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg text-sm">
                  Grade {report.grade_level}
                </span>
                <span className="flex items-center gap-1 text-amber-500 font-extrabold text-lg">
                  ⭐ {report.total_points}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-2">
              Total Questions
            </p>
            <p className="text-4xl font-extrabold text-slate-800">{report.total_questions}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-2">
              Overall Accuracy
            </p>
            <p className="text-4xl font-extrabold text-emerald-600">{report.overall_accuracy_pct}%</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-2">
              Engagement Level
            </p>
            <p className="text-lg font-extrabold text-indigo-600 capitalize">
              {report.engagement_level}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Pillar Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.pillar_stats.map((pillar) => {
              const config = PILLAR_CONFIG[pillar.pillar] || {
                emoji: "📊",
                color: "text-slate-600",
                bgColor: "bg-slate-50",
              };
              return (
                <div key={pillar.pillar} className={`${config.bgColor} rounded-2xl p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-lg font-extrabold capitalize flex items-center gap-2 ${config.color}`}>
                      <span className="text-2xl">{config.emoji}</span>
                      {pillar.pillar}
                    </h4>
                    <span className={`text-2xl font-extrabold ${config.color}`}>
                      {pillar.accuracy_pct}%
                    </span>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pillar.accuracy_pct}%`,
                        backgroundColor:
                          pillar.pillar === "reading"
                            ? "#10b981"
                            : pillar.pillar === "writing"
                              ? "#a855f7"
                              : pillar.pillar === "listening"
                                ? "#0ea5e9"
                                : "#f43f5e",
                      }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 mt-3">
                    {pillar.correct} / {pillar.total} correct
                  </p>
                </div>
              );
            })}
            {report.pillar_stats.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-slate-400">No pillar data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-8">
          <h3 className="text-xl font-extrabold text-slate-800 mb-6">🤖 AI Insights</h3>

          {report.strengths.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-extrabold text-green-600 uppercase tracking-wide mb-3">
                Strengths
              </p>
              <div className="flex flex-wrap gap-2">
                {report.strengths.map((strength, i) => (
                  <span
                    key={i}
                    className="bg-green-50 text-green-700 font-medium text-sm px-3 py-1.5 rounded-lg border border-green-200"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.areas_for_improvement.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-extrabold text-amber-600 uppercase tracking-wide mb-3">
                Areas for Improvement
              </p>
              <div className="flex flex-wrap gap-2">
                {report.areas_for_improvement.map((area, i) => (
                  <span
                    key={i}
                    className="bg-amber-50 text-amber-700 font-medium text-sm px-3 py-1.5 rounded-lg border border-amber-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.recommended_topics.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-extrabold text-indigo-600 uppercase tracking-wide mb-3">
                Recommended Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {report.recommended_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="bg-indigo-50 text-indigo-700 font-medium text-sm px-3 py-1.5 rounded-lg border border-indigo-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.teacher_note && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm font-extrabold text-slate-600 uppercase tracking-wide mb-3">
                Teacher Note
              </p>
              <p className="text-slate-700 italic">{report.teacher_note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
