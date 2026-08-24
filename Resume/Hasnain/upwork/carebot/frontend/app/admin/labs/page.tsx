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
import { Plus, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface LabResult {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'normal' | 'abnormal' | 'critical' | string;
}

interface LabOrder {
  id: string;
  patient_name: string;
  patient_id: string;
  doctor_name: string;
  doctor_id: string;
  test_panel: string;
  priority: 'routine' | 'urgent' | 'stat' | string;
  status: 'ordered' | 'processing' | 'completed' | string;
  ordered_date: string;
  results?: LabResult[];
}

interface NewLabOrderForm {
  patient_id: string;
  doctor_id: string;
  test_panel: string;
  priority: string;
}

interface ResultRow {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: string;
}

// ─── Helper: Status colours ──────────────────────────────────────────────────

function priorityClass(p: string): string {
  const map: Record<string, string> = {
    routine: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
    urgent: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
    stat: 'bg-red-500/15 text-red-300 border border-red-500/20',
  };
  return map[p.toLowerCase()] ?? 'bg-white/5 text-white/50';
}

function labStatusClass(s: string): string {
  const map: Record<string, string> = {
    ordered: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
    processing: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
    completed: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  };
  return map[s.toLowerCase()] ?? 'bg-white/5 text-white/50';
}

function resultStatusClass(s: string): string {
  const map: Record<string, string> = {
    normal: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
    abnormal: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
    critical: 'bg-red-500/15 text-red-300 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  };
  return map[s.toLowerCase()] ?? 'bg-white/5 text-white/50';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${className}`}
    >
      {label.replace('_', ' ')}
    </span>
  );
}

// ─── Status tab button ───────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    all: active ? 'bg-white/10 text-white border-white/20' : 'text-white/40 hover:text-white/70 border-transparent',
    ordered: active ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'text-white/40 hover:text-blue-300 border-transparent',
    processing: active ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'text-white/40 hover:text-amber-300 border-transparent',
    completed: active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'text-white/40 hover:text-emerald-300 border-transparent',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 capitalize ${colorMap[color] ?? colorMap.all}`}
    >
      {label}
    </button>
  );
}

// ─── New Lab Order Dialog ─────────────────────────────────────────────────────

const EMPTY_NEW_ORDER: NewLabOrderForm = {
  patient_id: '',
  doctor_id: '',
  test_panel: '',
  priority: 'routine',
};

function NewLabOrderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewLabOrderForm>(EMPTY_NEW_ORDER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/admin/labs', { method: 'POST', body: JSON.stringify(form) });
      setOpen(false);
      setForm(EMPTY_NEW_ORDER);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lab order');
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof NewLabOrderForm, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</label>
      <Input
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        required
        className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 focus:ring-teal-500/20"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20 border-0">
            <Plus className="size-4 mr-1.5" />
            New Lab Order
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md bg-gray-900 border-white/10 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">New Lab Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {field('patient_id', 'Patient ID', 'e.g. pat_001')}
          {field('doctor_id', 'Doctor ID', 'e.g. doc_001')}
          {field('test_panel', 'Test Panel', 'e.g. Complete Blood Count')}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Priority</label>
            <select
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="routine" className="bg-gray-900">Routine</option>
              <option value="urgent" className="bg-gray-900">Urgent</option>
              <option value="stat" className="bg-gray-900">STAT</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-500 text-white border-0"
            >
              {loading ? 'Submitting...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Enter Results Dialog ─────────────────────────────────────────────────────

const EMPTY_RESULT_ROW: ResultRow = {
  test_name: '',
  value: '',
  unit: '',
  reference_range: '',
  status: 'normal',
};

function EnterResultsDialog({ order, onUpdated }: { order: LabOrder; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ResultRow[]>([{ ...EMPTY_RESULT_ROW }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (idx: number, key: keyof ResultRow, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_RESULT_ROW }]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/api/admin/labs/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', results: rows }),
      });
      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-teal-600/20 text-teal-300 border border-teal-500/30 hover:bg-teal-600/30 hover:text-teal-200"
          >
            Enter Results
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-white/10 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">
            Enter Results — <span className="text-teal-400">{order.test_panel}</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                <Input
                  placeholder="Test name"
                  value={row.test_name}
                  onChange={(e) => updateRow(idx, 'test_name', e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                />
                <Input
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => updateRow(idx, 'value', e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                />
                <Input
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) => updateRow(idx, 'unit', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                />
                <Input
                  placeholder="Ref range"
                  value={row.reference_range}
                  onChange={(e) => updateRow(idx, 'reference_range', e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-teal-500/50 text-sm"
                />
                <div className="flex gap-1 items-center">
                  <select
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
                    value={row.status}
                    onChange={(e) => updateRow(idx, 'status', e.target.value)}
                  >
                    <option value="normal" className="bg-gray-900">Normal</option>
                    <option value="abnormal" className="bg-gray-900">Abnormal</option>
                    <option value="critical" className="bg-gray-900">Critical</option>
                  </select>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="text-red-400 hover:text-red-300 text-sm px-1 transition-colors"
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
            onClick={addRow}
            className="bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
          >
            + Add Row
          </Button>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-500 text-white border-0"
            >
              {loading ? 'Saving...' : 'Save Results'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_TABS = ['all', 'ordered', 'processing', 'completed'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default function LabsPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    apiFetch('/api/admin/labs')
      .then((data: LabOrder[]) => setOrders(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered =
    activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (loading) {
    return (
      <div className="admin-dark space-y-6">
        <h1 className="font-heading text-2xl font-bold text-white">Lab Orders</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dark space-y-6">
        <h1 className="font-heading text-2xl font-bold text-white">Lab Orders</h1>
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
            <FlaskConical className="size-6 text-teal-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Lab Orders</h1>
        </div>
        <NewLabOrderDialog onCreated={fetchOrders} />
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <TabButton
            key={tab}
            label={tab}
            active={activeTab === tab}
            color={tab}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Patient</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Test Panel</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Priority</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Date</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Actions</th>
              <th className="px-5 py-4 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-white/30">
                  No {activeTab === 'all' ? '' : activeTab} lab orders found.
                </td>
              </tr>
            )}
            {filtered.map((order) => (
              <React.Fragment key={order.id}>
                <tr
                  className="border-b border-white/[0.06] hover:bg-white/[0.03] cursor-pointer transition-colors"
                  onClick={() => toggleExpand(order.id)}
                >
                  <td className="px-5 py-4 font-medium text-white">{order.patient_name}</td>
                  <td className="px-5 py-4 text-white/60">{order.test_panel}</td>
                  <td className="px-5 py-4">
                    <StatusBadge label={order.priority} className={priorityClass(order.priority)} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge label={order.status} className={labStatusClass(order.status)} />
                  </td>
                  <td className="px-5 py-4 text-white/40 text-xs">{order.ordered_date}</td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {order.status === 'processing' && (
                      <EnterResultsDialog order={order} onUpdated={fetchOrders} />
                    )}
                  </td>
                  <td className="px-5 py-4 text-white/30">
                    {expandedId === order.id ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </td>
                </tr>

                {expandedId === order.id && (
                  <tr className="bg-white/[0.02]">
                    <td colSpan={7} className="px-8 py-5">
                      {order.results && order.results.length > 0 ? (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/[0.06]">
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Test</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Value</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Unit</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Reference</th>
                                <th className="px-4 py-3 text-left font-semibold text-teal-400/80 uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.results.map((r, i) => (
                                <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors">
                                  <td className="px-4 py-2.5 text-white">{r.test_name}</td>
                                  <td className="px-4 py-2.5 text-white font-mono">{r.value}</td>
                                  <td className="px-4 py-2.5 text-white/50">{r.unit}</td>
                                  <td className="px-4 py-2.5 text-white/50">{r.reference_range}</td>
                                  <td className="px-4 py-2.5">
                                    <StatusBadge label={r.status} className={resultStatusClass(r.status)} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 italic">No results recorded yet.</p>
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
