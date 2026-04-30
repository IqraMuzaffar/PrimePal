"use client";

import { useState } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";
import { Download, Eye, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type ExportType = "students" | "interactions" | "missions" | "evaluations";

const EXPORT_TYPES: { key: ExportType; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "interactions", label: "Interactions" },
  { key: "missions", label: "Missions" },
  { key: "evaluations", label: "Evaluations" },
];

const PILLARS = ["reading", "writing", "listening", "speaking"];

export default function DataExportPage() {
  const [exportType, setExportType] = useState<ExportType>("students");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [gradeLevel, setGradeLevel] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pillar, setPillar] = useState("");
  const [evaluationType, setEvaluationType] = useState("");
  const [studentId, setStudentId] = useState("");

  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const buildParams = () => {
    const params = new URLSearchParams();
    if (gradeLevel) params.set("grade_level", gradeLevel);
    if (studentId) params.set("student_id", studentId);

    if (exportType === "interactions" || exportType === "missions") {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (pillar) params.set("pillar", pillar);
    }

    if (exportType === "evaluations" && evaluationType) {
      params.set("evaluation_type", evaluationType);
    }

    return params;
  };

  const handlePreview = async () => {
    setError("");
    setPreviewLoading(true);
    setPreviewData([]);
    try {
      const headers = await getAdminHeaders();
      const params = buildParams();
      params.set("format", "json");
      const res = await fetch(
        `${API_BASE}/admin/export/${exportType}?${params.toString()}`,
        { headers }
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setPreviewData(data.slice(0, 10));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preview failed";
      setError(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    setError("");
    setDownloading(true);
    try {
      const headers = await getAdminHeaders();
      const params = buildParams();
      params.set("format", format);
      const res = await fetch(
        `${API_BASE}/admin/export/${exportType}?${params.toString()}`,
        { headers }
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      if (format === "json") {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        triggerDownload(blob, `${exportType}_export_${todayISO()}.json`);
      } else {
        const blob = await res.blob();
        triggerDownload(blob, `${exportType}_export_${todayISO()}.csv`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setError(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Download size={24} className="text-indigo-400" />
        <h2 className="text-2xl font-bold text-white">Data Export</h2>
      </div>

      {/* Export type tabs */}
      <div className="flex flex-wrap gap-2">
        {EXPORT_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setExportType(t.key);
              setPreviewData([]);
              setError("");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              exportType === t.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Filters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Grade level - always visible */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Grade Level</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">All Grades</option>
              {[1, 2, 3, 4, 5].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          {/* Student ID - always visible */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Optional UUID"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
            />
          </div>

          {/* Date range - interactions & missions */}
          {(exportType === "interactions" || exportType === "missions") && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pillar</label>
                <select
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">All Pillars</option>
                  {PILLARS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Evaluation type - evaluations only */}
          {exportType === "evaluations" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Evaluation Type
              </label>
              <select
                value={evaluationType}
                onChange={(e) => setEvaluationType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">All</option>
                <option value="pre">Pre-test</option>
                <option value="post">Post-test</option>
              </select>
            </div>
          )}

          {/* Format toggle */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat("csv")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  format === "csv"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                }`}
              >
                <FileSpreadsheet size={14} />
                CSV
              </button>
              <button
                onClick={() => setFormat("json")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  format === "json"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                }`}
              >
                <FileJson size={14} />
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePreview}
            disabled={previewLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm text-white font-medium transition disabled:opacity-50"
          >
            {previewLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Eye size={16} />
            )}
            Preview
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-medium transition disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Preview table */}
      {previewData.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-gray-300">
              Preview (first {previewData.length} rows)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-750 text-gray-400 text-xs uppercase">
                <tr>
                  {Object.keys(previewData[0]).map((col) => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {previewData.map((row, i) => (
                  <tr key={i} className="text-gray-300 hover:bg-slate-700/50">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-2.5 whitespace-nowrap max-w-[200px] truncate">
                        {val === null || val === undefined ? "" : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
