"use client";

import { useEffect, useState } from "react";
import { fetchWorkflowRuns, WorkflowRun } from "@/lib/api";
import { AlertCircle, Activity } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "success"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : status === "failed"
      ? "bg-red-500/15 text-red-400 border-red-500/30"
      : "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span className={`px-2 py-0.5 rounded-full border font-medium ${cls}`} style={{ fontSize: 13 }}>
      {status}
    </span>
  );
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function WorkflowsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowRuns()
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-lg animate-pulse">Loading workflow runs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={40} />
          <p className="text-slate-300 text-lg font-medium mb-1">Failed to load workflow runs</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const successCount = runs.filter((r) => r.status === "success").length;
  const failedCount = runs.filter((r) => r.status === "failed").length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-slate-100 font-bold mb-1" style={{ fontSize: 32 }}>
          Workflow Runs
        </h1>
        <p className="text-slate-400" style={{ fontSize: 15 }}>
          Execution history for all n8n automation workflows
        </p>
      </div>

      {/* Summary row */}
      {runs.length > 0 && (
        <div className="flex gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-5 py-3">
            <p className="text-slate-500 text-xs mb-0.5">Total Runs</p>
            <p className="text-slate-100 font-mono font-bold text-xl">{runs.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-5 py-3">
            <p className="text-slate-500 text-xs mb-0.5">Successful</p>
            <p className="text-emerald-400 font-mono font-bold text-xl">{successCount}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-5 py-3">
            <p className="text-slate-500 text-xs mb-0.5">Failed</p>
            <p className="text-red-400 font-mono font-bold text-xl">{failedCount}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No workflow runs recorded yet.</p>
            <p className="text-slate-600 text-sm mt-1">Trigger a workflow in n8n to see run history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Workflow Name", "Status", "Items", "Duration", "Time"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-slate-500 font-semibold uppercase tracking-wider"
                      style={{ fontSize: 14 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 text-slate-200 font-medium" style={{ fontSize: 16 }}>
                      {run.workflow_name}
                      {run.error_message && (
                        <p className="text-red-400 text-xs mt-0.5 font-normal truncate max-w-[260px]">
                          {run.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-mono" style={{ fontSize: 16 }}>
                      {run.items_processed}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono" style={{ fontSize: 15 }}>
                      {formatDuration(run.duration_ms)}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                      {formatDate(run.run_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
