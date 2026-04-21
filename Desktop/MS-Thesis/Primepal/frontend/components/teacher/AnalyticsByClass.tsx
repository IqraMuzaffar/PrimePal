"use client";

import { ChevronDown, Crown, Activity } from "lucide-react";
import type { AnalyticsDashboardData } from "@/types/analytics";

interface Props {
  data: AnalyticsDashboardData;
  selectedGrade: number | null;
  selectedSection: string | null;
  onGradeChange: (grade: number | null) => void;
  onSectionChange: (section: string | null) => void;
}

export default function AnalyticsByClass({
  data,
  selectedGrade,
  selectedSection,
  onGradeChange,
  onSectionChange,
}: Props) {
  const { sections, classrooms } = data;

  const uniqueGrades = Array.from(new Set(classrooms.map((c) => c.grade))).sort();

  const sectionsInGrade = selectedGrade
    ? sections.filter((s) => s.grade === selectedGrade)
    : [];

  const selectedSectionData = selectedGrade && selectedSection
    ? sectionsInGrade.find((s) => s.section === selectedSection)
    : null;

  return (
    <div className="space-y-8">
      {/* Grade and Section Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Grade
          </label>
          <div className="relative">
            <select
              value={selectedGrade ?? ""}
              onChange={(e) => {
                onGradeChange(e.target.value ? Number(e.target.value) : null);
                onSectionChange(null);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
            >
              <option value="">— Select Grade —</option>
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
            Select Section
          </label>
          <div className="relative">
            <select
              value={selectedSection ?? ""}
              onChange={(e) => onSectionChange(e.target.value || null)}
              disabled={!selectedGrade}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">— Select Section —</option>
              {sectionsInGrade.map((section) => (
                <option key={section.sectionId} value={section.section}>
                  Section {section.section}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {selectedSectionData && (
        <>
          {/* Leaderboard */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Section {selectedSectionData.section} — Leaderboard
              </h3>
            </div>

            <div className="px-6 py-6 space-y-3">
              <p className="text-sm text-gray-600">
                Top student: <span className="font-semibold">{selectedSectionData.topStudentName}</span>
              </p>
              <p className="text-sm text-gray-600">
                Total students: <span className="font-semibold">{selectedSectionData.studentCount}</span>
              </p>
            </div>
          </div>

          {/* Recent Activity Feed (Stub) */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Section {selectedSectionData.section} — Recent Activity
              </h3>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm text-gray-500 italic">Activity feed coming soon</p>
            </div>
          </div>
        </>
      )}

      {!selectedSection && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed flex items-center justify-center py-16">
          <p className="text-gray-500 text-sm">
            Select a grade and section to view leaderboard and activity
          </p>
        </div>
      )}
    </div>
  );
}
