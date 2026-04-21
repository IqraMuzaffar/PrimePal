"use client";

import { ChevronDown, BookOpen } from "lucide-react";
import type { AnalyticsDashboardData } from "@/types/analytics";

interface Props {
  data: AnalyticsDashboardData;
  selectedGrade: number | null;
  onGradeChange: (grade: number | null) => void;
}

export default function AnalyticsByGrade({ data, selectedGrade, onGradeChange }: Props) {
  const { classrooms, weakPointsByGrade } = data;
  const uniqueGrades = Array.from(new Set(classrooms.map((c) => c.grade))).sort();

  const classroomsInGrade = selectedGrade
    ? classrooms.filter((c) => c.grade === selectedGrade)
    : [];

  const gradeStats = classroomsInGrade.length > 0
    ? {
        studentCount: classroomsInGrade.reduce((sum, c) => sum + c.studentCount, 0),
        avgAccuracy:
          classroomsInGrade.reduce((sum, c) => sum + c.avgAccuracy, 0) / classroomsInGrade.length,
      }
    : null;

  return (
    <div className="space-y-8">
      {/* Grade Selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select a Grade
        </label>
        <div className="relative">
          <select
            value={selectedGrade ?? ""}
            onChange={(e) => onGradeChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
          >
            <option value="">— Select a Grade —</option>
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {selectedGrade && gradeStats && (
        <>
          {/* Grade Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                Total Students
              </p>
              <p className="text-3xl font-bold text-gray-900">{gradeStats.studentCount}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                Average Accuracy
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(gradeStats.avgAccuracy)}%
              </p>
            </div>
          </div>

          {/* Weak Points */}
          {weakPointsByGrade[selectedGrade] && weakPointsByGrade[selectedGrade].length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Common Struggling Topics
                </h3>
              </div>
              <div className="px-6 py-6">
                <ul className="space-y-3">
                  {weakPointsByGrade[selectedGrade].map((topic, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-lg">📖</span>
                      <span className="text-sm text-gray-700">{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Classrooms in Grade */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Classrooms in Grade {selectedGrade}
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {classroomsInGrade.map((classroom) => (
                <div key={classroom.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{classroom.name}</p>
                    <p className="text-xs text-gray-500">
                      {classroom.studentCount} student{classroom.studentCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {Math.round(classroom.avgAccuracy)}% avg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedGrade && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed flex items-center justify-center py-16">
          <p className="text-gray-500 text-sm">Select a grade to view detailed analytics</p>
        </div>
      )}
    </div>
  );
}
