"use client";

import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import {
  useAdminClassrooms,
  useAdminTeachers,
  useAdminStudents,
  useCreateAdminClassroom,
  useUpdateAdminClassroom,
  useDeleteAdminClassroom,
  type AdminClassroom,
} from "@/lib/hooks/admin-queries";

export default function ClassroomsPage() {
  const { data: rawClassrooms = [], isLoading: classroomsLoading, error: classroomsError } = useAdminClassrooms();
  const { data: teachers = [], isLoading: teachersLoading } = useAdminTeachers();
  const { data: allStudents = [] } = useAdminStudents();
  const createClassroom = useCreateAdminClassroom();
  const updateClassroom = useUpdateAdminClassroom();
  const deleteClassroom = useDeleteAdminClassroom();

  const loading = classroomsLoading || teachersLoading;
  const error = classroomsError instanceof Error ? classroomsError.message : classroomsError ? String(classroomsError) : "";

  // Enrich classrooms with student counts derived from query data
  const classrooms = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const s of allStudents) {
      if (s.classroom_id) countMap[s.classroom_id] = (countMap[s.classroom_id] || 0) + 1;
    }
    return rawClassrooms.map((c) => ({ ...c, student_count: countMap[c.id] || 0 }));
  }, [rawClassrooms, allStudents]);

  const [gradeFilter, setGradeFilter] = useState<number | "">("");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createGrade, setCreateGrade] = useState(1);
  const [createSection, setCreateSection] = useState("");
  const [createTeacher, setCreateTeacher] = useState("");
  const creating = createClassroom.isPending;

  // Edit modal
  const [editModal, setEditModal] = useState<AdminClassroom | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState(1);
  const [editSection, setEditSection] = useState("");
  const saving = updateClassroom.isPending;

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<AdminClassroom | null>(null);
  const deleting = deleteClassroom.isPending;

  const handleCreate = async () => {
    if (!createName.trim() || !createTeacher) return;
    try {
      const body: Record<string, unknown> = {
        class_name: createName.trim(),
        grade_level: createGrade,
        teacher_id: createTeacher,
      };
      if (createSection.trim()) body.section = createSection.trim();
      await createClassroom.mutateAsync(body);
      setShowCreateModal(false);
      setCreateName("");
      setCreateGrade(1);
      setCreateSection("");
      setCreateTeacher("");
    } catch (err: any) {
      alert(err.message || "Failed to create classroom");
    }
  };

  const openEditModal = (c: AdminClassroom) => {
    setEditModal(c);
    setEditName(c.class_name);
    setEditGrade(c.grade_level);
    setEditSection(c.section || "");
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      await updateClassroom.mutateAsync({
        id: editModal.id,
        body: {
          class_name: editName.trim(),
          grade_level: editGrade,
          section: editSection.trim() || null,
        },
      });
      setEditModal(null);
    } catch (err: any) {
      alert(err.message || "Failed to update classroom");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteClassroom.mutateAsync(deleteModal.id);
      setDeleteModal(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete classroom");
    }
  };

  const filtered =
    gradeFilter === ""
      ? classrooms
      : classrooms.filter((c) => c.grade_level === gradeFilter);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Classrooms
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={gradeFilter}
            onChange={(e) =>
              setGradeFilter(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
          >
            <option value="">All Grades</option>
            {[1, 2, 3, 4, 5].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Classroom</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">
                    Class Name
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">Grade</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Class Code
                  </th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700 transition">
                    <td className="px-6 py-4 font-medium">{c.class_name}</td>
                    <td className="px-6 py-4">{c.grade_level}</td>
                    <td className="px-6 py-4">{c.section || "-"}</td>
                    <td className="px-6 py-4">
                      {c.teachers?.full_name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.student_count ?? 0}
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">
                        {c.class_code}
                      </code>
                    </td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 hover:bg-slate-600 rounded transition"
                        title="Edit classroom"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal(c)}
                        className="p-2 hover:bg-red-900 hover:text-red-300 rounded transition"
                        title="Delete classroom"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No classrooms found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                New Classroom
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. English Grade 3A"
                  className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Grade Level
                  </label>
                  <select
                    value={createGrade}
                    onChange={(e) => setCreateGrade(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Section (optional)
                  </label>
                  <input
                    type="text"
                    value={createSection}
                    onChange={(e) => setCreateSection(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Teacher
                </label>
                <select
                  value={createTeacher}
                  onChange={(e) => setCreateTeacher(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={
                    creating || !createName.trim() || !createTeacher
                  }
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {creating ? "Creating..." : "Create Classroom"}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Classroom
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Grade Level
                  </label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEdit}
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Delete Classroom
              </h3>
              <button
                onClick={() => setDeleteModal(null)}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {deleteModal.class_name}
              </span>
              ? This cannot be undone.
            </p>
            {(deleteModal.student_count ?? 0) > 0 && (
              <p className="text-amber-400 text-sm mb-4">
                This classroom has {deleteModal.student_count} student(s).
                Remove or transfer them first.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Delete Classroom"}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
