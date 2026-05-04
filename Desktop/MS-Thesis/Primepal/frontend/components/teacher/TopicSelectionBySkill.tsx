// frontend/components/teacher/TopicSelectionBySkill.tsx
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface SncTopic {
  id: number;
  grade_level: number;
  skill: "listening" | "speaking" | "reading" | "writing";
  topic_name: string;
  is_globally_active: boolean;
}

interface SkillTopicsGroup {
  skill: "listening" | "speaking" | "reading" | "writing";
  topics: SncTopic[];
}

interface TopicsBySkillResponse {
  grade_level: number;
  skills: SkillTopicsGroup[];
}

interface TopicSelectionBySkillProps {
  classroomId: string;
}

const SKILL_LABELS: Record<string, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
};

const SKILL_COLORS: Record<string, string> = {
  listening: "bg-blue-100 text-blue-700 border-blue-300",
  speaking: "bg-green-100 text-green-700 border-green-300",
  reading: "bg-purple-100 text-purple-700 border-purple-300",
  writing: "bg-orange-100 text-orange-700 border-orange-300",
};

export default function TopicSelectionBySkill({ classroomId }: TopicSelectionBySkillProps) {
  const [data, setData] = useState<TopicsBySkillResponse | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = await getTeacherHeaders();
        const response = await apiFetch<TopicsBySkillResponse>(
          `/classroom/${classroomId}/topics-by-skill`,
          { headers }
        );
        setData(response);

        // Select all globally active topics by default
        const activeTopicIds = response.skills.flatMap((skill) =>
          skill.topics.filter((t) => t.is_globally_active).map((t) => t.id)
        );
        setSelectedTopicIds(new Set(activeTopicIds));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load topics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [classroomId]);

  async function saveSelections() {
    setSaving(true);
    setError(null);
    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/classroom/${classroomId}/active-topics`, {
        method: "PUT",
        body: JSON.stringify({ topic_ids: Array.from(selectedTopicIds) }),
        headers,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save selections");
    } finally {
      setSaving(false);
    }
  }

  function toggleTopic(topicId: number) {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-sm text-red-600">Failed to load topics</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Active Topics by Skill</h2>
          <p className="text-xs text-gray-500 mt-1">
            Select topics to include in missions. Topics are organized by LSRW skills (Listening, Speaking, Reading, Writing).
          </p>
        </div>
        <button
          onClick={saveSelections}
          disabled={saving}
          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="space-y-4">
        {data.skills.map((skillGroup) => (
          <div key={skillGroup.skill}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${SKILL_COLORS[skillGroup.skill]}`}>
                {SKILL_LABELS[skillGroup.skill]}
              </span>
              <span className="text-xs text-gray-400">
                {skillGroup.topics.filter((t) => selectedTopicIds.has(t.id) && t.is_globally_active).length}/
                {skillGroup.topics.filter((t) => t.is_globally_active).length} selected
                {skillGroup.topics.some((t) => !t.is_globally_active) && (
                  <span className="text-gray-400 ml-1">
                    ({skillGroup.topics.filter((t) => !t.is_globally_active).length} disabled)
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {skillGroup.topics.map((topic) => {
                const isSelected = selectedTopicIds.has(topic.id);
                const isGloballyActive = topic.is_globally_active;

                return (
                  <button
                    key={topic.id}
                    onClick={() => isGloballyActive && toggleTopic(topic.id)}
                    disabled={!isGloballyActive}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      !isGloballyActive
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                        : isSelected
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-500 border-gray-300 hover:border-indigo-400"
                    }`}
                    title={!isGloballyActive ? "This topic is deactivated at the grade level" : ""}
                  >
                    {topic.topic_name}
                    {!isGloballyActive && <span className="ml-1.5 text-xs">🚫</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mt-3">
          ✓ Topics saved!
        </p>
      )}
    </div>
  );
}
