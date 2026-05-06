"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { TeacherWeeklyTrend } from "@/types/analytics";

interface PerformanceTrendsProps {
  trends: TeacherWeeklyTrend[];
  pillar?: string;
}

export default function PerformanceTrends({ trends, pillar }: PerformanceTrendsProps) {
  if (!trends || trends.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Weekly Performance Trends</h2>
        </div>
        <p className="text-sm text-gray-500 text-center py-8">
          No trend data available
        </p>
      </div>
    );
  }

  const maxAccuracy = Math.max(...trends.map((t) => t.avg_accuracy), 100);
  const maxInteractions = Math.max(...trends.map((t) => t.total_interactions), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">
          Weekly Performance Trends
          {pillar && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({pillar.charAt(0).toUpperCase() + pillar.slice(1)} only)
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Average Accuracy (%)
          </h3>
          <div className="flex items-end gap-2 h-32">
            {trends.map((week, idx) => {
              const height = (week.avg_accuracy / maxAccuracy) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all hover:from-indigo-600 hover:to-indigo-500"
                      style={{ height: `${height}%` }}
                      title={`${week.week_label}: ${week.avg_accuracy}%`}
                    />
                  </div>
                  <span className="text-xs text-gray-900 font-semibold">
                    {week.avg_accuracy}%
                  </span>
                  <span className="text-xs text-gray-500 text-center leading-tight">
                    {week.week_label.split(" - ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Total Interactions
          </h3>
          <div className="flex items-end gap-2 h-32">
            {trends.map((week, idx) => {
              const height = (week.total_interactions / maxInteractions) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center h-24">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all hover:from-emerald-600 hover:to-emerald-500"
                      style={{ height: `${height}%` }}
                      title={`${week.week_label}: ${week.total_interactions} interactions`}
                    />
                  </div>
                  <span className="text-xs text-gray-900 font-semibold">
                    {week.total_interactions}
                  </span>
                  <span className="text-xs text-gray-500 text-center leading-tight">
                    {week.week_label.split(" - ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
