"use client";

import { useState } from "react";
import TabNavigation from "./TabNavigation";
import AnalyticsOverview from "./AnalyticsOverview";
import AnalyticsByGrade from "./AnalyticsByGrade";
import AnalyticsByClass from "./AnalyticsByClass";
import AnalyticsByStudent from "./AnalyticsByStudent";
import FilterBar from "./FilterBar";
import type { AnalyticsDashboardData } from "@/types/analytics";

interface Props {
  data: AnalyticsDashboardData;
  gradeLevel?: number;
  pillar?: string;
}

export default function TabbedDashboard({ data, gradeLevel, pillar }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "byGrade" | "byClass" | "byStudent">("overview");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(gradeLevel ?? null);
  const [selectedGradeForClass, setSelectedGradeForClass] = useState<number | null>(gradeLevel ?? null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [studentTablePage, setStudentTablePage] = useState(1);
  const [studentTableFilters, setStudentTableFilters] = useState<{
    grade?: number;
    class?: string;
  }>({
    grade: gradeLevel,
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Global Analytics</h1>
          <p className="text-gray-600 text-sm mt-1">Monitor all classrooms and student performance in one dashboard</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <FilterBar showSearch={false} />
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" && <AnalyticsOverview data={data} />}

        {activeTab === "byGrade" && (
          <AnalyticsByGrade
            data={data}
            selectedGrade={selectedGrade}
            onGradeChange={setSelectedGrade}
          />
        )}

        {activeTab === "byClass" && (
          <AnalyticsByClass
            data={data}
            selectedGrade={selectedGradeForClass}
            selectedSection={selectedSection}
            onGradeChange={setSelectedGradeForClass}
            onSectionChange={setSelectedSection}
          />
        )}

        {activeTab === "byStudent" && (
          <AnalyticsByStudent
            data={data}
            page={studentTablePage}
            filters={studentTableFilters}
            onPageChange={setStudentTablePage}
            onFiltersChange={setStudentTableFilters}
          />
        )}
      </div>
    </div>
  );
}
