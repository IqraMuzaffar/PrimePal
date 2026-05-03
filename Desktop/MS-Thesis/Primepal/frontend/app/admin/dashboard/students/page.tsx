"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  KeyRound,
  Copy,
} from "lucide-react";
import {
  useAdminStudents,
  useAdminClassrooms,
  useCreateAdminStudent,
  useUpdateAdminStudent,
  useDeleteAdminStudent,
  useResetStudentPin,
  type AdminStudent,
} from "@/lib/hooks/admin-queries";

export default function StudentsPage() {
  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useAdminStudents();
  const { data: classrooms = [], isLoading: classroomsLoading } = useAdminClassrooms();
  const createStudent = useCreateAdminStudent();
  const updateStudent = useUpdateAdminStudent();
  const deleteStudent = useDeleteAdminStudent();
  const resetPin = useResetStudentPin();

  const loading = studentsLoading || classroomsLoading;
  const error = studentsError instanceof Error ? studentsError.message : studentsError ? String(studentsError) : "";

  // Filters
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | "">("");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRoll, setCreateRoll] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createClassroom, setCreateClassroom] = useState("");
  const [createdPin, setCreatedPin] = useState("");
  const creating = createStudent.isPending;

  // Edit modal
  const [editModal, setEditModal] = useState<AdminStudent | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoll, setEditRoll] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editClassroom, setEditClassroom] = useState("");
  const saving = updateStudent.isPending;

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<AdminStudent | null>(null);
  const deleting = deleteStudent.isPending;

  // Reset PIN modal
  const [resetPinModal, setResetPinModal] = useState<AdminStudent | null>(null);
  const [newPin, setNewPin] = useState("");
  const resettingPin = resetPin.isPending;

  const handleCreate = async () => {
    if (!createName.trim() || !createClassroom) return;
    try {
      const body: Record<string, unknown> = {
        student_name: createName.trim(),
        classroom_id: createClassroom,
      };
      if (createRoll.trim()) body.roll_number = createRoll.trim();
      if (createEmail.trim()) body.email = createEmail.trim();
      const data = await createStudent.mutateAsync(body);
      setCreatedPin(data.secret_pin || "");
      setCreateName("");
      setCreateRoll("");
      setCreateEmail("");
      setCreateClassroom("");
    } catch (err: any) {
      alert(err.message || "Failed to create student");
    }
  };

  const openEditModal = (s: AdminStudent) => {
    setEditModal(s);
    setEditName(s.student_name);
    setEditRoll(s.roll_number || "");
    setEditEmail(s.email || "");
    setEditClassroom(s.classroom_id);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      await updateStudent.mutateAsync({
        id: editModal.id,
        body: {
          student_name: editName.trim(),
          roll_number: editRoll.trim() || null,
          email: editEmail.trim() || null,
          classroom_id: editClassroom,
        },
      });
      setEditModal(null);
    } catch (err: any) {
      alert(err.message || "Failed to update student");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteStudent.mutateAsync(deleteModal.id);
      setDeleteModal(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete student");
    }
  };

  const handleResetPin = async () => {
    if (!resetPinModal) return;
    try {
      const data = await resetPin.mutateAsync(resetPinModal.id);
      setNewPin(data.new_pin);
    } catch (err: any) {
      alert(err.message || "Failed to reset PIN");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // Apply filters client-side
  const filtered = students.filter((s) => {
    if (gradeFilter !== "" && s.grade_level !== gradeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (s.student_name || "").toLowerCase().includes(q);
      const rollMatch = (s.roll_number || "").toLowerCase().includes(q);
      if (!nameMatch && !rollMatch) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Students</h2>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreatedPin("");
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Add Student</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll number..."
            className="w-full pl-9 pr-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm placeholder-gray-400"
          />
        </div>
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
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Roll No.
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">Grade</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Classroom
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700 transition">
                    <td className="px-6 py-4 font-medium">{s.student_name}</td>
                    <td className="px-6 py-4">{s.roll_number || "-"}</td>
                    <td className="px-6 py-4">
                      {s.grade_level != null ? s.grade_level : "-"}
                    </td>
                    <td className="px-6 py-4">{s.classroom_name || "-"}</td>
                    <td className="px-6 py-4">{s.email || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-2 hover:bg-slate-600 rounded transition"
                          title="Edit student"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setResetPinModal(s);
                            setNewPin("");
                          }}
                          className="p-2 hover:bg-amber-900 hover:text-amber-300 rounded transition"
                          title="Reset PIN"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteModal(s)}
                          className="p-2 hover:bg-red-900 hover:text-red-300 rounded transition"
                          title="Delete student"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No students found.
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
                {createdPin ? "Student Created" : "Add Student"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreatedPin("");
                }}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {createdPin ? (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                  <p className="text-green-300 text-sm mb-2">
                    Student created successfully. Their login PIN is:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-mono font-bold text-white tracking-wider">
                      {createdPin}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdPin)}
                      className="p-2 hover:bg-slate-700 rounded transition"
                      title="Copy PIN"
                    >
                      <Copy size={16} className="text-gray-400" />
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    Share this PIN with the student. It will not be shown again.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedPin("");
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Ahmed Khan"
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Classroom
                  </label>
                  <select
                    value={createClassroom}
                    onChange={(e) => setCreateClassroom(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                  >
                    <option value="">Select a classroom...</option>
                    {classrooms.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} (Grade {c.grade_level})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Roll Number (optional)
                    </label>
                    <input
                      type="text"
                      value={createRoll}
                      onChange={(e) => setCreateRoll(e.target.value)}
                      placeholder="e.g. 001"
                      className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="student@email.com"
                      className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={
                      creating || !createName.trim() || !createClassroom
                    }
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {creating ? "Creating..." : "Add Student"}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Student
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
                  Student Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Classroom
                </label>
                <select
                  value={editClassroom}
                  onChange={(e) => setEditClassroom(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  {classrooms.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name} (Grade {c.grade_level})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={editRoll}
                    onChange={(e) => setEditRoll(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
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
                Delete Student
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
                {deleteModal.student_name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Delete Student"}
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

      {/* Reset PIN Modal */}
      {resetPinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {newPin ? "PIN Reset" : "Reset PIN"}
              </h3>
              <button
                onClick={() => {
                  setResetPinModal(null);
                  setNewPin("");
                }}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {newPin ? (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                  <p className="text-green-300 text-sm mb-2">
                    New PIN for{" "}
                    <span className="font-semibold">
                      {resetPinModal.student_name}
                    </span>
                    :
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-mono font-bold text-white tracking-wider">
                      {newPin}
                    </span>
                    <button
                      onClick={() => copyToClipboard(newPin)}
                      className="p-2 hover:bg-slate-700 rounded transition"
                      title="Copy PIN"
                    >
                      <Copy size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setResetPinModal(null);
                    setNewPin("");
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-300 text-sm mb-4">
                  Generate a new PIN for{" "}
                  <span className="font-semibold text-white">
                    {resetPinModal.student_name}
                  </span>
                  ? The old PIN will stop working immediately.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleResetPin}
                    disabled={resettingPin}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    {resettingPin ? "Resetting..." : "Reset PIN"}
                  </button>
                  <button
                    onClick={() => setResetPinModal(null)}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
