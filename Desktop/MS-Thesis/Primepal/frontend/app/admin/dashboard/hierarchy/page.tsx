"use client";

import { useEffect, useState } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";
import { ChevronDown } from "lucide-react";

interface Classroom {
  id: string;
  class_name: string;
  teacher_id: string;
  teachers: { full_name: string };
  grade_level: number;
}

interface Teacher {
  id: string;
  full_name: string;
}

export default function SchoolHierarchyPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignModal, setReassignModal] = useState<{ classroom_id: string; show: boolean }>({ classroom_id: "", show: false });
  const [selectedTeacher, setSelectedTeacher] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = await getAdminHeaders();

      const classroomsRes = await fetch("/api/v1/admin/classrooms", { headers });
      const classroomsData = await classroomsRes.json();
      setClassrooms(classroomsData);

      const teachersRes = await fetch("/api/v1/admin/teachers", { headers });
      const teachersData = await teachersRes.json();
      setTeachers(teachersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedTeacher) return;

    try {
      const headers = await getAdminHeaders();
      const response = await fetch(`/api/v1/admin/classrooms/${reassignModal.classroom_id}/reassign`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: selectedTeacher }),
      });

      if (response.ok) {
        await fetchData();
        setReassignModal({ classroom_id: "", show: false });
        setSelectedTeacher("");
      }
    } catch (err) {
      alert("Failed to reassign classroom");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">School Hierarchy</h2>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex items-center justify-between hover:border-slate-600 transition"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">{classroom.class_name}</h3>
                <p className="text-sm text-gray-400">
                  Grade {classroom.grade_level} • Teacher: {classroom.teachers?.full_name || "Unassigned"}
                </p>
              </div>

              {reassignModal.show && reassignModal.classroom_id === classroom.id ? (
                <div className="flex items-center gap-3">
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="px-4 py-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                  >
                    <option value="">Select teacher...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleReassign}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setReassignModal({ classroom_id: "", show: false })}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReassignModal({ classroom_id: classroom.id, show: true });
                    setSelectedTeacher(classroom.teacher_id);
                  }}
                  className="px-4 py-2 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 transition text-sm"
                >
                  Reassign
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
