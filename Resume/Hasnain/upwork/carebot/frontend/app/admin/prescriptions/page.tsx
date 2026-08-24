'use client';

import React, { useEffect, useState } from 'react';
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
import { Plus, ChevronDown, ChevronUp, Pill, AlertTriangle } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MedicationItem {
  drug: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patient_name: string;
  patient_id: string;
  doctor_name: string;
  doctor_id: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled' | string;
  medications: MedicationItem[];
  notes?: string;
}

interface CreatePrescriptionResponse {
  id: string;
  allergy_warnings?: string[];
}

interface NewPrescriptionForm {
  patient_id: string;
  doctor_id: string;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function prescriptionStatusClass(s: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
    completed: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
    cancelled: 'bg-red-500/15 text-red-300 border border-red-500/20',
  };
  return map[s.toLowerCase()] ?? 'bg-white/5 text-white/50';
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${className}`}>
      {label}
    </span>
  );
}

// ─── Empty medication row ─────────────────────────────────────────────────────

const EMPTY_MED: MedicationItem = {
  drug: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
};

// ─── New Prescription Dialog ──────────────────────────────────────────────────

function NewPrescriptionDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewPrescriptionForm>({ patient_id: '', doctor_id: '', notes: '' });
  const [meds, setMeds] = useState<MedicationItem[]>([{ ...EMPTY_MED }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allergyWarnings, setAllergyWarnings] = useState<string[]>([]);

  const updateMed = (idx: number, key: keyof MedicationItem, val: string) => {
    setMeds((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: val } : m)));
  };

  const addMed = () => setMeds((prev) => [...prev, { ...EMPTY_MED }]);
  const removeMed = (idx: number) => setMeds((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAllergyWarnings([]);
    setLoading(true);
    try {
      const res: CreatePrescriptionResponse = await apiFetch('/api/admin/prescriptions', {
        method: 'POST',
        body: JSON.stringify({ ...form, medications: meds }),
      });
      if (res.allergy_warnings && res.allergy_warnings.length > 0) {
        setAllergyWarnings(res.allergy_warnings);
      } else {
        setOpen(false);
        setForm({ patient_id: '', doctor_id: '', notes: '' });
        setMeds([{ ...EMPTY_MED }]);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setAllergyWarnings([]);
      setError('');
    }
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20 border-0">
            <Plus className="size-4 mr-1.5" />
            New Prescription
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-white/10 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">New Prescription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Patient ID</label>
              <Input
                placeholder="e.g. pat_001"
                value={form.patient_id}
                onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Doctor ID</label>
              <Input
                placeholder="e.g. doc_001"
                value={form.doctor_id}
                onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Medication rows */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Medications</p>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {meds.map((med, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <Input
                    placeholder="Drug"
                    value={med.drug}
                    onChange={(e) => updateMed(idx, 'drug', e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                  />
                  <Input
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => updateMed(idx, 'dosage', e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                  />
                  <Input
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => updateMed(idx, 'frequency', e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                  />
                  <Input
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => updateMed(idx, 'duration', e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                  />
                  <div className="flex gap-1 items-center">
                    <Input
                      placeholder="Notes"
                      value={med.instructions}
                      onChange={(e) => updateMed(idx, 'instructions', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                    />
                    {meds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMed(idx)}
                        className="text-red-400 hover:text-red-300 text-sm px-1 shrink-0 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addMed}
              className="bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            >
              + Add Medication
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Notes</label>
            <Input
              placeholder="Optional prescriber notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
            />
          </div>

          {allergyWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
                <AlertTriangle className="size-4" />
                Allergy Warnings
              </div>
              <ul className="list-disc list-inside text-xs text-amber-300/80 space-y-1">
                {allergyWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-500 text-white border-0"
            >
              {loading ? 'Submitting...' : 'Create Prescription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPrescriptions = () => {
    setLoading(true);
    apiFetch('/api/admin/prescriptions')
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPrescriptions(); }, []);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <div className="admin-dark space-y-6">
        <h1 className="font-heading text-2xl font-bold text-white">Prescriptions</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white/5 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dark space-y-6">
        <h1 className="font-heading text-2xl font-bold text-white">Prescriptions</h1>
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dark space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-500/10 p-2.5">
            <Pill className="size-6 text-teal-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Prescriptions</h1>
        </div>
        <NewPrescriptionDialog onCreated={fetchPrescriptions} />
      </div>

      {/* Table */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Patient</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Doctor</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Date</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Meds</th>
              <th className="px-5 py-4 w-8" />
            </tr>
          </thead>
          <tbody>
            {prescriptions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-white/30">
                  No prescriptions found.
                </td>
              </tr>
            )}
            {prescriptions.map((rx) => (
              <React.Fragment key={rx.id}>
                <tr
                  className="border-b border-white/[0.06] hover:bg-white/[0.03] cursor-pointer transition-colors"
                  onClick={() => toggleExpand(rx.id)}
                >
                  <td className="px-5 py-4 font-medium text-white">{rx.patient_name}</td>
                  <td className="px-5 py-4 text-white/60">{rx.doctor_name}</td>
                  <td className="px-5 py-4 text-white/40 text-xs">{rx.date}</td>
                  <td className="px-5 py-4">
                    <StatusBadge label={rx.status} className={prescriptionStatusClass(rx.status)} />
                  </td>
                  <td className="px-5 py-4 text-white/60">{rx.medications.length}</td>
                  <td className="px-5 py-4 text-white/30">
                    {expandedId === rx.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </td>
                </tr>

                {expandedId === rx.id && (
                  <tr className="bg-white/[0.02]">
                    <td colSpan={6} className="px-8 py-5">
                      {rx.medications.length > 0 ? (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/[0.06]">
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Drug</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Dosage</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Frequency</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Duration</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Instructions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rx.medications.map((med, i) => (
                                <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors">
                                  <td className="px-4 py-2.5 text-white font-medium">{med.drug}</td>
                                  <td className="px-4 py-2.5 text-white/60">{med.dosage}</td>
                                  <td className="px-4 py-2.5 text-white/60">{med.frequency}</td>
                                  <td className="px-4 py-2.5 text-white/60">{med.duration}</td>
                                  <td className="px-4 py-2.5 text-white/40 italic">{med.instructions || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 italic">No medications recorded.</p>
                      )}
                      {rx.notes && (
                        <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                          <p className="text-xs text-white/50">
                            <span className="font-medium text-white/70 uppercase tracking-wider">Notes:</span>{' '}
                            <span className="text-white/40">{rx.notes}</span>
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
