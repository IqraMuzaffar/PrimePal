'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Plus, Search, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  patient_number: string;
  name: string;
  phone: string;
  email: string;
  conditions: string[];
  last_visit: string | null;
}

interface PatientCreatePayload {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  address: string;
  allergies: string;
  conditions: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-white/[0.06] rounded animate-pulse w-24" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Add Patient Form ─────────────────────────────────────────────────────────

const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'];
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const EMPTY_FORM: PatientCreatePayload = {
  name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  blood_type: '',
  address: '',
  allergies: '',
  conditions: '',
};

interface AddPatientFormProps {
  onSuccess: (patient: Patient) => void;
}

function AddPatientForm({ onSuccess }: AddPatientFormProps) {
  const [form, setForm] = useState<PatientCreatePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        allergies: form.allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        conditions: form.conditions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const created: Patient = await apiFetch('/api/admin/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSuccess(created);
      setForm(EMPTY_FORM);
      closeRef.current?.click();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add patient');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    label: string,
    name: keyof PatientCreatePayload,
    type = 'text',
    placeholder = ''
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wide" htmlFor={name}>
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder || label}
        value={form[name]}
        onChange={handleChange}
        className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('Full Name', 'name')}
        {field('Email', 'email', 'email')}
        {field('Phone', 'phone', 'tel')}
        {field('Date of Birth', 'date_of_birth', 'date')}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide" htmlFor="gender">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
          >
            <option value="" className="bg-gray-900">Select gender</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g} className="bg-gray-900">
                {g.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide" htmlFor="blood_type">
            Blood Type
          </label>
          <select
            id="blood_type"
            name="blood_type"
            value={form.blood_type}
            onChange={handleChange}
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
          >
            <option value="" className="bg-gray-900">Select blood type</option>
            {BLOOD_TYPE_OPTIONS.map((b) => (
              <option key={b} value={b} className="bg-gray-900">
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          {field('Address', 'address', 'text', '123 Main St')}
        </div>
        <div className="sm:col-span-2">
          {field('Allergies (comma-separated)', 'allergies', 'text', 'Penicillin, Latex')}
        </div>
        <div className="sm:col-span-2">
          {field('Conditions (comma-separated)', 'conditions', 'text', 'Diabetes, Hypertension')}
        </div>
      </div>

      {formError && <p className="text-xs text-red-400">{formError}</p>}

      <DialogFooter>
        <DialogClose ref={closeRef} render={<Button type="button" variant="outline" className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white" />}>
          Cancel
        </DialogClose>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-lg shadow-teal-500/20"
        >
          {submitting ? 'Adding...' : 'Add Patient'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const query = params.toString();
      const data: Patient[] = await apiFetch(
        `/api/admin/patients${query ? `?${query}` : ''}`
      );
      setPatients(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handlePatientAdded = (patient: Patient) => {
    setPatients((prev) => [patient, ...prev]);
  };

  return (
    <div className="admin-dark space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Users className="size-5 text-teal-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-100 tracking-tight">
              Patients
            </h1>
            <p className="text-sm text-gray-400">
              {!loading && `${patients.length} registered`}
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-lg shadow-amber-500/20 rounded-xl px-5 gap-2">
                <Plus className="size-4" />
                Add Patient
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10 shadow-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl text-gray-100">Add New Patient</DialogTitle>
            </DialogHeader>
            <AddPatientForm onSuccess={handlePatientAdded} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
        <Input
          type="search"
          placeholder="Search by name, phone, email or patient number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
        />
      </div>

      {error && (
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg px-4 py-3 border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Patient Table */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Patient List</h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Patient #</TableHead>
                <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Conditions</TableHead>
                <TableHead className="text-xs font-semibold text-white/40 uppercase tracking-wider">Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-white/40 py-12">
                    <Users className="size-8 mx-auto mb-3 text-white/20" />
                    <p>{debouncedSearch ? 'No patients match your search' : 'No patients found'}</p>
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs text-white/40">
                      {patient.patient_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      <a
                        href={`/admin/patients/${patient.id}`}
                        className="text-gray-100 hover:text-teal-400 transition-colors"
                      >
                        {patient.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-white/50">{patient.phone || '--'}</TableCell>
                    <TableCell>
                      {patient.conditions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {patient.conditions.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300"
                            >
                              {c}
                            </span>
                          ))}
                          {patient.conditions.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/[0.06] text-white/40">
                              +{patient.conditions.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/25 text-xs">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-white/50 text-sm">
                      {patient.last_visit ?? '--'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
