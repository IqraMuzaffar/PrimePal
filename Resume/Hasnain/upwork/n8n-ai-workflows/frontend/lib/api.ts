const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface EmailResult {
  id: number;
  subject: string;
  sender: string;
  body_preview: string;
  category: string;
  confidence: number;
  ai_summary: string;
  suggested_action: string;
  processed_at: string;
}

export interface InvoiceResult {
  id: number;
  filename: string;
  vendor: string;
  amount: number;
  currency: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  line_items: string;
  needs_approval: boolean;
  status: string;
  processed_at: string;
}

export interface LeadResult {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  job_title: string;
  message: string;
  ai_score: number;
  ai_category: string;
  ai_reasoning: string;
  key_signals: string;
  draft_email_subject: string;
  draft_email_body: string;
  processed_at: string;
}

export interface WorkflowRun {
  id: number;
  workflow_name: string;
  status: string;
  items_processed: number;
  duration_ms: number;
  error_message: string | null;
  run_at: string;
}

export interface Stats {
  total_processed: number;
  emails: { total: number; urgent: number; sales_lead: number; support: number; spam: number };
  invoices: { total: number; total_amount: number; pending_approval: number };
  leads: { total: number; hot: number; warm: number; cold: number };
  today: { emails: number; invoices: number; leads: number };
  recent_activity: { type: string; description: string; category: string; time: string }[];
  pipeline_summary: { emails_processed: number; invoices_extracted: number; leads_scored: number; workflow_runs: number };
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchEmails(): Promise<EmailResult[]> {
  const res = await fetch(`${API_BASE}/api/emails`);
  if (!res.ok) throw new Error("Failed to fetch emails");
  return res.json();
}

export async function fetchInvoices(): Promise<InvoiceResult[]> {
  const res = await fetch(`${API_BASE}/api/invoices`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function fetchLeads(): Promise<LeadResult[]> {
  const res = await fetch(`${API_BASE}/api/leads`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

export async function fetchWorkflowRuns(): Promise<WorkflowRun[]> {
  const res = await fetch(`${API_BASE}/api/workflow-runs`);
  if (!res.ok) throw new Error("Failed to fetch workflow runs");
  return res.json();
}
