"use client";

import { useEffect, useState } from "react";
import { Settings, Plus, Trash2, Edit2, Save, X, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface TeacherProfile {
  id: string;
  email: string;
  name: string;
  subject: string;
  school: string;
  phone?: string;
}

interface Classroom {
  id: string;
  class_name: string;
  grade_level: number;
  section?: string;
}

export default function TeacherSettingsPage() {
  // Teacher Profile State
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileChanges, setProfileChanges] = useState<Partial<TeacherProfile>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Classroom State
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [classroomsError, setClassroomsError] = useState<string | null>(null);

  // Add Classroom Modal
  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ class_name: "", grade_level: 1, section: "" });
  const [addingClassroom, setAddingClassroom] = useState(false);

  // Edit Classroom Modal
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [updatingClassroom, setUpdatingClassroom] = useState(false);

  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "classroom"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Loading
  const [loading, setLoading] = useState(true);

  // Fetch teacher profile and classrooms
  useEffect(() => {
    async function loadData() {
      try {
        const headers = await getTeacherHeaders();

        // Load teacher profile
        const profileData = await apiFetch<TeacherProfile>("/teacher/profile", { headers }).catch(() => null);
        if (profileData) {
          setProfile(profileData);
          setProfileChanges(profileData);
        }

        // Load classrooms
        const classroomsData = await apiFetch<Classroom[]>("/classroom/", { headers });
        setClassrooms(classroomsData || []);
      } catch (err) {
        console.error("Failed to load data:", err);
        setClassroomsError("Failed to load classrooms");
      } finally {
        setLoading(false);
        setLoadingClassrooms(false);
      }
    }
    loadData();
  }, []);

  // Save Teacher Profile
  async function saveProfile() {
    if (!profile) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/teacher/profile`, {
        method: "PATCH",
        body: JSON.stringify(profileChanges),
        headers,
      });
      setProfile({ ...profile, ...profileChanges });
      setProfileSaved(true);
      setEditingProfile(false);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  // Add Classroom
  async function addClassroom() {
    if (!newClassroom.class_name || newClassroom.grade_level < 1 || newClassroom.grade_level > 8) {
      setClassroomsError("Please enter valid classroom details");
      return;
    }

    setAddingClassroom(true);
    setClassroomsError(null);

    try {
      const headers = await getTeacherHeaders();
      const created = await apiFetch<Classroom>("/classroom/", {
        method: "POST",
        body: JSON.stringify(newClassroom),
        headers,
      });
      setClassrooms([...classrooms, created]);
      setNewClassroom({ class_name: "", grade_level: 1, section: "" });
      setShowAddClassroom(false);
    } catch (err) {
      setClassroomsError(err instanceof Error ? err.message : "Failed to create classroom");
    } finally {
      setAddingClassroom(false);
    }
  }

  // Update Classroom
  async function updateClassroom() {
    if (!editingClassroom || !editingClassroom.class_name) {
      setClassroomsError("Please enter valid classroom details");
      return;
    }

    setUpdatingClassroom(true);
    setClassroomsError(null);

    try {
      const headers = await getTeacherHeaders();
      const updated = await apiFetch<Classroom>(`/classroom/${editingClassroom.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          class_name: editingClassroom.class_name,
          grade_level: editingClassroom.grade_level,
          section: editingClassroom.section,
        }),
        headers,
      });
      setClassrooms(classrooms.map((c) => (c.id === updated.id ? updated : c)));
      setEditingClassroom(null);
    } catch (err) {
      setClassroomsError(err instanceof Error ? err.message : "Failed to update classroom");
    } finally {
      setUpdatingClassroom(false);
    }
  }

  // Delete Classroom
  async function deleteClassroom(classroomId: string) {
    setDeleting(true);
    setClassroomsError(null);

    try {
      const headers = await getTeacherHeaders();
      await apiFetch(`/classroom/${classroomId}`, {
        method: "DELETE",
        headers,
      });
      setClassrooms(classrooms.filter((c) => c.id !== classroomId));
      setDeleteConfirm(null);
    } catch (err) {
      setClassroomsError(err instanceof Error ? err.message : "Failed to delete classroom");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-10 h-10 text-indigo-600" />
            Teacher Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your profile, classrooms, and preferences</p>
        </div>

        {/* Teacher Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit2 size={16} />
                Edit
              </button>
            )}
          </div>

          {profileError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{profileError}</p>
            </div>
          )}

          {profileSaved && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700">Profile saved successfully!</p>
            </div>
          )}

          {editingProfile && profile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={profileChanges.name || ""}
                    onChange={(e) => setProfileChanges({ ...profileChanges, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileChanges.email || ""}
                    onChange={(e) => setProfileChanges({ ...profileChanges, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={profileChanges.subject || ""}
                    onChange={(e) => setProfileChanges({ ...profileChanges, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">School</label>
                  <input
                    type="text"
                    value={profileChanges.school || ""}
                    onChange={(e) => setProfileChanges({ ...profileChanges, school: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profileChanges.phone || ""}
                    onChange={(e) => setProfileChanges({ ...profileChanges, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileChanges(profile);
                  }}
                  className="flex-1 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            profile && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-semibold text-gray-900">{profile.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-semibold text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="text-lg font-semibold text-gray-900">{profile.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">School</p>
                  <p className="text-lg font-semibold text-gray-900">{profile.school}</p>
                </div>
              </div>
            )
          )}
        </motion.div>

        {/* Classrooms Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Classrooms</h2>
            <button
              onClick={() => setShowAddClassroom(true)}
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Classroom
            </button>
          </div>

          {classroomsError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{classroomsError}</p>
            </div>
          )}

          {loadingClassrooms ? (
            <p className="text-gray-500">Loading classrooms...</p>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No classrooms yet</p>
              <button
                onClick={() => setShowAddClassroom(true)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Create your first classroom
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {classrooms.map((classroom) => (
                <motion.div
                  key={classroom.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{classroom.class_name}</h3>
                    <p className="text-sm text-gray-600">
                      Grade {classroom.grade_level}
                      {classroom.section && ` • Section ${classroom.section}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingClassroom(classroom)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: "classroom", id: classroom.id })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Classroom Modal */}
      <AnimatePresence>
        {showAddClassroom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddClassroom(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Classroom</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class Name</label>
                  <input
                    type="text"
                    value={newClassroom.class_name}
                    onChange={(e) => setNewClassroom({ ...newClassroom, class_name: e.target.value })}
                    placeholder="e.g., Grade 5A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Level</label>
                  <select
                    value={newClassroom.grade_level}
                    onChange={(e) => setNewClassroom({ ...newClassroom, grade_level: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => (
                      <option key={grade} value={grade}>
                        Grade {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Section (Optional)</label>
                  <input
                    type="text"
                    value={newClassroom.section}
                    onChange={(e) => setNewClassroom({ ...newClassroom, section: e.target.value })}
                    placeholder="e.g., A, B, C"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddClassroom(false)}
                  className="flex-1 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addClassroom}
                  disabled={addingClassroom}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {addingClassroom ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Classroom Modal */}
      <AnimatePresence>
        {editingClassroom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingClassroom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Classroom</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class Name</label>
                  <input
                    type="text"
                    value={editingClassroom.class_name}
                    onChange={(e) =>
                      setEditingClassroom({ ...editingClassroom, class_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Level</label>
                  <select
                    value={editingClassroom.grade_level}
                    onChange={(e) =>
                      setEditingClassroom({ ...editingClassroom, grade_level: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((grade) => (
                      <option key={grade} value={grade}>
                        Grade {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
                  <input
                    type="text"
                    value={editingClassroom.section || ""}
                    onChange={(e) =>
                      setEditingClassroom({ ...editingClassroom, section: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditingClassroom(null)}
                  className="flex-1 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateClassroom}
                  disabled={updatingClassroom}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {updatingClassroom ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Classroom?</h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. All data associated with this classroom will be deleted.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteClassroom(deleteConfirm.id)}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
