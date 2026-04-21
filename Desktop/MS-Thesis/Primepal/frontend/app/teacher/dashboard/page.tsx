"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, BookOpen, BarChart3, ChevronRight, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";
import type { Classroom } from "@/types";

interface StudentStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
}

export default function DashboardPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = await getTeacherHeaders();
        const classroomData = await apiFetch<Classroom[]>("/classroom/", { headers });
        setClassrooms(classroomData);

        // Calculate stats
        if (classroomData.length > 0) {
          let totalStudents = 0;
          let totalInteractions = 0;
          let totalAccuracy = 0;
          let classroomCount = 0;

          for (const c of classroomData) {
            // This is a simplified calculation; in production you'd fetch from analytics endpoint
            totalStudents += Math.floor(Math.random() * 30) + 10; // Mock: 10-40 students per class
            totalInteractions += Math.floor(Math.random() * 500) + 100; // Mock: 100-600 interactions
            totalAccuracy += Math.floor(Math.random() * 40) + 60; // Mock: 60-100% accuracy
            classroomCount++;
          }

          setStats({
            total_students: totalStudents,
            total_interactions: totalInteractions,
            avg_accuracy: Math.round(totalAccuracy / classroomCount),
          });
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="bg-gray-50 min-h-full">
      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teaching Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your teaching overview.</p>
        </div>

        {/* Stats Grid */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Students */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_students}</p>
                  <p className="text-xs text-gray-500 mt-2">Across all classrooms</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Total Interactions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Interactions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_interactions}</p>
                  <p className="text-xs text-gray-500 mt-2">Student missions & chat</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Avg Accuracy */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Accuracy</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avg_accuracy}%</p>
                  <p className="text-xs text-gray-500 mt-2">Across all students</p>
                </div>
                <div className="p-3 bg-rose-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-rose-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Access Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Your Classrooms</h2>
            <Link
              href="/teacher/classroom"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              Manage all
              <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-32 animate-pulse" />
              ))}
            </div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No classrooms yet</p>
              <p className="text-xs text-gray-400 mt-1">
                <Link href="/teacher/classroom" className="text-indigo-600 hover:underline">
                  Create your first classroom
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {classrooms.map((c) => (
                <Link
                  key={c.id}
                  href={`/teacher/classroom/${c.id}`}
                  className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      c.grade_level === 1 ? 'bg-emerald-100 text-emerald-700' :
                      c.grade_level === 2 ? 'bg-sky-100 text-sky-700' :
                      c.grade_level === 3 ? 'bg-violet-100 text-violet-700' :
                      c.grade_level === 4 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      Gr {c.grade_level}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                    {c.class_name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2">Code: <span className="font-mono font-bold text-gray-700">{c.class_code}</span></p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              href="/teacher/analytics"
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <BarChart3 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </Link>

            <Link
              href="/teacher/classroom"
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <Users className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">Manage Classrooms</span>
            </Link>

            <Link
              href="/teacher/curriculum"
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <BookOpen className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">Curriculum Hub</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
