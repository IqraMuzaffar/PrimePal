"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  BookOpen,
  PenTool,
  Ear,
  MessageCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface Classroom {
  id: string;
  class_name: string;
  grade_level: number;
}

interface StudentMissionData {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  roll_number: string | null;
  total_interactions: number;
  mission_accuracy_pct: number;
}

interface ClassroomMissionReport {
  classroom_id: string;
  grade_level: number;
  students: StudentMissionData[];
}

export default function MissionsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
  const [missionData, setMissionData] = useState<ClassroomMissionReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClassrooms() {
      try {
        const headers = await getTeacherHeaders();
        const data = await apiFetch<Classroom[]>("/classroom/", { headers });
        setClassrooms(data || []);
        if (data && data.length > 0) setSelectedClassroom(data[0].id);
      } catch (err) {
        console.error("Failed to load classrooms:", err);
      } finally {
        setLoading(false);
      }
    }
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassroom === "all") {
      setMissionData(null);
      return;
    }
    fetchClassroomMissions(selectedClassroom);
  }, [selectedClassroom]);

  async function fetchClassroomMissions(classroomId: string) {
    try {
      setDataLoading(true);
      setError(null);
      const headers = await getTeacherHeaders();
      const data = await apiFetch<ClassroomMissionReport>(
        `/evaluator/report/classroom/${classroomId}`,
        { headers }
      );
      setMissionData(data);
    } catch (err) {
      console.error("Failed to fetch mission data:", err);
      setError("Failed to load mission data");
    } finally {
      setDataLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-gray-500">Loading missions hub...</p>
        </div>
      </div>
    );
  }

  const stats = missionData
    ? {
        totalStudents: missionData.students.length,
        totalMissions: missionData.students.reduce(
          (sum, s) => sum + s.total_interactions,
          0
        ),
        avgAccuracy: Math.round(
          missionData.students.reduce((sum, s) => sum + s.mission_accuracy_pct, 0) /
            (missionData.students.length || 1)
        ),
      }
    : null;

  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-8 h-8 text-amber-500" />
            Missions Hub
          </h1>
          <p className="text-gray-600 mt-1">
            Track student mission performance and engagement across pillars
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Select Classroom
          </label>
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All Classrooms</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                Grade {c.grade_level} - {c.class_name}
              </option>
            ))}
          </select>
        </motion.div>

        {selectedClassroom !== "all" && (
          <>
            {/* Stats Cards */}
            {stats && !dataLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Active Students
                      </p>
                      <p className="text-3xl font-bold text-indigo-600 mt-2">
                        {stats.totalStudents}
                      </p>
                    </div>
                    <BookOpen className="w-8 h-8 text-indigo-200" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Total Missions
                      </p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {stats.totalMissions}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-amber-200" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Avg Accuracy
                      </p>
                      <p className="text-3xl font-bold text-emerald-600 mt-2">
                        {stats.avgAccuracy}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-200" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {dataLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center h-64">
                <p className="text-gray-500">Loading mission data...</p>
              </div>
            )}

            {/* Student Missions List */}
            {!dataLoading && missionData && missionData.students.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Student Performance
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Mission completion and accuracy by student
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {missionData.students.map((student, idx) => (
                      <motion.div
                        key={student.student_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {student.student_name}
                            </p>
                            {student.roll_number && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Roll: {student.roll_number}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {student.total_interactions}
                              </p>
                              <p className="text-xs text-gray-500">Missions</p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    student.mission_accuracy_pct >= 80
                                      ? "bg-emerald-500"
                                      : student.mission_accuracy_pct >= 60
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${student.mission_accuracy_pct}%`,
                                  }}
                                />
                              </div>
                              <p className="text-sm font-semibold text-gray-900 min-w-[40px]">
                                {student.mission_accuracy_pct}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {!dataLoading && missionData && missionData.students.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                <Zap size={40} className="mx-auto mb-4 text-gray-300" />
                <p className="font-semibold text-gray-700">No mission data yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Students will appear here once they complete their first mission.
                </p>
              </div>
            )}

            {/* Pillar Legend */}
            {!dataLoading && stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-gray-200 p-6"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  4-Pillar Missions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-gray-700">Reading</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-violet-600" />
                    <span className="text-sm text-gray-700">Writing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ear className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700">Listening</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-rose-600" />
                    <span className="text-sm text-gray-700">Speaking</span>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
