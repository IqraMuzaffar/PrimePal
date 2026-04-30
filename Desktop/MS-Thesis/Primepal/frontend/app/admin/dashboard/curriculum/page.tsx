"use client";

import { useEffect, useState } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";
import { Trash2 } from "lucide-react";

interface CurriculumChunk {
  id: string;
  title: string;
  created_at: string;
}

export default function GlobalCurriculumPage() {
  const [curriculum, setCurriculum] = useState<CurriculumChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const fetchCurriculum = async () => {
    try {
      const headers = await getAdminHeaders();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const response = await fetch(`${API_BASE}/admin/curriculum`, { headers });
      const data = await response.json();
      setCurriculum(data);
    } catch {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chunkId: string) => {
    if (!confirm("Are you sure? This will permanently delete this curriculum chunk.")) return;

    setDeletingId(chunkId);
    try {
      const headers = await getAdminHeaders();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const response = await fetch(`${API_BASE}/admin/curriculum/${chunkId}`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setCurriculum(curriculum.filter((c) => c.id !== chunkId));
      }
    } catch {
      alert("Failed to delete curriculum");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Global Curriculum</h2>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : curriculum.length === 0 ? (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center text-gray-400">
          No curriculum uploaded yet
        </div>
      ) : (
        <div className="space-y-3">
          {curriculum.map((chunk) => (
            <div
              key={chunk.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex items-center justify-between hover:border-slate-600 transition"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">{chunk.title}</h3>
                <p className="text-sm text-gray-400">
                  {new Date(chunk.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(chunk.id)}
                disabled={deletingId === chunk.id}
                className="p-3 hover:bg-red-900 hover:text-red-300 rounded transition disabled:opacity-50"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
