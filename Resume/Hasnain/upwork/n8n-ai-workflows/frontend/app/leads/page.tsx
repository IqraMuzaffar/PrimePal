"use client";

import { useEffect, useState } from "react";
import { fetchLeads, LeadResult } from "@/lib/api";
import { AlertCircle, Users, ChevronDown, ChevronUp } from "lucide-react";

const categoryBadge: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 border-red-500/30",
  warm: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score > 75 ? "bg-emerald-500" : score > 40 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    score > 75 ? "text-emerald-400" : score > 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={`font-mono text-sm font-semibold ${textColor}`}>{score}</span>
    </div>
  );
}

function LeadRow({ lead }: { lead: LeadResult }) {
  const [expanded, setExpanded] = useState(false);
  const badgeCls = categoryBadge[lead.ai_category] ?? "bg-slate-700/50 text-slate-300 border-slate-600";

  return (
    <>
      <tr
        className="hover:bg-slate-800/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-4 text-slate-200 font-medium" style={{ fontSize: 16 }}>
          {lead.first_name} {lead.last_name}
          <p className="text-slate-500 text-xs font-normal mt-0.5">{lead.email}</p>
        </td>
        <td className="px-5 py-4 text-slate-300" style={{ fontSize: 16 }}>
          <p>{lead.company || "—"}</p>
          <p className="text-slate-500 text-xs mt-0.5">{lead.job_title}</p>
        </td>
        <td className="px-5 py-4">
          <ScoreBar score={lead.ai_score} />
        </td>
        <td className="px-5 py-4">
          <span
            className={`px-2 py-0.5 rounded-full border font-medium ${badgeCls}`}
            style={{ fontSize: 13 }}
          >
            {lead.ai_category}
          </span>
        </td>
        <td className="px-5 py-4 text-slate-400 max-w-[260px]" style={{ fontSize: 15 }}>
          <p className="truncate">{lead.ai_reasoning}</p>
        </td>
        <td className="px-5 py-4 text-slate-600">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-900/70">
          <td colSpan={6} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Full Reasoning</p>
                <p className="text-slate-300 text-sm leading-relaxed">{lead.ai_reasoning || "—"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Key Signals</p>
                <p className="text-slate-300 text-sm leading-relaxed">{lead.key_signals || "—"}</p>
              </div>
              {lead.draft_email_subject && (
                <div className="md:col-span-2">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1.5">Draft Email</p>
                  <div className="bg-slate-950/60 border border-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-300 font-medium text-sm mb-2">
                      Subject: {lead.draft_email_subject}
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                      {lead.draft_email_body}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-slate-100 font-bold mb-1" style={{ fontSize: 32 }}>
          Lead Scores
        </h1>
        <p className="text-slate-400" style={{ fontSize: 15 }}>
          AI-scored and categorized sales leads — click a row to expand
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No leads scored yet.</p>
            <p className="text-slate-600 text-sm mt-1">Submit a contact form or run the lead scoring workflow.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Name", "Company", "Score", "Category", "Reasoning", ""].map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-5 py-3.5 text-slate-500 font-semibold uppercase tracking-wider"
                      style={{ fontSize: 14 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {leads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
