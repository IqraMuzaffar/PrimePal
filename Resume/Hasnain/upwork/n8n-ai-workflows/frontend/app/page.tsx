"use client";

import { useEffect, useState } from "react";
import { fetchStats, Stats } from "@/lib/api";
import {
  Mail,
  FileText,
  Users,
  Layers,
  AlertCircle,
  Info,
  Zap,
  Play,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const categoryIcon: Record<string, React.ReactNode> = {
  email: <Mail size={16} className="text-cyan-400" />,
  invoice: <FileText size={16} className="text-violet-400" />,
  lead: <Users size={16} className="text-amber-400" />,
  workflow: <Layers size={16} className="text-emerald-400" />,
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

const statusDot: Record<string, string> = {
  urgent: "bg-red-400 shadow-red-400/50",
  sales_lead: "bg-emerald-400 shadow-emerald-400/50",
  support: "bg-blue-400 shadow-blue-400/50",
  spam: "bg-slate-400 shadow-slate-400/50",
  hot: "bg-red-400 shadow-red-400/50",
  warm: "bg-amber-400 shadow-amber-400/50",
  cold: "bg-blue-400 shadow-blue-400/50",
  success: "bg-emerald-400 shadow-emerald-400/50",
  failed: "bg-red-400 shadow-red-400/50",
};

function relativeTime(timeStr: string): string {
  try {
    const now = new Date();
    const then = new Date(timeStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return timeStr;
  }
}

const trendData = [
  { change: "+12%", up: true },
  { change: "+8%", up: true },
  { change: "+5%", up: true },
  { change: "-3%", up: false },
];

function StatCard({
  label,
  value,
  sub,
  gradient,
  trendUp,
  trendText,
}: {
  label: string;
  value: number;
  sub: string;
  gradient: string;
  trendUp: boolean;
  trendText: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-700/40 p-5 backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300 group"
    >
      {/* Gradient top border */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${gradient}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 uppercase tracking-widest font-medium text-xs">
          {label}
        </p>
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendText}
        </div>
      </div>
      <p className="font-mono font-bold text-slate-100 mb-1" style={{ fontSize: 36, lineHeight: 1 }}>
        {value.toLocaleString()}
      </p>
      <p className="text-slate-500 text-sm">{sub}</p>
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

  const pipelineItems = [
    { label: "Emails Processed", value: stats.pipeline_summary.emails_processed, max: stats.total_processed || 100, color: "from-cyan-500 to-cyan-400", bg: "bg-cyan-500/10", text: "text-cyan-400" },
    { label: "Invoices Extracted", value: stats.pipeline_summary.invoices_extracted, max: stats.total_processed || 100, color: "from-violet-500 to-violet-400", bg: "bg-violet-500/10", text: "text-violet-400" },
    { label: "Leads Scored", value: stats.pipeline_summary.leads_scored, max: stats.total_processed || 100, color: "from-amber-500 to-amber-400", bg: "bg-amber-500/10", text: "text-amber-400" },
    { label: "Workflow Runs", value: stats.pipeline_summary.workflow_runs, max: stats.total_processed || 100, color: "from-emerald-500 to-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  ];

  const quickActions = [
    { title: "Classify Email", description: "Run AI classification on new emails", icon: Mail, href: "/emails", color: "from-cyan-500/20 to-cyan-600/5", border: "border-cyan-500/20 hover:border-cyan-500/40", iconColor: "text-cyan-400" },
    { title: "Extract Invoice", description: "Parse and extract invoice data", icon: FileText, href: "/invoices", color: "from-violet-500/20 to-violet-600/5", border: "border-violet-500/20 hover:border-violet-500/40", iconColor: "text-violet-400" },
    { title: "Score Lead", description: "AI-score a new sales lead", icon: Users, href: "/leads", color: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/20 hover:border-amber-500/40", iconColor: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0c1222 0%, #0a0f1a 50%, #0d1117 100%)" }}>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-600/5 to-violet-600/10" />
        <div className="relative px-8 py-7 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Zap className="text-emerald-400" size={24} />
              <h1 className="text-slate-100 font-bold text-2xl">FlowPilot AI</h1>
            </div>
            <p className="text-slate-400 text-sm">AI-Powered Business Automation</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium text-sm hover:bg-emerald-500/25 transition-all duration-200">
            <Play size={14} />
            Run Workflow
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Processed"
            value={stats.total_processed}
            sub="All time records"
            gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
            trendUp={trendData[0].up}
            trendText={`${trendData[0].change} this week`}
          />
          <StatCard
            label="Emails Classified"
            value={stats.emails.total}
            sub={`${stats.emails.urgent} urgent · ${stats.emails.spam} spam`}
            gradient="bg-gradient-to-r from-cyan-500 to-cyan-400"
            trendUp={trendData[1].up}
            trendText={`${trendData[1].change} this week`}
          />
          <StatCard
            label="Invoices Extracted"
            value={stats.invoices.total}
            sub={`${stats.invoices.pending_approval} pending approval`}
            gradient="bg-gradient-to-r from-violet-500 to-violet-400"
            trendUp={trendData[2].up}
            trendText={`${trendData[2].change} this week`}
          />
          <StatCard
            label="Leads Scored"
            value={stats.leads.total}
            sub={`${stats.leads.hot} hot · ${stats.leads.warm} warm`}
            gradient="bg-gradient-to-r from-amber-500 to-amber-400"
            trendUp={trendData[3].up}
            trendText={`${trendData[3].change} this week`}
          />
        </div>

        {/* Pipeline Summary with progress bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {pipelineItems.map((item) => {
            const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
            return (
              <div
                key={item.label}
                className="rounded-xl border border-slate-700/40 p-4 backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-300 text-sm font-medium">{item.label}</p>
                  <span className={`font-mono font-semibold text-sm ${item.text}`}>{item.value}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-slate-600 text-xs mt-1.5">{pct}% of total pipeline</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-slate-300 font-semibold text-base mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.title}
                  href={action.href}
                  className={`group relative rounded-xl border ${action.border} p-5 backdrop-blur-md bg-gradient-to-br ${action.color} transition-all duration-300 hover:scale-[1.02]`}
                >
                  <Icon size={24} className={`${action.iconColor} mb-3`} />
                  <h3 className="text-slate-200 font-semibold text-sm mb-1">{action.title}</h3>
                  <p className="text-slate-500 text-xs mb-3">{action.description}</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${action.iconColor} group-hover:gap-2 transition-all`}>
                    Run <ArrowUpRight size={12} />
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Today Stats */}
        <div className="mb-8 rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40 p-5">
          <h2 className="text-slate-300 font-semibold mb-4 text-base">
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
        <div className="rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/50">
            <h2 className="text-slate-300 font-semibold text-base">
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
            <div className="divide-y divide-slate-800/40">
              {stats.recent_activity.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/20 transition-all duration-200 cursor-default group">
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${statusDot[item.category] ?? "bg-slate-500"}`} />
                  {/* Icon */}
                  <span className="shrink-0 group-hover:scale-110 transition-transform duration-200">
                    {categoryIcon[item.type] ?? <Info size={16} className="text-slate-500" />}
                  </span>
                  {/* Description */}
                  <p className="flex-1 text-slate-300 text-sm font-medium">{item.description}</p>
                  {/* Badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      categoryColor[item.category] ?? "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                  >
                    {item.category.replace("_", " ")}
                  </span>
                  {/* Time */}
                  <span className="text-slate-600 text-xs whitespace-nowrap min-w-[70px] text-right">{relativeTime(item.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
