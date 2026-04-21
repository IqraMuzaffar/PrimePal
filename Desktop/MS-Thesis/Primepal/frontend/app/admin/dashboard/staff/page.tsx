"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function StaffDirectoryPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/v1/admin/teachers", { headers });
      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/v1/admin/invite-code", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, expires_in_days: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Invite code: ${data.code}\n\nShare this with the new admin.`);
        setInviteEmail("");
        setInviteName("");
        setShowInviteModal(false);
      }
    } catch (err) {
      alert("Failed to create invite");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Staff Directory</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          Invite Admin
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Invite New Admin</h3>
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
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">Email</th>
                <th className="px-6 py-3 text-left font-semibold">Role</th>
                <th className="px-6 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-700 transition">
                  <td className="px-6 py-4 font-medium">{teacher.full_name}</td>
                  <td className="px-6 py-4">{teacher.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-xs font-semibold ${
                      teacher.role === 'admin'
                        ? 'bg-indigo-900 text-indigo-200'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {teacher.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-center gap-2">
                    <button className="p-2 hover:bg-slate-600 rounded transition">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 hover:bg-red-900 hover:text-red-300 rounded transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
