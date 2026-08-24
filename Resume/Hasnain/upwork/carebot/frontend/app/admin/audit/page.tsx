'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Shield, X } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  timestamp: string;
  user_type: 'admin' | 'doctor' | 'patient' | 'system' | string;
  user_id?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface FiltersState {
  user_type: string;
  action: string;
  date_from: string;
  date_to: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const USER_TYPE_OPTIONS = ['', 'admin', 'doctor', 'patient', 'system'];

const USER_TYPE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-400 border-red-500/25',
  doctor: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  patient: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  system: 'bg-white/[0.08] text-gray-400 border-white/10',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function UserTypeBadge({ type }: { type: string }) {
  const cls = USER_TYPE_COLORS[type.toLowerCase()] ?? 'bg-white/[0.08] text-gray-400 border-white/10';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${cls}`}>
      {type}
    </span>
  );
}

function formatTimestamp(ts: string): { date: string; time: string } {
  try {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  } catch {
    return { date: ts, time: '' };
  }
}

// ─── Expandable details ───────────────────────────────────────────────────────

function DetailsCell({ details }: { details?: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  if (!details || Object.keys(details).length === 0) {
    return <span className="text-gray-400/40 text-xs">---</span>;
  }

  const summary = Object.entries(details)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(', ');

  return (
    <div>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-100 transition-colors duration-200 group"
      >
        <span className="truncate max-w-36">{summary}</span>
        {expanded ? (
          <ChevronUp className="size-3 shrink-0 text-teal-400" />
        ) : (
          <ChevronDown className="size-3 shrink-0 group-hover:text-teal-400 transition-colors" />
        )}
      </button>
      {expanded && (
        <pre className="mt-2 text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 max-w-xs overflow-auto whitespace-pre-wrap text-gray-100/70 font-mono leading-relaxed">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<FiltersState>({
    user_type: '',
    action: '',
    date_from: '',
    date_to: '',
  });

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (filters.user_type) params.set('user_type', filters.user_type);
    if (filters.action) params.set('action', filters.action);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    return params.toString();
  }, [offset, filters]);

  const fetchAudit = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/admin/audit?${buildQuery()}`)
      .then((data: AuditResponse) => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const handleFilterChange = (key: keyof FiltersState, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  };

  const hasActiveFilters = filters.user_type || filters.action || filters.date_from || filters.date_to;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-500/10 p-2.5">
            <Shield className="size-6 text-teal-400" />
          </div>
          <h1 className="text-2xl font-heading text-gray-100 tracking-tight">Audit Log</h1>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-500/10 p-2.5">
            <Shield className="size-6 text-teal-400" />
          </div>
          <h1 className="text-2xl font-heading text-gray-100 tracking-tight">Audit Log</h1>
        </div>
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchAudit}
            className="inline-flex items-center h-9 px-5 rounded-lg bg-teal-500 hover:bg-teal-300 text-white font-medium text-sm transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/20 rounded-xl blur-lg" />
          <div className="relative rounded-xl bg-teal-500/10 p-2.5">
            <Shield className="size-6 text-teal-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-heading text-gray-100 tracking-tight">
            Audit Log
          </h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {total.toLocaleString()} records
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
              User Type
            </label>
            <select
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200 min-w-[140px]"
              value={filters.user_type}
              onChange={(e) => handleFilterChange('user_type', e.target.value)}
            >
              {USER_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'All Users' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Action
            </label>
            <Input
              placeholder="Filter by action..."
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-44 bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-400/50 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
              From
            </label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-40 bg-white/5 border-white/10 text-gray-100 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
              To
            </label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-40 bg-white/5 border-white/10 text-gray-100 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({ user_type: '', action: '', date_from: '', date_to: '' });
                setOffset(0);
              }}
              className="inline-flex items-center gap-1.5 h-[42px] px-4 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all duration-200"
            >
              <X className="size-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit table */}
      <div className={`bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl overflow-hidden transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400 whitespace-nowrap">
                  Timestamp
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  User Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Action
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Resource
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Details
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <Shield className="size-8 text-gray-400/20 mx-auto mb-2" />
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const ts = formatTimestamp(entry.timestamp);
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors duration-150"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-gray-100 font-mono">{ts.date}</div>
                        <div className="text-[10px] text-gray-400/60 font-mono mt-0.5">{ts.time}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <UserTypeBadge type={entry.user_type} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-100 font-medium text-xs">
                        {entry.action}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {entry.resource}
                      </td>
                      <td className="px-5 py-3.5">
                        <DetailsCell details={entry.details} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400/60 font-mono">
                        {entry.ip_address ?? '---'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} &mdash; {total.toLocaleString()} total entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="inline-flex items-center h-9 px-4 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-gray-100 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft className="size-4 mr-1.5" />
              Previous
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="inline-flex items-center h-9 px-4 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-gray-100 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <ChevronRight className="size-4 ml-1.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
