"use client";

import { useState, useRef, useCallback } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";
import { BookOpen, Upload, Trash2, Eye, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAdminBooks, adminQueryKeys } from "@/lib/hooks/admin-queries";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface Book {
  id: string;
  filename: string;
  grade_level: number;
  book_title: string;
  total_chunks: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Chunk {
  id: string;
  content_preview: string;
  content: string;
  metadata: Record<string, unknown>;
}

interface ChunksResponse {
  chunks: Chunk[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-600 text-gray-200",
  extracting: "bg-yellow-600 text-yellow-100 animate-pulse",
  chunking: "bg-yellow-600 text-yellow-100 animate-pulse",
  embedding: "bg-yellow-600 text-yellow-100 animate-pulse",
  success: "bg-green-700 text-green-100",
  failed: "bg-red-700 text-red-100",
};

const PIPELINE_STAGES = ["pending", "extracting", "chunking", "embedding", "success"];

export default function CurriculumManagementPage() {
  const queryClient = useQueryClient();
  const { data: books = [], isLoading: loadingBooks } = useAdminBooks();

  // Upload state
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Books filters / delete
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Chunk viewer state
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [chunks, setChunks] = useState<ChunksResponse | null>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunkPage, setChunkPage] = useState(1);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshBooks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.books });
  }, [queryClient]);

  const startStatusPolling = useCallback(
    (bookId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const headers = await getAdminHeaders();
          const res = await fetch(`${API_BASE}/admin/curriculum/books/${bookId}/status`, { headers });
          if (res.ok) {
            const data = await res.json();
            setUploadStatus(data.status);
            if (data.status === "success" || data.status === "failed") {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              if (data.status === "failed") {
                setUploadError(data.error_message || "Pipeline failed");
              }
              refreshBooks();
            }
          }
        } catch {
          // polling error is non-fatal
        }
      }, 3000);
    },
    [refreshBooks]
  );

  const handleUpload = async () => {
    if (!selectedGrade || !bookTitle.trim() || !selectedFile) return;

    setUploading(true);
    setUploadStatus("pending");
    setUploadError(null);

    try {
      const headers = await getAdminHeaders();
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("grade_level", String(selectedGrade));
      formData.append("book_title", bookTitle.trim());

      // Remove Content-Type from headers — browser sets multipart boundary
      const headerObj: Record<string, string> = {};
      if (headers && typeof headers === "object") {
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() !== "content-type") {
            headerObj[k] = v as string;
          }
        }
      }

      const res = await fetch(`${API_BASE}/admin/curriculum/upload`, {
        method: "POST",
        headers: headerObj,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Reset form
        setBookTitle("");
        setSelectedGrade(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        refreshBooks();

        // Use the actual status from the API response
        if (data.status === "success") {
          setUploadStatus("success");
        } else {
          setUploadStatus(data.status || "pending");
          startStatusPolling(data.id);
        }
      } else {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        setUploadStatus("failed");
        setUploadError(err.detail || "Upload failed");
      }
    } catch (err) {
      setUploadStatus("failed");
      setUploadError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Delete "${book.book_title}" and all its ${book.total_chunks} chunks? This cannot be undone.`)) return;

    setDeletingId(book.id);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE}/admin/curriculum/books/${book.id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        refreshBooks();
        if (viewingBook?.id === book.id) {
          setViewingBook(null);
          setChunks(null);
        }
      } else {
        alert("Failed to delete book");
      }
    } catch {
      alert("Failed to delete book");
    } finally {
      setDeletingId(null);
    }
  };

  const viewChunks = async (book: Book, page = 1) => {
    setViewingBook(book);
    setLoadingChunks(true);
    setChunkPage(page);

    try {
      const headers = await getAdminHeaders();
      const res = await fetch(
        `${API_BASE}/admin/curriculum/books/${book.id}/chunks?page=${page}&page_size=20`,
        { headers }
      );
      if (res.ok) {
        const data: ChunksResponse = await res.json();
        setChunks(data);
      }
    } catch (err) {
      console.error("Failed to fetch chunks:", err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const filteredBooks = gradeFilter ? books.filter((b) => b.grade_level === gradeFilter) : books;

  const currentStageIndex = uploadStatus ? PIPELINE_STAGES.indexOf(uploadStatus) : -1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="text-indigo-400" size={28} />
        <h2 className="text-2xl font-bold text-white">Curriculum Management</h2>
      </div>

      {/* Upload Panel */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload size={20} className="text-indigo-400" />
          Upload SNC Textbook
        </h3>

        <div className="space-y-4">
          {/* Grade Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Grade Level</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedGrade === g
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>

          {/* Book Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Book Title</label>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g. SNC English Grade 3"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">PDF File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedGrade || !bookTitle.trim() || !selectedFile || uploading}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload &amp; Process
              </>
            )}
          </button>

          {/* Pipeline Progress */}
          {uploadStatus && (
            <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
              <p className="text-sm text-gray-400 mb-3">Pipeline Progress</p>
              <div className="flex items-center gap-2">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isActive = stage === uploadStatus;
                  const isComplete = currentStageIndex > i;
                  const isFailed = uploadStatus === "failed";

                  let dotClass = "w-3 h-3 rounded-full ";
                  if (isFailed && isActive) dotClass += "bg-red-500";
                  else if (isComplete) dotClass += "bg-green-500";
                  else if (isActive) dotClass += "bg-yellow-400 animate-pulse";
                  else dotClass += "bg-slate-600";

                  return (
                    <div key={stage} className="flex items-center gap-2">
                      {i > 0 && (
                        <div className={`w-8 h-0.5 ${isComplete ? "bg-green-500" : "bg-slate-600"}`} />
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <div className={dotClass} />
                        <span className={`text-xs ${isActive ? "text-white font-medium" : "text-gray-500"}`}>
                          {stage}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {uploadError && (
                <p className="mt-3 text-sm text-red-400">{uploadError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Uploaded Books</h3>
          {/* Grade Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Filter:</span>
            <button
              onClick={() => setGradeFilter(null)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                !gradeFilter ? "bg-indigo-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"
              }`}
            >
              All
            </button>
            {[1, 2, 3, 4, 5].map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  gradeFilter === g ? "bg-indigo-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                }`}
              >
                G{g}
              </button>
            ))}
          </div>
        </div>

        {loadingBooks ? (
          <div className="text-gray-400 py-8 text-center">Loading books...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-12 text-center text-gray-400">
            {gradeFilter ? `No books uploaded for Grade ${gradeFilter}` : "No books uploaded yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 text-gray-400 text-sm">
                  <th className="pb-3 pr-4">Grade</th>
                  <th className="pb-3 pr-4">Book Title</th>
                  <th className="pb-3 pr-4">File Name</th>
                  <th className="pb-3 pr-4">Chunks</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Uploaded</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="py-3 pr-4">
                      <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2 py-1 rounded">
                        G{book.grade_level}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-white font-medium">{book.book_title}</td>
                    <td className="py-3 pr-4 text-gray-400 text-sm">{book.filename}</td>
                    <td className="py-3 pr-4 text-gray-300">{book.total_chunks}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLES[book.status] || STATUS_STYLES.pending}`}>
                        {book.status}
                      </span>
                      {book.error_message && (
                        <p className="text-xs text-red-400 mt-1 max-w-xs truncate" title={book.error_message}>
                          {book.error_message}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-sm">
                      {new Date(book.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {book.status === "success" && (
                          <button
                            onClick={() => viewChunks(book)}
                            className="p-2 hover:bg-slate-600 rounded transition text-gray-300 hover:text-white"
                            title="View Chunks"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(book)}
                          disabled={deletingId === book.id}
                          className="p-2 hover:bg-red-900/50 hover:text-red-300 rounded transition text-gray-400 disabled:opacity-50"
                          title="Delete Book"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunk Viewer Modal */}
      {viewingBook && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{viewingBook.book_title}</h3>
                <p className="text-sm text-gray-400">
                  Grade {viewingBook.grade_level} &middot; {chunks?.total ?? 0} chunks
                </p>
              </div>
              <button
                onClick={() => { setViewingBook(null); setChunks(null); }}
                className="p-2 hover:bg-slate-700 rounded transition text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chunks List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingChunks ? (
                <div className="text-gray-400 text-center py-8">Loading chunks...</div>
              ) : !chunks || chunks.chunks.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No chunks found</div>
              ) : (
                chunks.chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="bg-slate-900 rounded-lg border border-slate-700 p-4"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className="text-xs font-mono text-gray-500">
                        {chunk.metadata?.chunk_id as string || chunk.id}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {chunk.content.length} chars
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {chunk.content_preview}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {chunks && chunks.total_pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-700">
                <span className="text-sm text-gray-400">
                  Page {chunks.page} of {chunks.total_pages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewChunks(viewingBook, chunkPage - 1)}
                    disabled={chunkPage <= 1}
                    className="p-2 hover:bg-slate-700 rounded transition text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => viewChunks(viewingBook, chunkPage + 1)}
                    disabled={chunkPage >= chunks.total_pages}
                    className="p-2 hover:bg-slate-700 rounded transition text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
