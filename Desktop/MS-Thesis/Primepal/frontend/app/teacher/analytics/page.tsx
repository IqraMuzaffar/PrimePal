"use client";

import React from "react";
import { useFilterParams } from "@/components/teacher/FilterBar";
import { useTeacherAnalytics } from "@/lib/hooks/teacher-queries";
import AnalyticsClient from "./components/AnalyticsClient";

export default function AnalyticsPage() {
  const { gradeLevel, pillar, section } = useFilterParams();
  const { data, isLoading, error } = useTeacherAnalytics({
    gradeLevel,
    pillar,
    section,
  });

  return (
    <AnalyticsClient
      data={data}
      isLoading={isLoading}
      error={error}
      gradeLevel={gradeLevel}
      pillar={pillar}
      section={section}
    />
  );
}
