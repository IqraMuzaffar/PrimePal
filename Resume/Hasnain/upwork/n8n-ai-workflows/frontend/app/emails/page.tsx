"use client";

import { useEffect, useState } from "react";
import { fetchEmails, EmailResult } from "@/lib/api";
import { AlertCircle, Mail, Plus, Shield, Tag, Headphones, Trash2 } from "lucide-react";

const categoryBadge: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  sales_lead: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  support: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  spam: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const categoryBorder: Record<string, string> = {
  urgent: "border-l-red-500",
  sales_lead: "border-l-emerald-500",
  support: "border-l-blue-500",
  spam: "border-l-slate-600",
};

const categoryIconMap: Record<string, React.ReactNode> = {
  urgent: <Shield size={14} className="text-red-400" />,
  sales_lead: <Tag size={14} className="text-emerald-400" />,
  support: <Headphones size={14} className="text-blue-400" />,
  spam: <Trash2 size={14} className="text-slate-400" />,
};

const tabs = ["All", "Urgent", "Sales Lead", "Support", "Spam"] as const;
const tabToCategory: Record<string, string> = {
  "All": "",
  "Urgent": "urgent",
  "Sales Lead": "sales_lead",
  "Support": "support",
  "Spam": "spam",
};

function Badge({ category }: { category: string }) {
  const cls = categoryBadge[category] ?? "bg-slate-700/50 text-slate-300 border-slate-600";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium text-xs ${cls}`}>
      {categoryIconMap[category] ?? <Mail size={12} />}
      {category.replace("_", " ")}
    </span>
  );
}

function relativeTime(iso: string): string {
  try {
    const now = new Date();
    const then = new Date(iso);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return iso;
  }
}

function AvatarCircle({ name }: { name: string }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  const colors = ["from-cyan-500 to-blue-500", "from-violet-500 to-purple-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500"];
  const idx = letter.charCodeAt(0) % colors.length;
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
      {letter}
    </div>
  );
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    fetchEmails()
      .then(setEmails)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-lg animate-pulse">Loading emails...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={40} />
          <p className="text-slate-300 text-lg font-medium mb-1">Failed to load emails</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const filtered = activeTab === "All"
    ? emails
    : emails.filter((e) => e.category === tabToCategory[activeTab]);

  return (
    <div className="min-h-screen p-8" style={{ background: "linear-gradient(135deg, #0c1222 0%, #0a0f1a 50%, #0d1117 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-slate-100 font-bold text-2xl mb-1">
            Email Classifications
          </h1>
          <p className="text-slate-400 text-sm">
            AI-classified incoming emails from your inbox
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-medium text-sm hover:bg-cyan-500/25 transition-all duration-200">
          <Plus size={14} />
          Process New Email
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900/50 p-1 rounded-lg border border-slate-800/50 w-fit">
        {tabs.map((tab) => {
          const count = tab === "All" ? emails.length : emails.filter((e) => e.category === tabToCategory[tab]).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? "bg-slate-700/60 text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
              <span className={`ml-1.5 text-xs ${activeTab === tab ? "text-slate-400" : "text-slate-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Email Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Mail className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No emails in this category.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => (
            <div
              key={email.id}
              className={`rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300 overflow-hidden border-l-[3px] ${categoryBorder[email.category] ?? "border-l-slate-700"}`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <AvatarCircle name={email.sender} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-200 font-medium text-sm truncate">{email.sender}</p>
                      <span className="text-slate-600 text-xs whitespace-nowrap ml-3">{relativeTime(email.processed_at)}</span>
                    </div>
                    <p className="text-slate-100 font-semibold mb-2 text-base">{email.subject}</p>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{email.ai_summary}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge category={email.category} />
                      {/* Confidence bar */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round(email.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-500 text-xs">{Math.round(email.confidence * 100)}%</span>
                      </div>
                      {/* Suggested action */}
                      {email.suggested_action && (
                        <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50">
                          {email.suggested_action}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
