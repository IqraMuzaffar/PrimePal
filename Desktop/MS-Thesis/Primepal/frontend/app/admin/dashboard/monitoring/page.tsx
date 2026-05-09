"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Database, Wifi, Brain, Clock, Zap, Shield, DollarSign, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/adminAuth";
import { useMonitoringStats, useMonitoringCalls, useHealthDetailed } from "@/lib/hooks/admin-queries";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
      style={{ boxShadow: ok ? "0 0 8px rgba(16,185,129,0.5)" : "0 0 8px rgba(239,68,68,0.5)" }}
    />
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function MonitoringPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    isCurrentUserAdmin().then((ok) => {
      if (!ok) router.push("/admin/login");
      else setAuthorized(true);
    });
  }, [router]);

  const { data: health, isLoading: healthLoading } = useHealthDetailed();
  const { data: stats, isLoading: statsLoading } = useMonitoringStats();
  const { data: calls, isLoading: callsLoading } = useMonitoringCalls(50);

  if (!authorized) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1">Health checks and LLM performance metrics (auto-refreshes every 30s)</p>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {healthLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />)
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <StatusDot ok={health?.checks?.database?.ok ?? false} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">Database</p>
                <p className="text-xs text-gray-500">
                  {health?.checks?.database?.ok
                    ? `Connected (${health.checks.database.latency_ms}ms)`
                    : health?.checks?.database?.message || "Unreachable"}
                </p>
              </div>
              <Database size={20} className="ml-auto text-gray-300" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <StatusDot ok={health?.checks?.redis?.ok ?? false} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">Redis Cache</p>
                <p className="text-xs text-gray-500">
                  {health?.checks?.redis?.ok ? "Connected" : health?.checks?.redis?.message || "Not connected"}
                </p>
              </div>
              <Wifi size={20} className="ml-auto text-gray-300" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <StatusDot ok={health?.checks?.openai?.ok ?? false} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">OpenAI API</p>
                <p className="text-xs text-gray-500">
                  {health?.checks?.openai?.ok ? "API key configured" : "Missing API key"}
                </p>
              </div>
              <Brain size={20} className="ml-auto text-gray-300" />
            </div>
          </>
        )}
      </div>

      {/* LLM Stats Cards (24h) */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">LLM Performance (24h)</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statsLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />)
        ) : (
          <>
            <StatCard label="Total Calls" value={stats?.total_calls ?? 0} icon={Zap} color="#4361ee" />
            <StatCard label="Total Tokens" value={(stats?.total_tokens ?? 0).toLocaleString()} icon={Activity} color="#7c3aed" />
            <StatCard label="Avg Latency" value={`${stats?.avg_latency_ms ?? 0}ms`} icon={Clock} color="#f59e0b" />
            <StatCard label="Cache Hit Rate" value={`${Math.round((stats?.cache_hit_rate ?? 0) * 100)}%`} icon={Shield} color="#10b981" />
            <StatCard label="Errors" value={stats?.error_count ?? 0} icon={AlertTriangle} color={stats?.error_count ? "#ef4444" : "#6b7280"} />
            <StatCard label="Est. Cost" value={`$${(stats?.estimated_cost_usd ?? 0).toFixed(2)}`} icon={DollarSign} color="#059669" />
          </>
        )}
      </div>

      {/* Recent Calls Table */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">Recent LLM Calls</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Endpoint</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Model</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Tokens</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Latency</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Cache</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {callsLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : !calls || calls.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No LLM calls recorded yet</td></tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(call.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{call.endpoint}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        call.model === "cache" ? "bg-emerald-100 text-emerald-700" :
                        call.model.includes("whisper") ? "bg-purple-100 text-purple-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {call.model}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{call.total_tokens?.toLocaleString() ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{call.cache_hit ? "\u2014" : `${call.latency_ms}ms`}</td>
                    <td className="px-4 py-3 text-center">
                      {call.cache_hit ? (
                        <span className="text-xs font-bold text-emerald-600">HIT</span>
                      ) : (
                        <span className="text-xs text-gray-400">miss</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {call.success ? (
                        <CheckCircle size={16} className="text-emerald-500 inline" />
                      ) : (
                        <XCircle size={16} className="text-red-500 inline" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
