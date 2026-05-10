"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTeacherTopics, teacherQueryKeys } from "@/lib/hooks/teacher-queries";
import { teacherMutate } from "@/lib/api-helpers";
import { useQueryClient } from "@tanstack/react-query";

interface GradeTopicItem {
  topic_id: number;
  topic_name: string;
  skill: string;
  is_active: boolean;
}

interface GradeSelectionsResponse {
  grade_level: number;
  topics: GradeTopicItem[];
}

const GRADES = [1, 2, 3, 4, 5];

const SKILL_LABELS: Record<string, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
};

const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  listening: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  speaking: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  reading: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  writing: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

export default function TopicsPage() {
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState(1);
  const { data: topicsData, isLoading: loading, error: fetchError } = useTeacherTopics(grade);
  const [topics, setTopics] = useState<GradeTopicItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Sync topics from query data
  useEffect(() => {
    if (topicsData) {
      setTopics(topicsData.topics);
      setSaved(false);
      setDirty(false);
    }
    if (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load topics.");
    }
  }, [topicsData, fetchError, grade]);

  function toggleTopic(topicId: number) {
    setTopics((prev) =>
      prev.map((t) =>
        t.topic_id === topicId ? { ...t, is_active: !t.is_active } : t
      )
    );
    setDirty(true);
    setSaved(false);
  }

  function selectAll() {
    setTopics((prev) => prev.map((t) => ({ ...t, is_active: true })));
    setDirty(true);
    setSaved(false);
  }

  function deselectAll() {
    setTopics((prev) => prev.map((t) => ({ ...t, is_active: false })));
    setDirty(true);
    setSaved(false);
  }

  async function saveChanges() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        selections: topics.map((t) => ({
          topic_id: t.topic_id,
          is_active: t.is_active,
        })),
      };

      const data = await teacherMutate<GradeSelectionsResponse>(
        `/topics/grade-selections/${grade}`,
        payload,
        "PUT"
      );
      setTopics(data.topics);
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.topics(grade) });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = topics.filter((t) => t.is_active).length;
  const totalCount = topics.length;

  // Group topics by skill
  const topicsBySkill = topics.reduce((acc, topic) => {
    if (!acc[topic.skill]) {
      acc[topic.skill] = [];
    }
    acc[topic.skill].push(topic);
    return acc;
  }, {} as Record<string, GradeTopicItem[]>);

  const skills = ["listening", "speaking", "reading", "writing"];

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Topic Selection</h1>
          <p className="text-sm text-gray-500 mt-1">
            Control which SNC topics are active for each grade level. Deactivated
            topics will be excluded from AI-generated tasks across all classrooms.
          </p>
        </div>

        {/* Grade selector + actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Grade dropdown */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                Grade Level
              </label>
              <div className="relative">
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                disabled={loading}
                className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                disabled={loading}
                className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Summary */}
          {!loading && (
            <p className="text-sm text-gray-500 mt-4">
              <span className="font-semibold text-gray-700">{activeCount}</span> of{" "}
              <span className="font-semibold text-gray-700">{totalCount}</span>{" "}
              topics active for Grade {grade}
            </p>
          )}
        </div>

        {/* Topic cards */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 animate-pulse"
                >
                  <div className="w-5 h-5 rounded bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No topics found for Grade {grade}.
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {skills.map((skill) => {
                const skillTopics = topicsBySkill[skill] || [];
                if (skillTopics.length === 0) return null;

                const activeInSkill = skillTopics.filter((t) => t.is_active).length;
                const colors = SKILL_COLORS[skill] || SKILL_COLORS.listening;

                return (
                  <div key={skill}>
                    {/* Skill header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
                        {SKILL_LABELS[skill]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {activeInSkill}/{skillTopics.length} active
                      </span>
                    </div>

                    {/* Topics for this skill */}
                    <div className="space-y-2">
                      {skillTopics.map((topic) => (
                        <button
                          key={topic.topic_id}
                          onClick={() => toggleTopic(topic.topic_id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            topic.is_active
                              ? `${colors.border} ${colors.bg}`
                              : "border-gray-100 bg-gray-50 hover:border-gray-200"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                              topic.is_active
                                ? "bg-indigo-600 text-white"
                                : "bg-white border-2 border-gray-300"
                            }`}
                          >
                            {topic.is_active && <Check size={14} strokeWidth={3} />}
                          </div>

                          {/* Topic info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                topic.is_active ? "text-gray-900" : "text-gray-500"
                              }`}
                            >
                              {topic.topic_name}
                            </p>
                          </div>

                          {/* Status pill */}
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                              topic.is_active
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {topic.is_active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer with save */}
          {!loading && topics.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {saved && (
                  <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <Check size={14} /> Changes saved successfully
                  </p>
                )}
              </div>
              <button
                onClick={saveChanges}
                disabled={saving || !dirty}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
