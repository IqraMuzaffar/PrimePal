"use client";

import { useEffect, useState } from "react";
import { fetchEmails, EmailResult } from "@/lib/api";
import { AlertCircle, Mail } from "lucide-react";

const categoryBadge: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  sales_lead: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  support: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  spam: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function Badge({ category }: { category: string }) {
  const cls = categoryBadge[category] ?? "bg-slate-700/50 text-slate-300 border-slate-600";
  return (
    <span
      className={`px-2 py-0.5 rounded-full border font-medium ${cls}`}
      style={{ fontSize: 13 }}
    >
      {category.replace("_", " ")}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-slate-100 font-bold mb-1" style={{ fontSize: 32 }}>
          Email Classifications
        </h1>
        <p className="text-slate-400" style={{ fontSize: 15 }}>
          AI-classified incoming emails from your inbox
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Mail className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No emails processed yet.</p>
            <p className="text-slate-600 text-sm mt-1">Run the email classification workflow to populate this list.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Sender", "Subject", "Category", "Confidence", "AI Summary", "Time"].map((h) => (
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
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 text-slate-300" style={{ fontSize: 16 }}>
                      <p className="font-medium truncate max-w-[180px]">{email.sender}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-300" style={{ fontSize: 16 }}>
                      <p className="truncate max-w-[220px]">{email.subject}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge category={email.category} />
                    </td>
                    <td className="px-5 py-4 text-slate-300" style={{ fontSize: 16 }}>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.round(email.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-400 text-sm">{Math.round(email.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400" style={{ fontSize: 15 }}>
                      <p className="truncate max-w-[300px]">{email.ai_summary}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm whitespace-nowrap">
                      {formatDate(email.processed_at)}
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
