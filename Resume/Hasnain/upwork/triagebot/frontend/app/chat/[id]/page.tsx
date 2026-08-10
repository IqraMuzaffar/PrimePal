"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SeverityBadge } from "@/components/SeverityBadge";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    apiFetch(`/dashboard/session/${id}`).then(data => {
      setSession(data.session);
      setMessages(data.messages || []);
    }).catch(() => {});
  }, [id]);

  if (!session) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 block">{"\u2190"} Back to Queue</Link>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{session.patient_name || session.patient_phone}</h1>
            <p className="text-sm text-gray-500">{session.channel} · {new Date(session.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            {session.severity && <SeverityBadge severity={session.severity} />}
            <span className="text-sm font-medium">{session.department}</span>
          </div>
        </div>
        {session.ai_summary && <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">{session.ai_summary}</p>}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-3">Conversation</h2>
        <div className="space-y-3">
          {messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === "patient" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                m.role === "patient" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
              }`}>
                <p className="text-xs opacity-70 mb-1">{m.role}</p>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
