'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, isLoggedIn, clearToken } from '@/lib/api';
import {
  Calendar, Pill, FlaskConical, Bell, LogOut, Heart,
  MessageCircle, CalendarPlus, ChevronDown, ChevronUp, Download,
} from 'lucide-react';
import { NotificationBell } from '@/components/shared/NotificationBell';

interface Appointment {
  id: string;
  doctor_name: string;
  date: string;
  time: string;
  status: string;
  reason?: string;
}

interface PrescriptionItem {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Medication {
  id: string;
  status: string;
  notes: string;
  created_at: string;
  doctor_name: string;
  items: PrescriptionItem[];
}

interface LabResultEntry {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: string;
}

interface LabResult {
  id: string;
  test_panel: string;
  priority: string;
  status: string;
  ordered_at: string;
  completed_at: string;
  doctor_name: string;
  results: LabResultEntry[];
}

export default function PatientPortal() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set());
  const patientName = 'Patient';

  const tabs = ['overview', 'appointments', 'medications', 'lab-results'];

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/chat');
      return;
    }

    async function fetchData() {
      try {
        const [appts, meds, labs] = await Promise.all([
          apiFetch('/api/patient/appointments').catch(() => []),
          apiFetch('/api/patient/medications').catch(() => []),
          apiFetch('/api/patient/lab-results').catch(() => []),
        ]);
        setAppointments(appts);
        setMedications(meds);
        setLabResults(labs);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load portal data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  function handleSignOut() {
    clearToken();
    router.push('/chat');
  }

  function toggleLabExpand(id: string) {
    setExpandedLabs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCancelAppointment(id: string) {
    try {
      await apiFetch(`/api/patient/appointments/${id}/cancel`, { method: 'PATCH' });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    } catch {
      // ignore
    }
  }

  // Derived data
  const nextAppointment = appointments
    .filter(a => ['scheduled', 'confirmed'].includes(a.status.toLowerCase()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const pendingLabsCount = labResults.filter(l => {
    const s = (l.status || '').toLowerCase();
    return s !== 'completed' && s !== 'normal';
  }).length;

  const upcomingAppointments = appointments.filter(a =>
    ['scheduled', 'confirmed'].includes(a.status.toLowerCase())
  );
  const pastAppointments = appointments.filter(a =>
    !['scheduled', 'confirmed'].includes(a.status.toLowerCase())
  );

  // Build timeline events for overview
  type TimelineEvent = { date: string; type: 'appointment' | 'medication' | 'lab'; title: string; description: string; };
  const timelineEvents: TimelineEvent[] = [
    ...appointments.map(a => ({
      date: a.date,
      type: 'appointment' as const,
      title: a.doctor_name,
      description: `${a.status}${a.reason ? ' - ' + a.reason : ''}`,
    })),
    ...medications.flatMap(m => m.items.map(item => ({
      date: m.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      type: 'medication' as const,
      title: item.drug_name,
      description: `${item.dosage} - ${item.frequency}`,
    }))),
    ...labResults.map(l => ({
      date: l.ordered_at?.split('T')[0] || '',
      type: 'lab' as const,
      title: l.test_panel,
      description: l.status || 'Pending',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  function appointmentStatusBadge(status: string) {
    const s = status.toLowerCase();
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
      confirmed: 'bg-teal-50 text-teal-700 border border-teal-200',
      completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      cancelled: 'bg-red-50 text-red-700 border border-red-200',
      no_show: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
    return colors[s] || 'bg-gray-50 text-gray-600 border border-gray-200';
  }

  function labStatusBadge(status: string) {
    const s = status.toLowerCase();
    const colors: Record<string, string> = {
      normal: 'bg-green-50 text-green-700 border border-green-200',
      abnormal: 'bg-amber-50 text-amber-700 border border-amber-200',
      critical: 'bg-red-50 text-red-700 border border-red-200',
    };
    return colors[s] || 'bg-gray-50 text-gray-600 border border-gray-200';
  }

  function timelineDotColor(type: string) {
    if (type === 'appointment') return 'bg-blue-500';
    if (type === 'medication') return 'bg-amber-500';
    return 'bg-purple-500';
  }

  function SkeletonCard() {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
          <div className="h-6 bg-gray-100 rounded-lg w-1/3" />
        </div>
      </div>
    );
  }

  function SkeletonList() {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm animate-pulse p-5 space-y-2">
            <div className="h-4 bg-gray-100 rounded-full w-2/3" />
            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal navbar */}
      <header className="sticky top-0 z-50 bg-teal-700">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-3 mr-auto">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-white tracking-tight">CareBot</span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-[15px] text-white/80 hover:text-white transition-colors flex items-center gap-2">
              Home
            </Link>
            <Link href="/chat" className="text-[15px] text-white/80 hover:text-white transition-colors flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Chat
            </Link>
            <Link href="/book" className="text-[15px] text-white/80 hover:text-white transition-colors flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" /> Book
            </Link>
            <div className="[&_button]:text-white/80 [&_button:hover]:text-white [&_svg]:h-5 [&_svg]:w-5">
              <NotificationBell />
            </div>
            <button onClick={handleSignOut} className="text-[15px] text-white/80 hover:text-white transition-colors flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* Welcome section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-500 mb-1">Patient Portal</p>
          <h1 className="font-heading text-3xl font-bold text-gray-900">
            Welcome back, <span className="text-teal-600">{patientName}</span>
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Quick stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50">
                    <Calendar className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Next Appointment</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {nextAppointment ? nextAppointment.date : 'None'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-50">
                    <Pill className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Medications</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{medications.reduce((sum, m) => sum + (m.items?.length || 0), 0)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-50">
                    <FlaskConical className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending Labs</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{pendingLabsCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-rose-50">
                    <Bell className="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Appointments</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{appointments.length}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab bar — evenly spaced, bigger */}
        <div className="bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm flex">
          {tabs.map(tab => {
            const tabIcons: Record<string, React.ReactNode> = {
              overview: <Calendar className="h-4 w-4" />,
              appointments: <CalendarPlus className="h-4 w-4" />,
              medications: <Pill className="h-4 w-4" />,
              'lab-results': <FlaskConical className="h-4 w-4" />,
            };
            const tabLabels: Record<string, string> = {
              overview: 'Overview',
              appointments: 'Appointments',
              medications: 'Medications',
              'lab-results': 'Lab Results',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === tab
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tabIcons[tab]}
                {tabLabels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {loading ? (
          <SkeletonList />
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-5">Recent Activity</h2>
                {timelineEvents.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-14 text-center">
                    <p className="text-gray-500">No recent activity to show.</p>
                  </div>
                ) : (
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {timelineEvents.map((event, idx) => (
                        <div key={idx} className="relative flex gap-4">
                          <div className={`absolute left-[-22px] top-2 w-3 h-3 rounded-full ${timelineDotColor(event.type)} ring-4 ring-gray-50`} />
                          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-gray-900 text-sm">{event.title}</p>
                              <span className="text-xs text-gray-400">{event.date}</span>
                            </div>
                            <p className="text-sm text-gray-500">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <div className="space-y-8">
                {/* Upcoming */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming</h2>
                  {upcomingAppointments.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-10 text-center">
                      <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No upcoming appointments</p>
                      <Link href="/book" className="text-teal-600 text-sm font-medium hover:underline mt-1 inline-block">
                        Book one now
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAppointments.map(appt => (
                        <div key={appt.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 rounded-lg bg-teal-50">
                                <Calendar className="h-5 w-5 text-teal-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{appt.doctor_name}</p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {appt.date} at {appt.time}
                                  {appt.reason && <span> &mdash; {appt.reason}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${appointmentStatusBadge(appt.status)}`}>
                                {appt.status}
                              </span>
                              <button
                                onClick={() => handleCancelAppointment(appt.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Past */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Past</h2>
                  {pastAppointments.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-10 text-center">
                      <p className="text-gray-500 text-sm">No past appointments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pastAppointments.map(appt => (
                        <div key={appt.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 rounded-lg bg-gray-50">
                                <Calendar className="h-5 w-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{appt.doctor_name}</p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {appt.date} at {appt.time}
                                  {appt.reason && <span> &mdash; {appt.reason}</span>}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${appointmentStatusBadge(appt.status)}`}>
                              {appt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MEDICATIONS TAB */}
            {activeTab === 'medications' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Active Medications</h2>
                {medications.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-10 text-center">
                    <Pill className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No active medications</p>
                    <p className="text-gray-400 text-xs mt-1">Your prescriptions will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medications.map(prescription => (
                      <div key={prescription.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prescribed by</span>
                            <span className="text-sm font-medium text-gray-900">{prescription.doctor_name}</span>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            prescription.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}>
                            {prescription.status}
                          </span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {prescription.items.map((item, idx) => (
                            <div key={idx} className="px-5 py-4 flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-amber-50 mt-0.5">
                                <Pill className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">{item.drug_name}</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                  <span className="text-sm text-gray-600">{item.dosage}</span>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-sm text-gray-600">{item.frequency}</span>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-sm text-gray-600">{item.duration}</span>
                                </div>
                                {item.instructions && (
                                  <p className="text-xs text-gray-400 mt-1.5 italic leading-relaxed">{item.instructions}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {prescription.notes && (
                          <div className="px-5 py-3 bg-blue-50/50 border-t border-gray-100 text-xs text-gray-500 italic">
                            Note: {prescription.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LAB RESULTS TAB */}
            {activeTab === 'lab-results' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Lab Results</h2>
                {labResults.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-10 text-center">
                    <FlaskConical className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No lab results</p>
                    <p className="text-gray-400 text-xs mt-1">Your lab reports will show up here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {labResults.map(lab => (
                      <div key={lab.id} className="bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 rounded-lg bg-purple-50">
                                <FlaskConical className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{lab.test_panel}</p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {lab.ordered_at ? new Date(lab.ordered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                  {lab.doctor_name && <span> &middot; {lab.doctor_name}</span>}
                                  {lab.priority !== 'routine' && <span className="ml-2 text-xs font-semibold text-red-600 uppercase">{lab.priority}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {lab.status && (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${labStatusBadge(lab.status)}`}>
                                  {lab.status}
                                </span>
                              )}
                              <a
                                href={`/api/patient/lab-results/${lab.id}/report`}
                                className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                                title="Download report"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => toggleLabExpand(lab.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                {expandedLabs.has(lab.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {expandedLabs.has(lab.id) && lab.results && lab.results.length > 0 && (
                            <div className="mt-4 border-t border-gray-100 pt-4">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="pb-2">Test</th>
                                    <th className="pb-2">Value</th>
                                    <th className="pb-2">Unit</th>
                                    <th className="pb-2">Reference</th>
                                    <th className="pb-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {lab.results.map((r, ridx) => (
                                    <tr key={ridx}>
                                      <td className="py-2 text-gray-900 font-medium">{r.test_name}</td>
                                      <td className="py-2 text-gray-800 font-semibold">{r.value}</td>
                                      <td className="py-2 text-gray-500">{r.unit}</td>
                                      <td className="py-2 text-gray-400 text-xs">{r.reference_range}</td>
                                      <td className="py-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${labStatusBadge(r.status)}`}>
                                          {r.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
