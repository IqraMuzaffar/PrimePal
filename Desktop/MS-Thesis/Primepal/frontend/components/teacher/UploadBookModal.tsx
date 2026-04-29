"use client";

import { useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { SncTopic } from "@/types";

interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
}

interface Props {
  gradeLevel: number;
  topics: SncTopic[];
  onClose: () => void;
  onSuccess: (result: UploadResult) => void;
}

type UploadState = "idle" | "uploading" | "chunking" | "embedding" | "done";

const STATE_LABELS: Record<UploadState, string> = {
  idle: "",
  uploading: "Uploading PDF...",
  chunking: "Extracting & chunking text...",
  embedding: "Generating embeddings (this takes ~10–30s)...",
  done: "",
};

export default function UploadBookModal({ gradeLevel, topics, onClose, onSuccess }: Props) {
  const [bookTitle, setBookTitle] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = uploadState !== "idle" && uploadState !== "done";

  const handleUpload = async (file: File) => {
    if (!bookTitle.trim()) {
      setError("Please enter a book title before uploading.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }

    setError(null);
    setUploadState("uploading");
    const chunkTimer = setTimeout(() => setUploadState("chunking"), 1500);
    const embedTimer = setTimeout(() => setUploadState("embedding"), 3000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please sign in again.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade_level", String(gradeLevel));
      formData.append("book_title", bookTitle.trim());
      if (selectedTopicId !== null) {
        formData.append("topic_id", String(selectedTopicId));
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const res = await fetch(`${API_BASE}/curriculum/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body?.detail;
        const message = Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg ?? JSON.stringify(d)).join("; ")
          : typeof detail === "string"
          ? detail
          : `Server error ${res.status}`;
        throw new Error(message);
      }

      const result: UploadResult = await res.json();
      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);
      setUploadState("done");
      onSuccess(result);
    } catch (err: unknown) {
      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Upload Book — Grade {gradeLevel}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Book title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Book Title
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              disabled={isLoading}
              placeholder="e.g. SNC Grade 3 English"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Topic tag (optional) */}
          {topics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Tag <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={selectedTopicId ?? ""}
                onChange={(e) => setSelectedTopicId(e.target.value ? Number(e.target.value) : null)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">— No specific topic —</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.topic_name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Tag this document to a specific topic for better AI retrieval.
              </p>
            </div>
          )}

          {/* File picker */}
          <div
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={[
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
              isLoading
                ? "cursor-not-allowed opacity-70 border-gray-200"
                : "cursor-pointer border-gray-300 hover:border-indigo-400 hover:bg-indigo-50",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />

            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                <p className="text-sm font-medium text-indigo-600">
                  {STATE_LABELS[uploadState]}
                </p>
                <p className="text-xs text-gray-400">Do not close this window</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">
                  Click to select a PDF
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF only · SNC textbooks</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
