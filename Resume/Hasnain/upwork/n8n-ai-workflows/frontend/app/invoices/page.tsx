"use client";

import { useEffect, useState } from "react";
import { fetchInvoices, InvoiceResult } from "@/lib/api";
import { AlertCircle, FileText, DollarSign, Clock, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "\u2014";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function daysRemaining(dateStr: string): { text: string; overdue: boolean } {
  if (!dateStr) return { text: "", overdue: false };
  try {
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, overdue: true };
    if (diffDays === 0) return { text: "Due today", overdue: false };
    return { text: `${diffDays}d remaining`, overdue: false };
  } catch {
    return { text: "", overdue: false };
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "processed"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : status === "pending"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span className={`px-2.5 py-1 rounded-full border font-medium text-xs ${cls}`}>
      {status}
    </span>
  );
}

function InvoiceCard({ inv }: { inv: InvoiceResult }) {
  const [expanded, setExpanded] = useState(false);
  const due = daysRemaining(inv.due_date);
  const isOverdue = due.overdue;

  let lineItems: { description?: string; quantity?: number; amount?: number }[] = [];
  try {
    if (inv.line_items) {
      lineItems = JSON.parse(inv.line_items);
    }
  } catch {
    // not valid JSON, ignore
  }

  return (
    <div className={`rounded-xl border backdrop-blur-md bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300 overflow-hidden ${
      isOverdue ? "border-red-500/40 shadow-lg shadow-red-500/5" : inv.needs_approval ? "border-amber-500/30 shadow-lg shadow-amber-500/5" : "border-slate-700/40"
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-slate-100 font-semibold text-lg">{inv.vendor || "Unknown Vendor"}</h3>
            <p className="text-slate-500 text-xs mt-0.5">Invoice #{inv.invoice_number || "\u2014"} | {formatDate(inv.invoice_date)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-100 font-mono font-bold text-xl">
              {inv.amount != null ? formatCurrency(inv.amount, inv.currency || "USD") : "\u2014"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={inv.status} />
          {inv.needs_approval && (
            <span className="px-2.5 py-1 rounded-full border font-medium text-xs bg-red-500/15 text-red-400 border-red-500/30">
              Needs Approval
            </span>
          )}
          {due.text && (
            <span className={`text-xs font-medium ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
              <Clock size={11} className="inline mr-1 -mt-0.5" />
              {due.text}
            </span>
          )}
        </div>
      </div>

      {/* Expandable line items */}
      {lineItems.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 border-t border-slate-800/40 text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors"
          >
            <span>{lineItems.length} line item{lineItems.length > 1 ? "s" : ""}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="px-5 pb-4">
              <div className="bg-slate-950/60 border border-slate-700/40 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium text-xs">Description</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium text-xs">Qty</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {lineItems.map((li, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-300">{li.description || "\u2014"}</td>
                        <td className="px-3 py-2 text-slate-400 text-right font-mono">{li.quantity ?? "\u2014"}</td>
                        <td className="px-3 py-2 text-slate-300 text-right font-mono">{li.amount != null ? formatCurrency(li.amount, inv.currency || "USD") : "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-lg animate-pulse">Loading invoices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={40} />
          <p className="text-slate-300 text-lg font-medium mb-1">Failed to load invoices</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingCount = invoices.filter((inv) => inv.needs_approval).length;
  const approvedCount = invoices.filter((inv) => !inv.needs_approval).length;

  const summaryCards = [
    { label: "Total Amount", value: formatCurrency(totalAmount, "USD"), icon: DollarSign, text: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pending Approval", value: String(pendingCount), icon: Clock, text: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Approved", value: String(approvedCount), icon: CheckCircle2, text: "text-cyan-400", bg: "bg-cyan-500/10" },
  ];

  return (
    <div className="min-h-screen p-8" style={{ background: "linear-gradient(135deg, #0c1222 0%, #0a0f1a 50%, #0d1117 100%)" }}>
      <div className="mb-6">
        <h1 className="text-slate-100 font-bold text-2xl mb-1">Invoice Extractions</h1>
        <p className="text-slate-400 text-sm">
          AI-extracted data from uploaded invoice documents
        </p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40 p-4 hover:bg-slate-900/60 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={18} className={card.text} />
                </div>
                <div>
                  <p className={`font-mono font-bold text-xl ${card.text}`}>{card.value}</p>
                  <p className="text-slate-500 text-xs">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Cards */}
      {invoices.length === 0 ? (
        <div className="rounded-xl border border-slate-700/40 backdrop-blur-md bg-slate-900/40">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No invoices processed yet.</p>
            <p className="text-slate-600 text-sm mt-1">Upload invoices through the workflow to populate this list.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {invoices.map((inv) => (
            <InvoiceCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
