'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Stethoscope, Pencil } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  qualification: string;
  fee: number;
  available_days: string[];
  slot_times: string[];
}

interface DoctorFormState {
  name: string;
  department: string;
  specialization: string;
  qualification: string;
  fee: string;
  available_days: string[];
  slot_times: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_FORM: DoctorFormState = {
  name: '',
  department: '',
  specialization: '',
  qualification: '',
  fee: '',
  available_days: [],
  slot_times: '',
};

// ─── Doctor form ──────────────────────────────────────────────────────────────

function DoctorForm({
  initial,
  onSubmit,
  loading,
  error,
}: {
  initial: DoctorFormState;
  onSubmit: (form: DoctorFormState) => void;
  loading: boolean;
  error: string;
}) {
  const [form, setForm] = useState<DoctorFormState>(initial);

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter((d) => d !== day)
        : [...f.available_days, day],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-2">
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ['name', 'Full Name', 'Dr. Ahmed Khan'],
            ['department', 'Department', 'Cardiology'],
            ['specialization', 'Specialization', 'Interventional Cardiology'],
            ['qualification', 'Qualification', 'MBBS, FCPS'],
            ['fee', 'Consultation Fee (PKR)', '2000'],
          ] as [keyof DoctorFormState, string, string][]
        ).map(([key, label, placeholder]) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wide">{label}</label>
            <Input
              type={key === 'fee' ? 'number' : 'text'}
              placeholder={placeholder}
              value={form[key] as string}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={key !== 'qualification'}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Slot Times (comma-separated)</label>
          <Input
            placeholder="09:00, 11:00, 14:00"
            value={form.slot_times}
            onChange={(e) => setForm((f) => ({ ...f, slot_times: e.target.value }))}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Available Days</label>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                form.available_days.includes(day)
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <DialogFooter showCloseButton>
        <Button
          type="submit"
          disabled={loading}
          className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-lg shadow-teal-500/20"
        >
          {loading ? 'Saving...' : 'Save Doctor'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Add Doctor Dialog ────────────────────────────────────────────────────────

function AddDoctorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (form: DoctorFormState) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        fee: parseFloat(form.fee),
        slot_times: form.slot_times.split(',').map((s) => s.trim()).filter(Boolean),
      };
      await apiFetch('/api/admin/doctors', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add doctor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-lg shadow-amber-500/20 rounded-xl px-5 gap-2">
            <Plus className="size-4" />
            Add Doctor
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-white/10 shadow-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-gray-100">Add Doctor</DialogTitle>
        </DialogHeader>
        <DoctorForm
          initial={EMPTY_FORM}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Doctor Dialog ───────────────────────────────────────────────────────

function EditDoctorDialog({ doctor, onUpdated }: { doctor: Doctor; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialForm: DoctorFormState = {
    name: doctor.name,
    department: doctor.department,
    specialization: doctor.specialization,
    qualification: doctor.qualification,
    fee: String(doctor.fee),
    available_days: doctor.available_days,
    slot_times: (doctor.slot_times || []).join(', '),
  };

  const handleSubmit = async (form: DoctorFormState) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        fee: parseFloat(form.fee),
        slot_times: form.slot_times.split(',').map((s) => s.trim()).filter(Boolean),
      };
      await apiFetch(`/api/admin/doctors/${doctor.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update doctor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
            <Pencil className="size-3.5" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-white/10 shadow-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-gray-100">Edit Doctor -- {doctor.name}</DialogTitle>
        </DialogHeader>
        <DoctorForm
          initial={initialForm}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onUpdated }: { doctor: Doctor; onUpdated: () => void }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isAvailableToday = doctor.available_days.includes(today);

  return (
    <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-6 flex flex-col gap-4 group relative overflow-hidden transition-all duration-300 hover:border-white/10">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Stethoscope className="size-5 text-teal-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-bold text-gray-100 truncate">{doctor.name}</h3>
            <p className="text-xs text-white/40 mt-0.5">{doctor.qualification}</p>
          </div>
        </div>
        <EditDoctorDialog doctor={doctor} onUpdated={onUpdated} />
      </div>

      {/* Availability indicator */}
      <div className="flex items-center gap-2">
        <span className={`inline-block size-2 rounded-full ${isAvailableToday ? 'bg-emerald-400 animate-pulse' : 'bg-red-400/60'}`} />
        <span className={`text-xs font-medium ${isAvailableToday ? 'text-emerald-400' : 'text-red-400/60'}`}>
          {isAvailableToday ? 'Available Today' : 'Not Available Today'}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-white/40">Department</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300">
            {doctor.department}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/40">Specialization</span>
          <span className="text-gray-100 text-xs font-medium">{doctor.specialization}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/40">Consultation Fee</span>
          <span className="text-amber-400 font-semibold">PKR {doctor.fee.toLocaleString()}</span>
        </div>
      </div>

      {/* Schedule */}
      {doctor.available_days.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <p className="text-xs text-white/30 font-medium uppercase tracking-wider">Schedule</p>
          <div className="flex flex-wrap gap-1.5">
            {doctor.available_days.map((day) => (
              <span
                key={day}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  day === today
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.06] text-white/40'
                }`}
              >
                {day.slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Slot times */}
      {doctor.slot_times && doctor.slot_times.length > 0 && (
        <p className="text-xs text-white/30">
          Slots: {doctor.slot_times.join(', ')}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDoctors = () => {
    setLoading(true);
    apiFetch('/api/admin/doctors')
      .then((data: Doctor[]) => setDoctors(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDoctors(); }, []);

  if (loading) {
    return (
      <div className="admin-dark space-y-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Stethoscope className="size-5 text-teal-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-100 tracking-tight">Doctors</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg h-52 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dark space-y-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Stethoscope className="size-5 text-teal-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-100 tracking-tight">Doctors</h1>
        </div>
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dark space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Stethoscope className="size-5 text-teal-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-100 tracking-tight">Doctors</h1>
            <p className="text-sm text-white/40">{doctors.length} registered</p>
          </div>
        </div>
        <AddDoctorDialog onCreated={fetchDoctors} />
      </div>

      {doctors.length === 0 ? (
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg py-16 text-center">
          <div className="size-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="size-7 text-teal-400/40" />
          </div>
          <p className="text-white/40">No doctors registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} onUpdated={fetchDoctors} />
          ))}
        </div>
      )}
    </div>
  );
}
