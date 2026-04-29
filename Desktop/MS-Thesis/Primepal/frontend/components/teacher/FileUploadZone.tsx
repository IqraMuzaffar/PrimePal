"use client";

import { useRef, useState } from "react";

import { supabase } from "@/lib/supabase/client";

interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
  sample_chunk: { content: string; metadata: Record<string, unknown> } | null;
}

interface FileUploadZoneProps {
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

export default function FileUploadZone({ onSuccess }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState("3");
  const [bookTitle, setBookTitle] = useState("");
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

    // Show progressive state labels so the teacher knows what's happening
    const chunkTimer = setTimeout(() => setUploadState("chunking"), 1500);
    const embedTimer = setTimeout(() => setUploadState("embedding"), 3000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please sign in again.");

      const formData = new FormData();
      formData.append("file", file);
      // Append the numeric value only — FastAPI expects an integer, not "Grade 3"
      formData.append("grade_level", String(Number(gradeLevel)));
      formData.append("book_title", bookTitle.trim());

      // Do NOT set Content-Type — the browser must set it with the multipart boundary.
      // apiFetch always injects "Content-Type: application/json" which breaks FormData,
      // so we use a raw fetch here.
      const res = await fetch("http://localhost:8000/api/v1/curriculum/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // FastAPI 422 detail is an array of {loc, msg, type} objects
        const detail = body?.detail;
        let message: string;
        if (Array.isArray(detail)) {
          message = detail.map((d) => d?.msg ?? JSON.stringify(d)).join("; ");
        } else if (typeof detail === "string") {
          message = detail;
        } else {
          message = `Server error ${res.status}`;
        }
        throw new Error(message);
      }

      const result: UploadResult = await res.json();

      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);
      setUploadState("done");
      setBookTitle("");
      onSuccess(result);
    } catch (err: unknown) {
      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade Level
          </label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
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
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={[
          "relative border-2 border-dashed rounded-xl p-10 text-center transition-colors duration-200",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50",
          isLoading ? "cursor-not-allowed opacity-70" : "cursor-pointer",
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
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <p className="text-sm font-medium text-blue-600">
              {STATE_LABELS[uploadState]}
            </p>
            <p className="text-xs text-gray-500">
              Please wait — do not close this page
            </p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-10 w-10 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">
              Drop a PDF here, or{" "}
              <span className="text-blue-600 underline">click to browse</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF only · SNC textbooks
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
