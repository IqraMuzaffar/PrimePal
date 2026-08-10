"use client";
import { useEffect, useState } from "react";
import { TriageCard } from "@/components/TriageCard";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function QueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [emergency, setEmergency] = useState<any[]>([]);

  const fetchQueue = async () => {
    try {
      const data = await apiFetch("/dashboard/queue");
      setQueue(data.queue || []);
      setEmergency(data.emergency || []);
    } catch {}
  };

  useEffect(() => { fetchQueue(); const i = setInterval(fetchQueue, 5000); return () => clearInterval(i); }, []);

  const handleConfirm = async (id: string) => {
    await apiFetch(`/dashboard/session/${id}/action`, {
      method: "POST", body: JSON.stringify({ action: "confirm", reviewed_by: "receptionist" }),
    });
    fetchQueue();
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await apiFetch(`/dashboard/session/${id}/action`, {
      method: "POST", body: JSON.stringify({ action: "reject", reason, reviewed_by: "receptionist" }),
    });
    fetchQueue();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Triage Queue</h1>
        <Link href="/analytics" className="text-blue-600 hover:underline text-sm">Analytics {"\u2192"}</Link>
      </div>
      {emergency.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-red-600 mb-2 animate-pulse">EMERGENCY ({emergency.length})</h2>
          <div className="space-y-3">
            {emergency.map((s: any) => (
              <TriageCard key={s.id} session={s} onConfirm={handleConfirm} onReject={handleReject} />
            ))}
          </div>
        </div>
      )}
      <h2 className="text-lg font-semibold mb-2">Awaiting Review ({queue.length})</h2>
      <div className="space-y-3">
        {queue.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No patients in queue</p>
        ) : queue.map((s: any) => (
          <TriageCard key={s.id} session={s} onConfirm={handleConfirm} onReject={handleReject} />
        ))}
      </div>
    </div>
  );
}
