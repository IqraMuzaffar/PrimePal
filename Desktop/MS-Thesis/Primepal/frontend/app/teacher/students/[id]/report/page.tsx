"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Download, TrendingUp, TrendingDown, Minus,
  BarChart3, BookOpen, Lightbulb, CheckCircle, AlertCircle, Star,
} from "lucide-react";
import { teacherFetch } from "@/lib/api-helpers";

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
  date_range: { from: string | null; to: string | null };
  trend: string;
  daily_scores: DailyScore[];
  engagement_level: string;
  strengths: string[];
  areas_for_improvement: string[];
  recommended_topics: string[];
  teacher_note: string;
}

type PageState = "loading" | "ready" | "error";

const PILLAR_CONFIG: Record<string, { label: string; color: string; bgColor: string; barColor: string }> = {
  reading:   { label: "Reading",   color: "text-emerald-600", bgColor: "bg-emerald-50", barColor: "#10b981" },
  writing:   { label: "Writing",   color: "text-violet-600",  bgColor: "bg-violet-50",  barColor: "#a855f7" },
  listening: { label: "Listening", color: "text-blue-600",    bgColor: "bg-blue-50",    barColor: "#0ea5e9" },
  speaking:  { label: "Speaking",  color: "text-rose-600",    bgColor: "bg-rose-50",    barColor: "#f43f5e" },
};

function TrendIcon({ trend, size = 20 }: { trend: string; size?: number }) {
  if (trend === "improving") return <TrendingUp size={size} className="text-emerald-600" />;
  if (trend === "declining") return <TrendingDown size={size} className="text-rose-600" />;
  return <Minus size={size} className="text-gray-400" />;
}

function TrendBadge({ trend }: { trend: string }) {
  const styles: Record<string, string> = {
    improving: "bg-emerald-100 text-emerald-700",
    declining: "bg-rose-100 text-rose-700",
    stable: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${styles[trend] ?? styles.stable}`}>
      <TrendIcon trend={trend} size={16} />
      {trend.charAt(0).toUpperCase() + trend.slice(1)}
    </span>
  );
}

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

export default function StudentReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get("classroomId") || "";

  const [state, setState] = useState<PageState>("loading");
  const [report, setReport] = useState<StudentDetailedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  const studentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const fetchReport = useCallback(async (range?: string) => {
    setState("loading");
    try {
      const r = range ?? dateRangeFilter;
      const { from, to } = getDateRange(r);
      let url = `/evaluator/report/student/${studentId}/detailed`;
      const qp = new URLSearchParams();
      if (from) qp.set("date_from", from);
      if (to) qp.set("date_to", to);
      if (qp.toString()) url += `?${qp.toString()}`;
      const data = await teacherFetch<StudentDetailedReport>(url);
      setReport(data);
      setState("ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load report";
      setError(msg);
      setState("error");
    }
  }, [studentId, dateRangeFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function handleDateRangeChange(range: string) {
    setDateRangeFilter(range);
    fetchReport(range);
  }

  const handleExportPDF = async () => {
    if (!report) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
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
      doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Trend: ${report.trend}`, margin, yPos);
      yPos += 8;

      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text("Student Information", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      const infoLines = [
        `Name: ${report.student_name}`,
        `Roll Number: ${report.roll_number || "---"}`,
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
        ["Trend", report.trend],
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
        PILLAR_CONFIG[p.pillar]?.label ?? p.pillar,
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
          doc.text(`- ${s}`, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 2;
      }

      if (report.areas_for_improvement.length > 0) {
        doc.text("Areas for Improvement:", margin, yPos);
        yPos += 6;
        report.areas_for_improvement.forEach((a) => {
          doc.text(`- ${a}`, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 2;
      }

      if (report.recommended_topics.length > 0) {
        doc.text("Recommended Topics:", margin, yPos);
        yPos += 6;
        report.recommended_topics.forEach((r) => {
          doc.text(`- ${r}`, margin + 5, yPos);
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
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Failed to export PDF. Please try again.");
    }
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
        {/* Header row */}
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
              <h1 className="text-3xl font-extrabold text-slate-800">Student Report</h1>
              <p className="text-slate-500 text-sm mt-1">{report.classroom_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range filter */}
            <select
              value={dateRangeFilter}
              onChange={e => handleDateRangeChange(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-indigo-600 text-white font-extrabold px-4 py-2 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg"
              title="Export as PDF"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Student identity card */}
        <div className="bg-white rounded-3xl shadow-md p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-indigo-100 flex-shrink-0">
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-indigo-600">
                {report.student_name[0]}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-slate-800">{report.student_name}</h2>
              {report.roll_number && (
                <p className="text-slate-600 text-sm">Roll: {report.roll_number}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="inline-block bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg text-sm">
                  Grade {report.grade_level}
                </span>
                <span className="flex items-center gap-1 text-amber-500 font-extrabold text-lg">
                  {report.total_points} Stars
                </span>
                <TrendBadge trend={report.trend} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Total Questions</p>
            <p className="text-4xl font-extrabold text-slate-800">{report.total_questions}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Overall Accuracy</p>
            <p className={`text-4xl font-extrabold ${report.overall_accuracy_pct >= 70 ? "text-emerald-600" : report.overall_accuracy_pct >= 40 ? "text-amber-600" : "text-rose-600"}`}>
              {report.overall_accuracy_pct}%
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Engagement</p>
            <p className="text-lg font-extrabold text-indigo-600 capitalize">{report.engagement_level}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Trend</p>
            <div className="flex items-center justify-center gap-2">
              <TrendIcon trend={report.trend} size={28} />
              <span className="text-lg font-extrabold text-slate-700 capitalize">{report.trend}</span>
            </div>
          </div>
        </div>

        {/* Pillar breakdown */}
        <div className="mb-8">
          <h3 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-500" />
            Pillar Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {["reading", "writing", "listening", "speaking"].map(pillarKey => {
              const stat = report.pillar_stats.find(p => p.pillar === pillarKey);
              const config = PILLAR_CONFIG[pillarKey] || {
                label: pillarKey, color: "text-slate-600", bgColor: "bg-slate-50", barColor: "#64748b",
              };
              return (
                <div key={pillarKey} className={`${config.bgColor} rounded-2xl p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-lg font-extrabold capitalize flex items-center gap-2 ${config.color}`}>
                      {config.label}
                    </h4>
                    {stat ? (
                      <span className={`text-2xl font-extrabold ${config.color}`}>{stat.accuracy_pct}%</span>
                    ) : (
                      <span className="text-sm text-slate-400">No data</span>
                    )}
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: stat ? `${stat.accuracy_pct}%` : "0%",
                        backgroundColor: config.barColor,
                      }}
                    />
                  </div>
                  {stat && (
                    <p className="text-sm text-slate-600 mt-3">{stat.correct} / {stat.total} correct</p>
                  )}
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

        {/* Daily Scores Timeline */}
        {report.daily_scores.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-500" />
              Daily Scores
            </h3>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Correct</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Total</th>
                      <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily_scores.slice(-14).map(ds => {
                      const acc = ds.total > 0 ? Math.round(ds.correct / ds.total * 100) : 0;
                      return (
                        <tr key={ds.date} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-700">{ds.date}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">{ds.correct}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">{ds.total}</td>
                          <td className="py-2.5 px-4 text-right">
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
          </div>
        )}

        {/* AI Insights */}
        <div className="bg-white rounded-3xl shadow-md p-8">
          <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            <Lightbulb size={20} className="text-amber-500" />
            AI Insights
          </h3>

          {/* Teacher note */}
          {report.teacher_note && (
            <blockquote className="border-l-4 border-indigo-300 pl-4 mb-6 text-slate-700 italic">
              {report.teacher_note}
            </blockquote>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {report.strengths.length > 0 && (
              <div>
                <p className="text-xs font-extrabold text-green-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <CheckCircle size={12} /> Strengths
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
              <div>
                <p className="text-xs font-extrabold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <AlertCircle size={12} /> Areas for Improvement
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
              <div>
                <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Star size={12} /> Recommended Topics
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
          </div>
        </div>
      </div>
    </div>
  );
}
