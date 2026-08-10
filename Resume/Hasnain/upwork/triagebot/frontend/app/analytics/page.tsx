"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    apiFetch(`/analytics/summary?days=${days}`).then(setData).catch(() => {});
  }, [days]);

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 block">{"\u2190"} Back to Queue</Link>
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1 rounded text-sm ${days === d ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
            {d} days
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold">{data.total}</p>
          <p className="text-sm text-gray-500">Total Triages</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold">{data.avg_triage_seconds ? `${Math.round(data.avg_triage_seconds / 60)}m` : "\u2014"}</p>
          <p className="text-sm text-gray-500">Avg Triage Time</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold">{data.top_departments?.[0]?.department || "\u2014"}</p>
          <p className="text-sm text-gray-500">Top Department</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-semibold mb-2">Severity Breakdown</h2>
        <div className="flex gap-4">
          {(data.severity_breakdown || []).map((s: any) => (
            <div key={s.severity} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${s.severity === "red" ? "bg-red-600" : s.severity === "yellow" ? "bg-yellow-500" : "bg-green-600"}`} />
              <span className="text-sm">{s.severity}: {s.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold mb-2">Top Departments</h2>
        {(data.top_departments || []).map((d: any) => (
          <div key={d.department} className="flex justify-between py-1 border-b last:border-0">
            <span className="text-sm">{d.department}</span>
            <span className="text-sm font-medium">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
