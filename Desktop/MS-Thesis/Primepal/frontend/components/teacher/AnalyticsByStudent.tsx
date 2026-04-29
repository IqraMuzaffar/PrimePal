"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import SearchBar from "@/components/teacher/SearchBar";
import type { AnalyticsDashboardData } from "@/types/analytics";

interface Props {
  data: AnalyticsDashboardData;
  page: number;
  filters: { grade?: number; class?: string };
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: { grade?: number; class?: string }) => void;
}

export default function AnalyticsByStudent({
  data,
  page,
  filters,
  onPageChange,
  onFiltersChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const { studentTableData, classrooms } = data;

  const uniqueGrades = Array.from(new Set(classrooms.map((c) => c.grade))).sort();
  const uniqueClasses = Array.from(new Set(classrooms.map((c) => c.name))).sort();

  // Filter students in memory (grade, class, and search query)
  const filteredStudents = studentTableData.items.filter((student) => {
    if (filters.grade && student.grade !== filters.grade) return false;
    if (filters.class && student.className !== filters.class) return false;

    // Search by name or roll number
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !student.name.toLowerCase().includes(query) &&
        !student.rollNumber.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "bg-green-100 text-green-700";
    if (accuracy >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const startIdx = (page - 1) * 10;
  const endIdx = startIdx + 10;
  const paginatedStudents = filteredStudents.slice(startIdx, endIdx);
  const totalPages = Math.ceil(filteredStudents.length / 10);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name or roll number..."
      />

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Filter by Grade
          </label>
          <div className="relative">
            <select
              value={filters.grade ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  grade: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="">All Grades</option>
              {uniqueGrades.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Filter by Class
          </label>
          <div className="relative">
            <select
              value={filters.class ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  class: e.target.value || undefined,
                })
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Roll Number</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Grade</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Class</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Accuracy</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Points</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No students found
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {student.avatarUrl ? (
                          <Image
                            src={student.avatarUrl}
                            alt={student.name}
                            width={32}
                            height={32}
                            className="rounded-full bg-gray-100"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-gray-900 font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{student.rollNumber}</td>
                    <td className="px-6 py-4 text-gray-600">Grade {student.grade}</td>
                    <td className="px-6 py-4 text-gray-600">{student.className}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full inline-block ${getAccuracyColor(
                          student.accuracy
                        )}`}
                      >
                        {student.accuracy}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-900 font-semibold">
                      {student.totalPoints}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-medium">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {startIdx + 1}–{Math.min(endIdx, filteredStudents.length)} of{" "}
              {filteredStudents.length} students
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <span className="text-sm text-gray-600 px-3">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
