"use client";

import { useEffect, useState } from "react";
import { fetchLeads, LeadResult } from "@/lib/api";
import { AlertCircle, Users, ChevronDown, ChevronUp, Flame, Sun, Snowflake, Target } from "lucide-react";

const categoryGlow: Record<string, string> = {
  hot: "shadow-red-500/10 border-red-500/30 hover:border-red-500/50",
  warm: "shadow-amber-500/10 border-amber-500/30 hover:border-amber-500/50",
  cold: "shadow-blue-500/10 border-blue-500/30 hover:border-blue-500/50",
};

const categoryBadgeCls: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 border-red-500/30",
  warm: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const categoryIcon: Record<string, React.ReactNode> = {
  hot: <Flame size={14} className="text-red-400" />,
  warm: <Sun size={14} className="text-amber-400" />,
  cold: <Snowflake size={14} className="text-blue-400" />,
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score > 75
      ? "from-emerald-500 to-emerald-400 text-white"
      : score > 40
      ? "from-amber-500 to-amber-400 text-white"
      : "from-red-500 to-red-400 text-white";
  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-mono font-bold text-sm shadow-lg shrink-0`}>
      {score}
    </div>
  );
}

function SignalChips({ signals }: { signals: string | string[] }) {
  if (!signals) return null;
  const chips = (Array.isArray(signals) ? signals : signals.split(",").map((s) => s.trim())).filter(Boolean).slice(0, 4);
  const colors = [
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {chips.map((chip, i) => (
        <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${colors[i % colors.length]}`}>
          {chip}
        </span>
      ))}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadResult }) {
  const [expanded, setExpanded] = useState(false);
  const glowCls = categoryGlow[lead.ai_category] ?? "border-slate-700/40";
  const badgeCls = categoryBadgeCls[lead.ai_category] ?? "bg-slate-700/50 text-slate-300 border-slate-600";

  return (
    <div className={`rounded-xl border backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300 shadow-lg ${glowCls}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreBadge score={lead.ai_score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-slate-100 font-semibold text-base">
                {lead.first_name} {lead.last_name}
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${badgeCls}`}>
                {categoryIcon[lead.ai_category]}
                {lead.ai_category}
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-0.5">{lead.company || "Independent"} {lead.job_title ? `· ${lead.job_title}` : ""}</p>
            <p className="text-slate-500 text-xs mb-3">{lead.email}</p>
            <SignalChips signals={lead.key_signals} />
          </div>
        </div>
      </div>

      {/* Expandable draft email */}
      {lead.draft_email_subject && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 border-t border-slate-800/40 text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors"
          >
            <span>Draft Outreach Email</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="px-5 pb-5">
              <div className="bg-slate-950/60 border border-slate-700/40 rounded-lg p-4">
                <p className="text-slate-300 font-medium text-sm mb-2">
                  Subject: {lead.draft_email_subject}
                </p>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {lead.draft_email_body}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-lg animate-pulse">Loading leads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={40} />
          <p className="text-slate-300 text-lg font-medium mb-1">Failed to load leads</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const hotCount = leads.filter((l) => l.ai_category === "hot").length;
  const warmCount = leads.filter((l) => l.ai_category === "warm").length;
  const coldCount = leads.filter((l) => l.ai_category === "cold").length;

  const summaryCards = [
    { label: "Total Leads", count: leads.length, icon: Target, gradient: "from-emerald-500 to-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
    { label: "Hot Leads", count: hotCount, icon: Flame, gradient: "from-red-500 to-orange-400", bg: "bg-red-500/10", text: "text-red-400" },
    { label: "Warm Leads", count: warmCount, icon: Sun, gradient: "from-amber-500 to-amber-400", bg: "bg-amber-500/10", text: "text-amber-400" },
    { label: "Cold Leads", count: coldCount, icon: Snowflake, gradient: "from-blue-500 to-blue-400", bg: "bg-blue-500/10", text: "text-blue-400" },
  ];

  return (
    <div className="min-h-screen p-8" style={{ background: "linear-gradient(135deg, #0c1222 0%, #0a0f1a 50%, #0d1117 100%)" }}>
      <div className="mb-6">
        <h1 className="text-slate-100 font-bold text-2xl mb-1">Lead Scores</h1>
        <p className="text-slate-400 text-sm">
          AI-scored and categorized sales leads
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40 p-4 hover:bg-slate-900/60 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={18} className={card.text} />
                </div>
                <div>
                  <p className={`font-mono font-bold text-xl ${card.text}`}>{card.count}</p>
                  <p className="text-slate-500 text-xs">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Cards */}
      {leads.length === 0 ? (
        <div className="rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No leads scored yet.</p>
            <p className="text-slate-600 text-sm mt-1">Submit a contact form or run the lead scoring workflow.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
