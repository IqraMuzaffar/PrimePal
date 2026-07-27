"use client";

import { useEffect, useState } from "react";
import { fetchStats, Stats } from "@/lib/api";
import {
  Mail,
  FileText,
  Users,
  Layers,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

const categoryIcon: Record<string, React.ReactNode> = {
  email: <Mail size={15} className="text-cyan-400" />,
  invoice: <FileText size={15} className="text-violet-400" />,
  lead: <Users size={15} className="text-amber-400" />,
  workflow: <Layers size={15} className="text-emerald-400" />,
};

const categoryColor: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  sales_lead: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  support: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  spam: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  hot: "bg-red-500/15 text-red-400 border-red-500/30",
  warm: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

function StatCard({
  label,
  value,
  sub,
  accentColor,
}: {
  label: string;
  value: number;
  sub: string;
  accentColor: string;
}) {
  return (
    <div
      className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 relative overflow-hidden"
      style={{ borderTopWidth: 2, borderTopColor: accentColor }}
    >
      <p
        className="text-slate-400 uppercase tracking-widest font-medium mb-3"
        style={{ fontSize: 14 }}
      >
        {label}
      </p>
      <p
        className="font-mono font-bold text-slate-100 mb-1"
        style={{ fontSize: 40, lineHeight: 1 }}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-slate-500" style={{ fontSize: 15 }}>
        {sub}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-lg animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={40} />
          <p className="text-slate-300 text-lg font-medium mb-1">Failed to load data</p>
          <p className="text-slate-500 text-sm">{error || "Unknown error"}</p>
          <p className="text-slate-600 text-xs mt-3">Make sure the backend is running on port 8000.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-100 font-bold mb-1" style={{ fontSize: 32 }}>
          Dashboard
        </h1>
        <p className="text-slate-400" style={{ fontSize: 15 }}>
          Overview of your n8n AI automation pipeline
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Processed"
          value={stats.total_processed}
          sub="All time records"
          accentColor="#10b981"
        />
        <StatCard
          label="Emails Classified"
          value={stats.emails.total}
          sub={`${stats.emails.urgent} urgent · ${stats.emails.spam} spam`}
          accentColor="#06b6d4"
        />
        <StatCard
          label="Invoices Extracted"
          value={stats.invoices.total}
          sub={`${stats.invoices.pending_approval} pending approval`}
          accentColor="#8b5cf6"
        />
        <StatCard
          label="Leads Scored"
          value={stats.leads.total}
          sub={`${stats.leads.hot} hot · ${stats.leads.warm} warm`}
          accentColor="#f59e0b"
        />
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Emails Processed", value: stats.pipeline_summary.emails_processed, color: "text-cyan-400" },
          { label: "Invoices Extracted", value: stats.pipeline_summary.invoices_extracted, color: "text-violet-400" },
          { label: "Leads Scored", value: stats.pipeline_summary.leads_scored, color: "text-amber-400" },
          { label: "Workflow Runs", value: stats.pipeline_summary.workflow_runs, color: "text-emerald-400" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-slate-900/30 border border-slate-800/50 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <CheckCircle2 size={16} className={item.color} />
            <div>
              <p className={`font-mono font-semibold text-lg ${item.color}`}>{item.value}</p>
              <p className="text-slate-500 text-xs">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today Stats */}
      <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h2 className="text-slate-300 font-semibold mb-4" style={{ fontSize: 18 }}>
          {"Today's Activity"}
        </h2>
        <div className="flex gap-8">
          <div>
            <p className="text-slate-500 text-sm mb-0.5">Emails</p>
            <p className="text-cyan-400 font-mono font-bold text-2xl">{stats.today.emails}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm mb-0.5">Invoices</p>
            <p className="text-violet-400 font-mono font-bold text-2xl">{stats.today.invoices}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm mb-0.5">Leads</p>
            <p className="text-amber-400 font-mono font-bold text-2xl">{stats.today.leads}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-slate-300 font-semibold" style={{ fontSize: 18 }}>
            Recent Activity
          </h2>
        </div>
        {stats.recent_activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Info className="text-slate-600 mb-3" size={32} />
            <p className="text-slate-500">No recent activity yet.</p>
            <p className="text-slate-600 text-sm mt-1">Run a workflow to see activity here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {stats.recent_activity.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                <span className="shrink-0">
                  {categoryIcon[item.type] ?? <Info size={15} className="text-slate-500" />}
                </span>
                <p className="flex-1 text-slate-300 text-sm">{item.description}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    categoryColor[item.category] ?? "bg-slate-700 text-slate-300 border-slate-600"
                  }`}
                  style={{ fontSize: 13 }}
                >
                  {item.category}
                </span>
                <span className="text-slate-600 text-xs whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
