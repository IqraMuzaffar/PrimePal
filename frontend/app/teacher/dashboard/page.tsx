"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, TrendingUp, BookOpen, BarChart3, ChevronRight, Activity, BookOpenCheck, Headphones, MessageSquare, FileText, Target } from "lucide-react";
import FilterBar, { useFilterParams } from "@/components/teacher/FilterBar";
import { useTeacherClassrooms, useTeacherDashboardStats, useTeacherSkillAccuracy, type TeacherClassroom } from "@/lib/hooks/teacher-queries";
import { WelcomeBanner } from "@/components/teacher/dashboard";
import { StatCard } from "@/components/teacher/design-system";
import { designTokens } from "@/lib/design-tokens";
import { supabase } from "@/lib/supabase/client";

function skillColor(pct: number): string {
  if (pct >= 70) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (pct >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-rose-600 bg-rose-50 border-rose-200";
}

function DashboardContent() {
  const router = useRouter();
  const { gradeLevel, pillar, section } = useFilterParams();
  const [email, setEmail] = React.useState<string>('');

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email || '');
    });
  }, []);

  const { data: classrooms = [], isLoading: classroomsLoading } = useTeacherClassrooms();
  const { data: stats, isLoading: statsLoading } = useTeacherDashboardStats({ gradeLevel, pillar, section });
  const { data: skillAccuracy, isLoading: skillLoading } = useTeacherSkillAccuracy(gradeLevel, section);

  // Extract unique sections from classrooms for the filter dropdown
  const availableSections = Array.from(new Set(classrooms.map(c => c.section).filter(Boolean))) as string[];
  availableSections.sort();

  // Compute filtered sections based on grade selection
  const filteredSections = gradeLevel
    ? Array.from(new Set(
        classrooms
          .filter(c => c.grade_level === gradeLevel)
          .map(c => c.section)
          .filter((s): s is string => Boolean(s))  // Type predicate
      )).sort()
    : availableSections;

  // Progressive loading: each section renders as its data arrives

  // NEW: Calculate match score for classroom sorting
  const getMatchScore = (classroom: TeacherClassroom) => {
    let score = 0;
    if (gradeLevel) {
      if (classroom.grade_level === gradeLevel) {
        score += 100;
        if (section && classroom.section === section) {
          score += 10;
        }
      }
    } else {
      score = 50; // Default score when no filter
    }
    return score;
  };

  // NEW: Get opacity class for classroom card
  const getClassroomOpacity = (classroom: TeacherClassroom) => {
    if (!gradeLevel) return "opacity-100";

    const matchesGrade = classroom.grade_level === gradeLevel;
    const matchesSection = !section || classroom.section === section;

    if (matchesGrade && matchesSection) return "opacity-100";
    if (matchesGrade) return "opacity-60";
    return "opacity-30";
  };

  return (
    <div style={{ padding: designTokens.spacing.section }}>
      {/* Welcome Banner */}
      <WelcomeBanner
        teacherName={email?.split('@')[0] || 'Teacher'}
        activeClasses={classrooms.length}
        pendingMissions={0}
        onNewMission={() => router.push('/teacher/missions')}
      />

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar showSearch={false} showPillar={true} showSection={true} sections={filteredSections} />
      </div>

      {/* Stats Grid */}
      {statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 h-32 animate-pulse" />
          ))}
        </div>
      )}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            value={stats.total_students}
            label="Total Students"
            subtitle="Across all classrooms"
            icon={Users}
            iconColor={designTokens.colors.primary}
            iconBg={designTokens.colors.primaryBg}
            trend={3}
          />
          <StatCard
            value={stats.total_interactions || 0}
            label="Total Interactions"
            subtitle={pillar ? `${pillar.charAt(0).toUpperCase() + pillar.slice(1)} only` : 'Student missions & chat'}
            icon={Activity}
            iconColor={designTokens.colors.success}
            iconBg={designTokens.colors.successBg}
            trend={2}
          />
          <StatCard
            value={`${Math.round(stats.avg_accuracy)}%`}
            label="Avg Accuracy"
            subtitle={pillar ? `${pillar.charAt(0).toUpperCase() + pillar.slice(1)} only` : 'Across all students'}
            icon={Target}
            iconColor={designTokens.colors.warning}
            iconBg={designTokens.colors.warningBg}
          />
          <StatCard
            value={stats.active_this_week}
            label="Active This Week"
            subtitle={pillar ? `${pillar.charAt(0).toUpperCase() + pillar.slice(1)} only` : 'Recent activity'}
            icon={TrendingUp}
            iconColor="#7c3aed"
            iconBg="#ede9fe"
            trend={4}
          />
        </div>
      )}

        {/* Skill Breakdown */}
        {skillLoading && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Skill Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24 animate-pulse" />
              ))}
            </div>
          </div>
        )}
        {!skillLoading && skillAccuracy && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Skill Breakdown</h2>

            {/* NEW: Skill cards with data-driven approach */}
            <div className={
              pillar
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4"
                : "grid grid-cols-2 md:grid-cols-4 gap-4"
            }>
              {[
                { key: "reading", label: "Reading", value: skillAccuracy.reading, icon: BookOpenCheck },
                { key: "writing", label: "Writing", value: skillAccuracy.writing, icon: BookOpen },
                { key: "listening", label: "Listening", value: skillAccuracy.listening, icon: Headphones },
                { key: "speaking", label: "Speaking", value: skillAccuracy.speaking, icon: MessageSquare },
              ].map(({ key, label, value, icon: Icon }) => {
                const isSelected = pillar === key;
                const isOther = pillar && !isSelected;

                return (
                  <div
                    key={key}
                    className={`
                      rounded-xl border p-4
                      ${isSelected ? "md:col-span-2 border-2" : ""}
                      ${isOther ? "opacity-40" : "opacity-100"}
                      ${skillColor(value)}
                      transition-all duration-200
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                    <p className="text-2xl font-bold">{Math.round(value)}%</p>
                    <p className="text-xs opacity-75 mt-1">accuracy</p>
                  </div>
                );
              })}
            </div>

            {skillAccuracy.active_today > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                {skillAccuracy.active_today} student{skillAccuracy.active_today !== 1 ? "s" : ""} active today
              </p>
            )}
          </div>
        )}


        {/* Quick Access Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Classrooms</h2>
            <Link
              href="/teacher/classroom"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              Manage all
              <ChevronRight size={14} />
            </Link>
          </div>

          {classroomsLoading ? (
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
              {classrooms
                .slice()
                .sort((a, b) => getMatchScore(b) - getMatchScore(a))
                .map((c) => (
                <Link
                  key={c.id}
                  href={`/teacher/classroom/${c.id}`}
                  className={`group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 ${getClassroomOpacity(c)}`}
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
                  <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-indigo-600 transition-colors">
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
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/teacher/analytics"
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <BarChart3 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </Link>

            <Link
              href="/teacher/reports"
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">Generate Reports</span>
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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="bg-gray-50 min-h-full">
        <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Teaching Dashboard</h1>
            <p className="text-gray-600 mt-1">Loading...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 h-32 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
