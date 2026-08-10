"use client";
import { SeverityBadge } from "./SeverityBadge";
import Link from "next/link";

interface Session {
  id: string; patient_name: string | null; patient_phone: string;
  severity: string; department: string; ai_summary: string;
  channel: string; created_at: string;
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function TriageCard({ session, onConfirm, onReject }: {
  session: Session; onConfirm: (id: string) => void; onReject: (id: string) => void;
}) {
  const border = session.severity === "red" ? "border-l-red-600 bg-red-50"
    : session.severity === "yellow" ? "border-l-yellow-500 bg-yellow-50"
    : "border-l-green-600 bg-green-50";
  return (
    <div className={`border-l-4 rounded-lg p-4 shadow-sm ${border}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold">{session.patient_name || session.patient_phone}</p>
          <p className="text-sm text-gray-500">{session.patient_phone} · {session.channel}</p>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={session.severity} />
          <span className="text-xs text-gray-400">{timeAgo(session.created_at)}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-blue-800 mb-1">{"\u2192"} {session.department}</p>
      <p className="text-sm text-gray-700 mb-3">{session.ai_summary}</p>
      <div className="flex gap-2">
        <button onClick={() => onConfirm(session.id)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Confirm</button>
        <Link href={`/chat/${session.id}`}
          className="px-3 py-1 bg-white border text-sm rounded hover:bg-gray-50">View Chat</Link>
        <button onClick={() => onReject(session.id)}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Reject</button>
      </div>
    </div>
  );
}
