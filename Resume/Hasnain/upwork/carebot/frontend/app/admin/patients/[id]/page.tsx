'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, MapPin, Pill, FlaskConical, CalendarDays, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';

interface PatientAppointment {
  id: string;
  doctor_name: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
}

interface Medication {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribed_by: string;
  prescribed_at: string;
}

interface LabResult {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string | null;
}

interface LabOrder {
  id: string;
  ordered_by: string;
  ordered_at: string;
  status: string;
  results: LabResult[];
}

interface PatientDetail {
  id: string;
  patient_number: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  address: string;
  allergies: string[];
  conditions: string[];
  appointments: PatientAppointment[];
  medications: Medication[];
  lab_orders: LabOrder[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

const STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: 'bg-amber-500/20 text-amber-400',
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-blue-500/20 text-blue-400',
  no_show: 'bg-gray-500/20 text-gray-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[status] ?? 'bg-white/[0.06] text-white/40'}`}
    >
      {status.replace('_', '-')}
    </span>
  );
}

function FlagBadge({ flag }: { flag: string | null }) {
  if (!flag) return <span className="text-white/40 text-xs">Normal</span>;
  const cls =
    flag === 'H'
      ? 'bg-red-500/20 text-red-400'
      : flag === 'L'
      ? 'bg-blue-500/20 text-blue-400'
      : 'bg-amber-500/20 text-amber-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {flag}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonHeader() {
  return (
    <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-8 animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-white/[0.06]" />
        <div className="space-y-2">
          <div className="h-6 bg-white/[0.06] rounded w-48" />
          <div className="h-4 bg-white/[0.06] rounded w-24" />
        </div>
      </div>
      <div className="flex gap-4 mt-4">
        <div className="h-4 bg-white/[0.06] rounded w-24" />
        <div className="h-4 bg-white/[0.06] rounded w-16" />
        <div className="h-4 bg-white/[0.06] rounded w-20" />
      </div>
    </div>
  );
}

// ─── Tabs content ─────────────────────────────────────────────────────────────

function AppointmentsTab({ appointments }: { appointments: PatientAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="size-8 mx-auto mb-3 text-white/20" />
        <p className="text-white/40 text-sm">No appointments on record</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Doctor</TableHead>
            <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Date</TableHead>
            <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Time</TableHead>
            <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Reason</TableHead>
            <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appt) => (
            <TableRow key={appt.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <TableCell className="font-medium text-gray-100">{appt.doctor_name}</TableCell>
              <TableCell className="text-white/50">{appt.date}</TableCell>
              <TableCell className="text-white/50">{appt.time}</TableCell>
              <TableCell className="text-white/50 max-w-48 truncate">{appt.reason}</TableCell>
              <TableCell>
                <StatusBadge status={appt.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MedicationsTab({ medications }: { medications: Medication[] }) {
  if (medications.length === 0) {
    return (
      <div className="text-center py-12">
        <Pill className="size-8 mx-auto mb-3 text-white/20" />
        <p className="text-white/40 text-sm">No active prescriptions</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {medications.map((med) => (
        <div key={med.id} className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Pill className="size-4 text-teal-400" />
                <p className="font-semibold text-gray-100">{med.drug_name}</p>
              </div>
              <p className="text-sm text-white/50">
                {med.dosage} -- {med.frequency}
              </p>
              {med.duration && (
                <p className="text-xs text-white/40">Duration: {med.duration}</p>
              )}
              {med.instructions && (
                <p className="text-xs text-white/35 italic">{med.instructions}</p>
              )}
            </div>
            <div className="text-xs text-right text-white/40 shrink-0">
              <p>By {med.prescribed_by}</p>
              <p>{med.prescribed_at}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LabResultsTab({ labOrders }: { labOrders: LabOrder[] }) {
  if (labOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="size-8 mx-auto mb-3 text-white/20" />
        <p className="text-white/40 text-sm">No lab orders on record</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {labOrders.map((order) => (
        <div key={order.id} className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-white/70">
              Order by <span className="text-gray-100">{order.ordered_by}</span> -- {order.ordered_at}
            </p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300">
              {order.status}
            </span>
          </div>
          <div className="p-5">
            {order.results?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Test</TableHead>
                      <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Value</TableHead>
                      <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Unit</TableHead>
                      <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Reference Range</TableHead>
                      <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.results.map((result, idx) => (
                      <TableRow key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                        <TableCell className="font-medium text-gray-100">{result.test_name}</TableCell>
                        <TableCell className="text-gray-100">{result.value}</TableCell>
                        <TableCell className="text-white/50">{result.unit}</TableCell>
                        <TableCell className="text-white/50">{result.reference_range}</TableCell>
                        <TableCell>
                          <FlagBadge flag={result.flag} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-white/30 text-xs">No results yet</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: string;
  type: 'appointment' | 'lab' | 'prescription';
  title: string;
  description: string;
  status?: string;
  dotColor: string;
  borderColor: string;
}

function buildTimeline(patient: PatientDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (patient.appointments) {
    for (const appt of patient.appointments) {
      events.push({
        date: appt.date,
        type: 'appointment',
        title: `Appointment with ${appt.doctor_name}`,
        description: appt.reason || 'General consultation',
        status: appt.status,
        dotColor: 'bg-blue-500',
        borderColor: 'border-l-blue-500',
      });
    }
  }

  if (patient.medications) {
    for (const med of patient.medications) {
      events.push({
        date: med.prescribed_at || 'Unknown',
        type: 'prescription',
        title: `Prescription: ${med.drug_name}`,
        description: `${med.dosage} — ${med.frequency}`,
        dotColor: 'bg-amber-500',
        borderColor: 'border-l-amber-500',
      });
    }
  }

  if (patient.lab_orders) {
    for (const lab of patient.lab_orders) {
      events.push({
        date: lab.ordered_at || 'Unknown',
        type: 'lab',
        title: `Lab order by ${lab.ordered_by}`,
        description: `Status: ${lab.status} — ${lab.results?.length || 0} result(s)`,
        status: lab.status,
        dotColor: 'bg-purple-500',
        borderColor: 'border-l-purple-500',
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/patients/${id}`)
      .then((data: PatientDetail) => setPatient(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load patient')
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="admin-dark space-y-6">
        <SkeletonHeader />
        <div className="h-40 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg animate-pulse" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="admin-dark space-y-4">
        <a href="/admin/patients" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-teal-400 transition-colors">
          <ArrowLeft className="size-4" />
          Back to Patients
        </a>
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-8 text-center">
          <p className="text-red-400">{error || 'Patient not found'}</p>
        </div>
      </div>
    );
  }

  const age = computeAge(patient.date_of_birth);

  return (
    <div className="admin-dark space-y-8">
      {/* Back nav */}
      <a href="/admin/patients" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-teal-400 transition-colors group">
        <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Patients
      </a>

      {/* Patient header card */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-8 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex gap-5">
            {/* Avatar */}
            <div className="size-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 border border-teal-500/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-teal-400 font-heading">
                {patient.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="space-y-3">
              {/* Name + ID */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-heading text-2xl font-bold text-gray-100 tracking-tight">{patient.name}</h1>
                <span className="font-mono text-xs text-white/30 bg-white/[0.06] px-2.5 py-1 rounded-lg">
                  #{patient.patient_number}
                </span>
              </div>

              {/* Info grid */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {patient.date_of_birth && (
                  <span className="text-white/50">
                    Age: <strong className="text-gray-100">{age}</strong>
                  </span>
                )}
                {patient.gender && (
                  <span className="text-white/50">
                    Gender:{' '}
                    <strong className="text-gray-100 capitalize">
                      {patient.gender.replace('_', ' ')}
                    </strong>
                  </span>
                )}
                {patient.blood_type && (
                  <span className="text-white/50">
                    Blood:{' '}
                    <strong className="text-amber-400 font-semibold">{patient.blood_type}</strong>
                  </span>
                )}
              </div>

              {/* Contact */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {patient.email && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/40">
                    <Mail className="size-3.5" />
                    {patient.email}
                  </span>
                )}
                {patient.phone && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/40">
                    <Phone className="size-3.5" />
                    {patient.phone}
                  </span>
                )}
                {patient.address && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/30">
                    <MapPin className="size-3.5" />
                    {patient.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Allergies */}
        {patient.allergies?.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-400/80">Allergies</p>
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        {patient.conditions?.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-400">Conditions</p>
            <div className="flex flex-wrap gap-2">
              {patient.conditions.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/20"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="appointments">
        <TabsList className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 gap-1">
          <TabsTrigger
            value="appointments"
            className="rounded-lg px-4 py-2 text-sm text-white/50 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 transition-colors hover:text-white/70"
          >
            <CalendarDays className="size-4 mr-1.5" />
            Appointments
          </TabsTrigger>
          <TabsTrigger
            value="medications"
            className="rounded-lg px-4 py-2 text-sm text-white/50 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 transition-colors hover:text-white/70"
          >
            <Pill className="size-4 mr-1.5" />
            Medications
          </TabsTrigger>
          <TabsTrigger
            value="lab_results"
            className="rounded-lg px-4 py-2 text-sm text-white/50 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 transition-colors hover:text-white/70"
          >
            <FlaskConical className="size-4 mr-1.5" />
            Lab Results
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="rounded-lg px-4 py-2 text-sm text-white/50 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 transition-colors hover:text-white/70"
          >
            <Clock className="size-4 mr-1.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Appointment History</h2>
            </div>
            <div className="p-1">
              <AppointmentsTab appointments={patient.appointments ?? []} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="medications" className="mt-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider px-1 mb-4">Active Prescriptions</h2>
            <MedicationsTab medications={patient.medications ?? []} />
          </div>
        </TabsContent>

        <TabsContent value="lab_results" className="mt-6">
          <LabResultsTab labOrders={patient.lab_orders ?? []} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          {(() => {
            const events = buildTimeline(patient);
            if (events.length === 0) {
              return (
                <div className="text-center py-12">
                  <Clock className="size-8 mx-auto mb-3 text-white/20" />
                  <p className="text-white/40 text-sm">No events recorded</p>
                </div>
              );
            }
            return (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />

                <div className="space-y-4">
                  {events.map((event, idx) => (
                    <div key={idx} className="flex gap-4 ml-1">
                      {/* Dot */}
                      <div className={`relative z-10 w-6 h-6 rounded-full ${event.dotColor} flex items-center justify-center mt-1 shrink-0`}>
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>

                      {/* Card */}
                      <div className={`flex-1 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 border-l-2 ${event.borderColor}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            {event.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-100">{event.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                        {event.status && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-2 ${
                            event.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                            event.status === 'active' ? 'bg-teal-500/15 text-teal-400' :
                            event.status === 'cancelled' ? 'bg-red-500/15 text-red-400' :
                            'bg-blue-500/15 text-blue-400'
                          }`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
