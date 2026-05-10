"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import {
  useAdminTeachers,
  useInviteAdmin,
  useUpdateAdminTeacher,
  useDeleteAdminTeacher,
  type AdminTeacher,
} from "@/lib/hooks/admin-queries";

export default function StaffDirectoryPage() {
  const { data: teachers = [], isLoading: loading, error: fetchError } = useAdminTeachers();
  const inviteAdmin = useInviteAdmin();
  const updateTeacher = useUpdateAdminTeacher();
  const deleteTeacher = useDeleteAdminTeacher();

  const error = fetchError instanceof Error ? fetchError.message : fetchError ? String(fetchError) : "";

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const inviting = inviteAdmin.isPending;

  // Edit modal
  const [editModal, setEditModal] = useState<AdminTeacher | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const saving = updateTeacher.isPending;

  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState<AdminTeacher | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const deleting = deleteTeacher.isPending;

  const handleInvite = async () => {
    try {
      const data = await inviteAdmin.mutateAsync({ email: inviteEmail, expires_in_days: 7 });
      alert(`Invite code: ${data.code}\n\nShare this with the new admin.`);
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to create invite");
    }
  };

  const openEditModal = (teacher: AdminTeacher) => {
    setEditModal(teacher);
    setEditName(teacher.full_name);
    setEditEmail(teacher.email);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      await updateTeacher.mutateAsync({
        id: editModal.id,
        body: { full_name: editName, email: editEmail },
      });
      setEditModal(null);
    } catch (err: any) {
      alert(err.message || "Failed to update teacher");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal || !reassignTo) return;
    try {
      await deleteTeacher.mutateAsync({
        id: deleteModal.id,
        body: { reassign_classrooms_to: reassignTo },
      });
      setDeleteModal(null);
      setReassignTo("");
    } catch (err: any) {
      alert(err.message || "Failed to delete teacher");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Staff Directory
        </h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Invite Admin</span>
          <span className="sm:hidden">Invite</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Invite New Admin
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@school.com"
                className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {inviting ? "Creating..." : "Create Invite"}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Table */}
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {teachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-slate-700 transition"
                  >
                    <td className="px-6 py-4 font-medium">
                      {teacher.full_name}
                    </td>
                    <td className="px-6 py-4">{teacher.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          teacher.role === "admin"
                            ? "bg-indigo-900 text-indigo-200"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {teacher.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(teacher)}
                        className="p-2 hover:bg-slate-600 rounded transition"
                        title="Edit teacher"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteModal(teacher)}
                        className="p-2 hover:bg-red-900 hover:text-red-300 rounded transition"
                        title="Delete teacher"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No teachers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Edit Teacher
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
                  Full Name
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
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white"
                />
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
                Delete Teacher
              </h3>
              <button
                onClick={() => {
                  setDeleteModal(null);
                  setReassignTo("");
                }}
                className="p-1 hover:bg-slate-700 rounded transition"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {deleteModal.full_name}
              </span>
              ? All their classrooms will be reassigned.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reassign classrooms to
              </label>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
              >
                <option value="">Select a teacher...</option>
                {teachers
                  .filter((t) => t.id !== deleteModal.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting || !reassignTo}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Delete Teacher"}
              </button>
              <button
                onClick={() => {
                  setDeleteModal(null);
                  setReassignTo("");
                }}
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
