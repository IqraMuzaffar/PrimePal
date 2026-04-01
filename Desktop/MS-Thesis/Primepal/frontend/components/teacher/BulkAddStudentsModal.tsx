// frontend/components/teacher/BulkAddStudentsModal.tsx
"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface Props {
  classroomId: string;
  onClose: () => void;
  onAdded: () => void; // parent re-fetches roster on success
}

export default function BulkAddStudentsModal({
  classroomId,
  onClose,
  onAdded,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /** Split on newlines and commas, trim whitespace, remove empties. */
  function parseNames(raw: string): string[] {
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const names = parseNames(text);
    if (names.length === 0) {
      setError("Please enter at least one student name.");
      return;
    }

    setLoading(true);
    try {
      const headers = await getTeacherHeaders();
      const res = await apiFetch<{ added: number }>(
        `/classroom/${classroomId}/students/bulk`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ names }),
        }
      );
      setSuccessMsg(
        `${res.added} student${res.added !== 1 ? "s" : ""} added successfully.`
      );
      setText("");
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Students</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Names{" "}
              <span className="font-normal text-gray-400">
                (comma or line separated)
              </span>
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Ali Hassan\nSara Khan\nUmar, Bilal, Fatima"}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              {successMsg}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Add Students
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
