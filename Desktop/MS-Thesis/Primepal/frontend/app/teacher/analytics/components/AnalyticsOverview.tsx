"use client";

import React from "react";
import { Users, Activity, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/teacher/design-system";
import { designTokens } from "@/lib/design-tokens";
import { TeacherSummaryStats } from "@/types/analytics";

interface AnalyticsOverviewProps {
  stats: TeacherSummaryStats;
  pillar?: string;
}

export default function AnalyticsOverview({ stats, pillar }: AnalyticsOverviewProps) {
  const pillarLabel = pillar
    ? `${pillar.charAt(0).toUpperCase() + pillar.slice(1)} only`
    : "All pillars";

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats.total_students}
          label="Total Students"
          subtitle="With recorded activity"
          icon={Users}
          iconColor={designTokens.colors.primary}
          iconBg={designTokens.colors.primaryBg}
        />
        <StatCard
          value={stats.total_interactions}
          label="Total Interactions"
          subtitle={pillarLabel}
          icon={Activity}
          iconColor={designTokens.colors.success}
          iconBg={designTokens.colors.successBg}
        />
        <StatCard
          value={`${stats.avg_accuracy}%`}
          label="Avg Accuracy"
          subtitle="Across all students"
          icon={Target}
          iconColor={designTokens.colors.warning}
          iconBg={designTokens.colors.warningBg}
        />
        <StatCard
          value={stats.active_this_week}
          label="Active This Week"
          subtitle="Students with recent activity"
          icon={TrendingUp}
          iconColor="#7c3aed"
          iconBg="#ede9fe"
        />
      </div>
    </div>
  );
}
