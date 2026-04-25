"use client";

import { useEffect, useState } from "react";
import { Megaphone, Loader, CheckCircle2, AlertCircle, ToggleRight, ToggleLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface Announcement {
  id: string;
  classroom_id: string | null;
  teacher_id: string;
  message_en: string;
  message_ur: string;
  scope: "classroom" | "grade_level" | "school_wide";
  target_grade_level: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Classroom {
  id: string;
  class_name: string;
  grade_level: number;
}

export default function AnnouncementsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [messageEn, setMessageEn] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scope, setScope] = useState<"classroom" | "grade_level" | "school_wide">("classroom");
  const [targetGrade, setTargetGrade] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [posting, setPosting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load classrooms on mount
  useEffect(() => {
    async function loadClassrooms() {
      try {
        const headers = await getTeacherHeaders();
        const data = await apiFetch<Classroom[]>("/classroom/", { headers });
        setClassrooms(data || []);
        if (data && data.length > 0) {
          setSelectedClassroom(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load classrooms:", err);
        setErrorMessage("Failed to load classrooms");
      } finally {
        setLoading(false);
      }
    }
    loadClassrooms();
  }, []);

  // Load announcements when classroom is selected (or on component mount)
  useEffect(() => {
    if (selectedClassroom) {
      loadAnnouncements(selectedClassroom);
    }
  }, [selectedClassroom]);

  // Reset target grade when scope changes
  useEffect(() => {
    setTargetGrade(null);
  }, [scope]);

  async function loadAnnouncements(classroomId: string) {
    try {
      setLoadingClassrooms(true);
      const headers = await getTeacherHeaders();
      const data = await apiFetch<{ announcements: Announcement[]; total_count: number }>(
        `/announcements/${classroomId}`,
        { headers }
      );
      setAnnouncements(data?.announcements || []);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setErrorMessage("Failed to load announcements");
    } finally {
      setLoadingClassrooms(false);
    }
  }

  async function handlePostAnnouncement() {
    if (!messageEn.trim()) {
      setErrorMessage("Please enter a message");
      return;
    }

    // Validate scope-specific parameters
    if (scope === "classroom" && !selectedClassroom) {
      setErrorMessage("Please select a classroom");
      return;
    }

    if (scope === "grade_level" && targetGrade === null) {
      setErrorMessage("Please select a grade level");
      return;
    }

    setPosting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const headers = await getTeacherHeaders();
      const payload: any = {
        message_en: messageEn.trim(),
        scope: scope,
      };

      if (scope === "classroom") {
        payload.classroom_id = selectedClassroom;
      } else if (scope === "grade_level") {
        payload.target_grade_level = targetGrade;
      }

      const response = await apiFetch<Announcement>(
        "/announcements",
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const scopeLabel =
        scope === "classroom"
          ? `Grade ${classrooms.find((c) => c.id === selectedClassroom)?.grade_level} class`
          : scope === "grade_level"
            ? `Grade ${targetGrade}`
            : "all classes";

      setSuccessMessage(
        `✓ Announcement posted to ${scopeLabel}! Translating to Urdu...`
      );
      setMessageEn("");
      setTargetGrade(null);

      // Reload announcements
      if (scope === "classroom") {
        await loadAnnouncements(selectedClassroom);
      } else {
        await loadAnnouncements(selectedClassroom);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to post announcement:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setPosting(false);
    }
  }

  async function handleToggleAnnouncement(announcementId: string, currentStatus: boolean) {
    setTogglingId(announcementId);

    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/announcements/${announcementId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      // Update local state
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.id === announcementId ? { ...ann, is_active: !currentStatus } : ann
        )
      );

      setSuccessMessage(
        !currentStatus ? "✓ Announcement activated" : "✓ Announcement deactivated"
      );
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (err) {
      console.error("Failed to toggle announcement:", err);
      setErrorMessage("Failed to update announcement status");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-gray-500">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-indigo-600" />
            Bilingual Announcements
          </h1>
          <p className="text-gray-600 mt-1">
            Post announcements in English — they'll be auto-translated to Urdu for students
          </p>
        </div>

        {classrooms.length > 0 && (
          <>
            {/* Announcement Composer */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ✍️ Write New Announcement
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    📢 Broadcast Scope
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setScope("classroom")}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        scope === "classroom"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      🏫 Specific Class
                    </button>
                    <button
                      onClick={() => setScope("grade_level")}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        scope === "grade_level"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      📚 All Grade
                    </button>
                    <button
                      onClick={() => setScope("school_wide")}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        scope === "school_wide"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      🌍 School-Wide
                    </button>
                  </div>
                </div>

                {/* Scope-specific selector */}
                {scope === "classroom" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                      Select Classroom
                    </label>
                    <select
                      value={selectedClassroom}
                      onChange={(e) => setSelectedClassroom(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>
                          Grade {c.grade_level} - {c.class_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === "grade_level" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                      Select Grade
                    </label>
                    <select
                      value={targetGrade || ""}
                      onChange={(e) => setTargetGrade(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="">-- Choose a grade --</option>
                      {[1, 2, 3, 4, 5].map((grade) => (
                        <option key={grade} value={grade}>
                          Grade {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === "school_wide" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700 font-medium">
                      📢 This announcement will be sent to all classrooms you teach.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                    Message (English)
                  </label>
                  <textarea
                    value={messageEn}
                    onChange={(e) => {
                      setMessageEn(e.target.value);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    placeholder="Type your announcement here... (e.g., 'Sports day will be held on Friday at 2 PM')"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {messageEn.length} / 5000 characters
                  </p>
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </motion.div>
                  )}

                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handlePostAnnouncement}
                  disabled={posting || !messageEn.trim()}
                  className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {posting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Translating & Broadcasting...
                    </>
                  ) : (
                    <>
                      📢 Broadcast to Class
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Announcements List */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  📋 Recent Announcements
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {announcements.length === 0
                    ? "No announcements yet"
                    : `${announcements.length} announcement${announcements.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {loadingClassrooms ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center h-40">
                  <Loader className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="bg-gray-100 rounded-2xl border border-gray-200 p-8 text-center">
                  <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No announcements yet. Create your first one!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {announcements.map((ann, idx) => (
                      <motion.div
                        key={ann.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`rounded-2xl border p-5 transition-all ${
                          ann.is_active
                            ? "bg-white border-indigo-200 shadow-sm"
                            : "bg-gray-50 border-gray-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Urdu Message (Prominent) */}
                            <p className="text-lg font-semibold text-gray-900 mb-2 break-words">
                              {ann.message_ur}
                            </p>

                            {/* English Message (Smaller) */}
                            <p className="text-sm text-gray-600 mb-3 break-words">
                              {ann.message_en}
                            </p>

                            {/* Meta Info */}
                            <p className="text-xs text-gray-500">
                              Posted {new Date(ann.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {/* Toggle Button */}
                          <button
                            onClick={() => handleToggleAnnouncement(ann.id, ann.is_active)}
                            disabled={togglingId === ann.id}
                            title={ann.is_active ? "Deactivate announcement" : "Activate announcement"}
                            className="flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {togglingId === ann.id ? (
                              <Loader className="w-5 h-5 animate-spin text-gray-500" />
                            ) : ann.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>

                        {/* Badges */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {/* Status Badge */}
                          {ann.is_active ? (
                            <span className="inline-block text-xs font-medium bg-green-100 text-green-700 px-2.5 py-0.5 rounded">
                              ✓ Active
                            </span>
                          ) : (
                            <span className="inline-block text-xs font-medium bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded">
                              ✕ Inactive
                            </span>
                          )}

                          {/* Scope Badge */}
                          {ann.scope === "classroom" && (
                            <span className="inline-block text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded">
                              🏫 Class
                            </span>
                          )}
                          {ann.scope === "grade_level" && (
                            <span className="inline-block text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded">
                              📚 Grade {ann.target_grade_level}
                            </span>
                          )}
                          {ann.scope === "school_wide" && (
                            <span className="inline-block text-xs font-medium bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded">
                              🌍 School-Wide
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
