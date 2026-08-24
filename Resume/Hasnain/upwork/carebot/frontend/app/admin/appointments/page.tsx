'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarDays, X } from 'lucide-react';
import { VisitNotesModal, type VisitNotes } from '@/components/admin/VisitNotesModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled';

interface Appointment {
  id: string;
  patient_name: string;
  patient_id: string;
  doctor_name: string;
  doctor_id: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_TABS = ['all', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'] as const;
type TabValue = (typeof STATUS_TABS)[number];

const STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  confirmed: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  no_show: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-400',
  confirmed: 'bg-teal-400',
  completed: 'bg-emerald-400',
  no_show: 'bg-amber-400',
  cancelled: 'bg-red-400',
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE_CLASSES[status] ?? 'bg-secondary text-gray-400'}`}
    >
      <span className={`inline-block size-1.5 rounded-full ${STATUS_DOT_COLORS[status] ?? 'bg-gray-400'}`} />
      {status.replace('_', '-')}
    </span>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-white/[0.06] rounded animate-pulse w-24" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function formatTabLabel(tab: TabValue): string {
  if (tab === 'all') return 'All';
  if (tab === 'no_show') return 'No-Show';
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

// ─── Action buttons per status ────────────────────────────────────────────────

interface ActionButtonsProps {
  appointment: Appointment;
  onAction: (id: string, status: AppointmentStatus) => Promise<void>;
  loadingId: string | null;
}

const ACTION_BUTTON_CLASSES: Record<string, string> = {
  'Check-In': 'border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/50',
  'Complete': 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50',
  'No-Show': 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50',
};

function ActionButtons({ appointment, onAction, loadingId }: ActionButtonsProps) {
  const busy = loadingId === appointment.id;

  const actions: { label: string; nextStatus: AppointmentStatus; forStatuses: AppointmentStatus[] }[] = [
    {
      label: 'Check-In',
      nextStatus: 'confirmed',
      forStatuses: ['scheduled'],
    },
    {
      label: 'Complete',
      nextStatus: 'completed',
      forStatuses: ['confirmed', 'scheduled'],
    },
    {
      label: 'No-Show',
      nextStatus: 'no_show',
      forStatuses: ['scheduled', 'confirmed'],
    },
  ];

  const available = actions.filter((a) =>
    a.forStatuses.includes(appointment.status)
  );

  if (available.length === 0) return <span className="text-gray-400/50 text-xs">---</span>;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {available.map((action) => (
        <button
          key={action.label}
          disabled={busy}
          onClick={() => onAction(appointment.id, action.nextStatus)}
          className={`inline-flex items-center h-7 text-xs font-medium px-3 rounded-lg border transition-all duration-200 disabled:opacity-50 ${ACTION_BUTTON_CLASSES[action.label] ?? 'border-white/10 text-gray-100 hover:bg-white/5'}`}
        >
          {busy ? (
            <div className="size-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
          ) : (
            action.label
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      if (activeTab !== 'all') params.set('status', activeTab);

      const query = params.toString();
      const data: Appointment[] = await apiFetch(
        `/api/admin/appointments${query ? `?${query}` : ''}`
      );
      setAppointments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, activeTab]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusAction = async (id: string, newStatus: AppointmentStatus) => {
    // Intercept "completed" to open visit notes modal instead
    if (newStatus === 'completed') {
      const appt = appointments.find((a) => a.id === id) || null;
      setCompletingAppointment(appt);
      setNotesModalOpen(true);
      return;
    }

    setLoadingId(id);
    setActionError('');
    try {
      await apiFetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update appointment');
    } finally {
      setLoadingId(null);
    }
  };

  async function handleCompleteWithNotes(notes: VisitNotes) {
    if (!completingAppointment) return;
    setActionError('');
    try {
      await apiFetch(`/api/admin/appointments/${completingAppointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', visit_notes: notes }),
      });
      fetchAppointments();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete appointment');
    }
    setNotesModalOpen(false);
    setCompletingAppointment(null);
  }

  // Count appointments per status for tab pills
  const statusCounts: Record<string, number> = { all: appointments.length };
  for (const appt of appointments) {
    statusCounts[appt.status] = (statusCounts[appt.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/20 rounded-xl blur-lg" />
          <div className="relative rounded-xl bg-teal-500/10 p-2.5">
            <CalendarDays className="size-6 text-teal-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-heading text-gray-100 tracking-tight">
            Appointments
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage patient appointments and check-ins
          </p>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-400 shrink-0">
            Filter by Date
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-48 bg-white/5 border-white/10 text-gray-100 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
              aria-label="Filter by date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all duration-200"
              >
                <X className="size-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <div className="size-1.5 rounded-full bg-red-400 shrink-0" />
          <p className="text-sm text-red-400">{actionError}</p>
        </div>
      )}

      {/* Status tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabValue)}
      >
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-1.5">
          <TabsList className="bg-transparent flex-wrap h-auto gap-1 w-full justify-start">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-400 data-[state=active]:border-teal-500/30 data-[state=active]:shadow-none border border-transparent rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-100 hover:bg-white/[0.04] transition-all duration-200"
              >
                <span>{formatTabLabel(tab)}</span>
                {!loading && statusCounts[tab] !== undefined && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-white/[0.08] text-gray-400">
                    {statusCounts[tab]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-sm font-heading text-gray-100">
                  {formatTabLabel(tab)} Appointments
                </h2>
              </div>

              {/* Table */}
              {error ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Patient</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Doctor</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Date</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Time</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Reason</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Status</TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <SkeletonRow key={i} />
                        ))
                      ) : appointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                            <CalendarDays className="size-8 text-gray-400/30 mx-auto mb-2" />
                            No appointments found
                          </TableCell>
                        </TableRow>
                      ) : (
                        appointments.map((appt) => (
                          <TableRow key={appt.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-150">
                            <TableCell className="font-medium text-gray-100">{appt.patient_name}</TableCell>
                            <TableCell className="text-gray-100/80">{appt.doctor_name}</TableCell>
                            <TableCell className="text-gray-400 font-mono text-xs">{appt.date}</TableCell>
                            <TableCell className="text-gray-400 font-mono text-xs">{appt.time}</TableCell>
                            <TableCell className="text-gray-400 max-w-40 truncate">{appt.reason}</TableCell>
                            <TableCell>
                              <StatusBadge status={appt.status} />
                            </TableCell>
                            <TableCell>
                              <ActionButtons
                                appointment={appt}
                                onAction={handleStatusAction}
                                loadingId={loadingId}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <VisitNotesModal
        open={notesModalOpen}
        onClose={() => { setNotesModalOpen(false); setCompletingAppointment(null); }}
        onSubmit={handleCompleteWithNotes}
        patientName={completingAppointment?.patient_name || ''}
      />
    </div>
  );
}
