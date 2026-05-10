"use client";

import React from "react";
import { Trophy, AlertTriangle } from "lucide-react";
import { TeacherStudentRanking } from "@/types/analytics";

interface StudentRankingsProps {
  topStudents: TeacherStudentRanking[];
  strugglingStudents: TeacherStudentRanking[];
}

export default function StudentRankings({
  topStudents,
  strugglingStudents,
}: StudentRankingsProps) {
  const renderStudentCard = (
    student: TeacherStudentRanking,
    rank: number,
    isTop: boolean
  ) => {
    const accuracyColor =
      student.overall_accuracy >= 80
        ? "text-emerald-600"
        : student.overall_accuracy >= 60
        ? "text-amber-600"
        : "text-rose-600";

    return (
      <div
        key={student.student_id}
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
      >
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isTop
              ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {student.name}
          </p>
          <p className="text-xs text-gray-500">
            Grade {student.grade_level} • {student.total_interactions} interactions
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-lg font-bold ${accuracyColor}`}>
            {student.overall_accuracy}%
          </p>
          {student.strongest_pillar && (
            <p className="text-xs text-gray-500 capitalize">
              ✓ {student.strongest_pillar}
            </p>
          )}
          {student.weakest_pillar && (
            <p className="text-xs text-gray-500 capitalize">
              ⚠ {student.weakest_pillar}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900">Top Performers</h2>
        </div>
        <div className="space-y-2">
          {topStudents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No students yet
            </p>
          ) : (
            topStudents.map((student, idx) =>
              renderStudentCard(student, idx + 1, true)
            )
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900">Needs Support</h2>
        </div>
        <div className="space-y-2">
          {strugglingStudents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              All students performing well!
            </p>
          ) : (
            strugglingStudents.map((student, idx) =>
              renderStudentCard(student, idx + 1, false)
            )
          )}
        </div>
      </div>
    </div>
  );
}
