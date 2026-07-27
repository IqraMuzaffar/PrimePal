"use client";

import { useEffect, useState } from "react";
import { fetchInvoices, InvoiceResult } from "@/lib/api";
import { AlertCircle, FileText } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
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
    <span className={`px-2 py-0.5 rounded-full border font-medium ${cls}`} style={{ fontSize: 13 }}>
      {status}
    </span>
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-slate-100 font-bold mb-1" style={{ fontSize: 32 }}>
          Invoice Extractions
        </h1>
        <p className="text-slate-400" style={{ fontSize: 15 }}>
          AI-extracted data from uploaded invoice documents
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="text-slate-600 mb-3" size={40} />
            <p className="text-slate-500 text-lg">No invoices processed yet.</p>
            <p className="text-slate-600 text-sm mt-1">Upload invoices through the workflow to populate this list.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Vendor", "Amount", "Invoice #", "Invoice Date", "Due Date", "Status", "Approval"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-slate-500 font-semibold uppercase tracking-wider"
                      style={{ fontSize: 14 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`transition-colors ${
                      inv.needs_approval
                        ? "bg-amber-500/5 hover:bg-amber-500/10"
                        : "hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="px-5 py-4 text-slate-200 font-medium" style={{ fontSize: 16 }}>
                      {inv.vendor || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-100 font-mono font-semibold" style={{ fontSize: 16 }}>
                      {inv.amount != null ? formatCurrency(inv.amount, inv.currency || "USD") : "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-400" style={{ fontSize: 15 }}>
                      {inv.invoice_number || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-400" style={{ fontSize: 15 }}>
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="px-5 py-4 text-slate-400" style={{ fontSize: 15 }}>
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-4">
                      {inv.needs_approval ? (
                        <span
                          className="px-2 py-0.5 rounded-full border font-medium bg-amber-500/15 text-amber-400 border-amber-500/30"
                          style={{ fontSize: 13 }}
                        >
                          Required
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full border font-medium bg-slate-500/15 text-slate-500 border-slate-600/30"
                          style={{ fontSize: 13 }}
                        >
                          Auto
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
