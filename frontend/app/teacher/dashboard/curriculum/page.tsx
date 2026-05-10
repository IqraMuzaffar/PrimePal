"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import FileUploadZone from "@/components/teacher/FileUploadZone";

interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
  sample_chunk: { content: string; metadata: Record<string, unknown> } | null;
}

export default function CurriculumUploadPage() {
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <BookOpen size={18} />
          </div>
          <span className="font-bold text-gray-900 text-lg">PrimePal</span>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-sm text-gray-500">Knowledge Base</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Upload Textbook</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload SNC textbook PDFs. Each upload is automatically chunked and
            embedded into the vector database — this may take up to 30 seconds
            for large files.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <FileUploadZone onSuccess={setLastResult} />
        </div>

        {lastResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800">
              Upload complete!
            </p>
            <p className="text-sm text-green-700 mt-1">
              {lastResult.total_chunks} chunks extracted &middot;{" "}
              {lastResult.embedded_count} embeddings stored in vector database.
            </p>
            {lastResult.sample_chunk && (
              <details className="mt-2">
                <summary className="text-xs text-green-600 cursor-pointer select-none">
                  View sample chunk
                </summary>
                <pre className="mt-1 text-xs text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                  {lastResult.sample_chunk.content}
                </pre>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
