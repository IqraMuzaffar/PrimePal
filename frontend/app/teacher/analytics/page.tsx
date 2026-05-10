"use client";

import React, { Suspense } from "react";
import { useFilterParams } from "@/components/teacher/FilterBar";
import { useTeacherAnalytics } from "@/lib/hooks/teacher-queries";
import AnalyticsClient from "./components/AnalyticsClient";

function AnalyticsPageInner() {
  const { gradeLevel, pillar } = useFilterParams();
  // Fetch once — no filter params. Client-side filtering handles grade/pillar.
  const { data, isLoading, error } = useTeacherAnalytics();

  return (
    <AnalyticsClient
      data={data}
      isLoading={isLoading}
      error={error}
      gradeLevel={gradeLevel}
      pillar={pillar}
    />
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Loading…</div>}>
      <AnalyticsPageInner />
    </Suspense>
  );
}
