"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Tags } from "lucide-react";
import {
  useAdminTopics,
  useCreateAdminTopic,
  useUpdateAdminTopic,
  useDeleteAdminTopic,
  type AdminTopic,
} from "@/lib/hooks/admin-queries";

const GRADES = [1, 2, 3, 4, 5];
const SKILLS = ["listening", "speaking", "reading", "writing"] as const;

const SKILL_LABELS: Record<string, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
};

const SKILL_COLORS: Record<string, string> = {
  listening: "bg-blue-900/50 text-blue-300",
  speaking: "bg-green-900/50 text-green-300",
  reading: "bg-purple-900/50 text-purple-300",
  writing: "bg-orange-900/50 text-orange-300",
};

export default function AdminTopicsPage() {
  const [gradeFilter, setGradeFilter] = useState<number>(1);
  const { data: topics = [], isLoading } = useAdminTopics(gradeFilter);
  const createTopic = useCreateAdminTopic();
  const updateTopic = useUpdateAdminTopic();
  const deleteTopic = useDeleteAdminTopic();

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSkill, setCreateSkill] = useState<string>("listening");

  // Edit modal
  const [editModal, setEditModal] = useState<AdminTopic | null>(null);
  const [editName, setEditName] = useState("");
  const [editSkill, setEditSkill] = useState("");

  // Group topics by skill
  const topicsBySkill = topics.reduce((acc, topic) => {
    if (!acc[topic.skill]) acc[topic.skill] = [];
    acc[topic.skill].push(topic);
    return acc;
  }, {} as Record<string, AdminTopic[]>);

  async function handleCreate() {
    if (!createName.trim()) return;
    try {
      await createTopic.mutateAsync({
        grade_level: gradeFilter,
        skill: createSkill,
        topic_name: createName.trim(),
      });
      setShowCreateModal(false);
      setCreateName("");
      setCreateSkill("listening");
    } catch {
      // error handled by mutation
    }
  }

  async function handleEdit() {
    if (!editModal || !editName.trim()) return;
    try {
      await updateTopic.mutateAsync({
        id: editModal.id,
        body: { topic_name: editName.trim(), skill: editSkill },
      });
      setEditModal(null);
    } catch {
      // error handled by mutation
    }
  }

  async function handleDelete(topic: AdminTopic) {
    if (!confirm(`Delete "${topic.topic_name}"? This will also remove it from all teacher selections.`)) return;
    await deleteTopic.mutateAsync(topic.id);
  }

  function openEdit(topic: AdminTopic) {
    setEditModal(topic);
    setEditName(topic.topic_name);
    setEditSkill(topic.skill);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="text-indigo-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Topic Management</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition"
        >
          <Plus size={18} />
          Add Topic
        </button>
      </div>

      {/* Grade Filter */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">Grade:</span>
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                gradeFilter === g
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700 text-gray-300 hover:bg-slate-600"
              }`}
            >
              Grade {g}
            </button>
          ))}
        </div>
        {!isLoading && (
          <p className="text-sm text-gray-400 mt-3">
            <span className="font-semibold text-gray-200">{topics.length}</span> topics for Grade {gradeFilter}
          </p>
        )}
      </div>

      {/* Topics by Skill */}
      {isLoading ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-gray-400">
          Loading topics...
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-gray-400">
          No topics found for Grade {gradeFilter}. Click &quot;Add Topic&quot; to create one.
        </div>
      ) : (
        SKILLS.map((skill) => {
          const skillTopics = topicsBySkill[skill] || [];
          if (skillTopics.length === 0) return null;

          return (
            <div key={skill} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded ${SKILL_COLORS[skill]}`}>
                  {SKILL_LABELS[skill]}
                </span>
                <span className="text-xs text-gray-500">
                  {skillTopics.length} topic{skillTopics.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {skillTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition"
                  >
                    <span className="text-sm text-gray-200 font-medium">{topic.topic_name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(topic)}
                        className="p-2 hover:bg-slate-700 rounded transition text-gray-400 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(topic)}
                        disabled={deleteTopic.isPending}
                        className="p-2 hover:bg-red-900/50 hover:text-red-300 rounded transition text-gray-400 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Add Topic to Grade {gradeFilter}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-slate-700 rounded transition text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Topic Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Phonics (Letter Sounds)"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Skill</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setCreateSkill(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        createSkill === s
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                      }`}
                    >
                      {SKILL_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!createName.trim() || createTopic.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {createTopic.isPending ? "Adding..." : "Add Topic"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Edit Topic</h3>
              <button
                onClick={() => setEditModal(null)}
                className="p-1.5 hover:bg-slate-700 rounded transition text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Topic Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Skill</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditSkill(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        editSkill === s
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                      }`}
                    >
                      {SKILL_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={!editName.trim() || updateTopic.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {updateTopic.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
