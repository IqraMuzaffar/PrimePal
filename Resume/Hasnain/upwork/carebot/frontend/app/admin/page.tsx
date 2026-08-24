'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { StatsCards } from '@/components/admin/StatsCards';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface DepartmentBreakdown {
  department: string;
  count: number;
}

interface DoctorUtilization {
  doctor_name: string;
  total_appointments: number;
  completed: number;
  utilization_pct: number;
}

interface RecentAppointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  department: string;
  status: string;
  date: string;
}

interface DashboardStats {
  appointments_today: number;
  revenue_this_month: number;
  no_show_rate: number;
  new_patients_this_month: number;
  department_breakdown: DepartmentBreakdown[];
  doctor_utilization: DoctorUtilization[];
  recent_appointments: RecentAppointment[];
  status_breakdown?: Record<string, number>;
}

const CHART_COLORS = [
  'hsl(174, 72%, 46%)',   // teal
  'hsl(160, 60%, 40%)',   // emerald
  'hsl(43, 96%, 56%)',    // gold
  'hsl(174, 72%, 60%)',   // teal-light
  'hsl(43, 96%, 70%)',    // gold-light
  'hsl(210, 60%, 50%)',   // blue
  'hsl(280, 60%, 55%)',   // purple
  'hsl(340, 65%, 50%)',   // rose
];

function SkeletonCard() {
  return (
    <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-white/5 rounded w-1/3 mb-4" />
      <div className="h-8 bg-white/5 rounded w-1/2" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed:
      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_hsl(160,60%,40%,0.15)]',
    pending:
      'bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_hsl(43,96%,56%,0.15)]',
    completed:
      'bg-teal-500/15 text-teal-400 border border-teal-500/20 shadow-[0_0_12px_hsl(174,72%,46%,0.15)]',
    cancelled:
      'bg-red-500/15 text-red-400 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    no_show:
      'bg-white/5 text-gray-400 border border-white/10',
  };

  const colorClass =
    styles[status.toLowerCase()] ||
    'bg-white/5 text-gray-400 border border-white/10';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${colorClass}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function computeStatusBreakdown(
  appointments: RecentAppointment[]
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const appt of appointments) {
    const status = appt.status.toLowerCase();
    breakdown[status] = (breakdown[status] || 0) + 1;
  }
  return breakdown;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/admin/dashboard/stats')
      .then((data: DashboardStats) => setStats(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400 mb-1">
            Dashboard Overview
          </p>
          <h1 className="text-3xl font-heading text-gray-100">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400 mb-1">
            Dashboard Overview
          </p>
          <h1 className="text-3xl font-heading text-gray-100">Dashboard</h1>
        </div>
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl">
          <div className="py-12 text-center">
            <p className="text-red-400">{error || 'Failed to load dashboard data'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusBreakdown =
    stats.status_breakdown ||
    computeStatusBreakdown(stats.recent_appointments || []);

  const departmentChartData = {
    labels: (stats.department_breakdown || []).map((d) => d.department),
    datasets: [
      {
        label: 'Appointments',
        data: (stats.department_breakdown || []).map((d) => d.count),
        backgroundColor: CHART_COLORS.slice(
          0,
          (stats.department_breakdown || []).length
        ),
        borderRadius: 8,
        borderSkipped: false as const,
      },
    ],
  };

  const statusLabels = Object.keys(statusBreakdown);
  const statusChartData = {
    labels: statusLabels.map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
    ),
    datasets: [
      {
        data: statusLabels.map((s) => statusBreakdown[s]),
        backgroundColor: CHART_COLORS.slice(0, statusLabels.length),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'hsl(220, 25%, 12%)',
        titleColor: 'hsl(0, 0%, 95%)',
        bodyColor: 'hsl(215, 20%, 65%)',
        borderColor: 'hsl(0, 0%, 100%, 0.06)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        ticks: { color: 'hsl(215, 20%, 45%)' },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: 'hsl(215, 20%, 45%)' },
        grid: { color: 'hsl(0, 0%, 100%, 0.04)' },
        border: { display: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'hsl(215, 20%, 55%)',
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: 'hsl(220, 25%, 12%)',
        titleColor: 'hsl(0, 0%, 95%)',
        bodyColor: 'hsl(215, 20%, 65%)',
        borderColor: 'hsl(0, 0%, 100%, 0.06)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="animate-fade-in-up">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-400 mb-1">
          Dashboard Overview
        </p>
        <h1 className="text-3xl font-heading text-gray-100 tracking-tight">
          Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 animate-fade-in-up stagger-1">
          <div className="p-6 pb-2 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-gray-100 tracking-tight">
              Department Breakdown
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64">
              {(stats.department_breakdown || []).length > 0 ? (
                <Bar data={departmentChartData} options={barOptions} />
              ) : (
                <p className="text-gray-400 text-sm text-center pt-16">
                  No department data
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 animate-fade-in-up stagger-2">
          <div className="p-6 pb-2 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-gray-100 tracking-tight">
              Appointment Status
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64">
              {statusLabels.length > 0 ? (
                <Doughnut data={statusChartData} options={doughnutOptions} />
              ) : (
                <p className="text-gray-400 text-sm text-center pt-16">
                  No status data
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 animate-fade-in-up stagger-3">
        <div className="p-6 pb-4 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-gray-100 tracking-tight">
            Recent Appointments
          </h3>
        </div>
        <div className="p-6 pt-4">
          {(stats.recent_appointments || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Patient
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Doctor
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Department
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Date
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_appointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      <td className="py-3.5 text-gray-100 font-medium">
                        {appt.patient_name}
                      </td>
                      <td className="py-3.5 text-gray-100">
                        {appt.doctor_name}
                      </td>
                      <td className="py-3.5 text-gray-400">
                        {appt.department}
                      </td>
                      <td className="py-3.5 text-gray-400 tabular-nums">
                        {appt.date}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              No recent appointments
            </p>
          )}
        </div>
      </div>

      {/* Doctor Utilization */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 animate-fade-in-up stagger-4">
        <div className="p-6 pb-4 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-gray-100 tracking-tight">
            Doctor Utilization
          </h3>
        </div>
        <div className="p-6 pt-4">
          {(stats.doctor_utilization || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Doctor
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Total Appts
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Completed
                    </th>
                    <th className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 min-w-[200px]">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.doctor_utilization.map((doc) => (
                    <tr
                      key={doc.doctor_name}
                      className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      <td className="py-3.5 text-gray-100 font-medium">
                        {doc.doctor_name}
                      </td>
                      <td className="py-3.5 text-gray-400 tabular-nums">
                        {doc.total_appointments}
                      </td>
                      <td className="py-3.5 text-gray-400 tabular-nums">
                        {doc.completed}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/5 rounded-full max-w-32 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300 transition-all duration-500 ease-out"
                              style={{
                                width: `${Math.min(doc.utilization_pct, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-400 w-10 text-right tabular-nums">
                            {doc.utilization_pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              No utilization data
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
