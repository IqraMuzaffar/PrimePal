# MCP Finance Server — Design Spec

## Overview

**FinancePal** is an AI-powered finance dashboard SaaS where businesses ask natural language questions about their financial data. A TypeScript MCP server connects Claude to PostgreSQL/Supabase, enabling queries, charts, reports, and anomaly detection — all through conversation.

**Target customers:**
- Small businesses / freelancers (spreadsheets → AI dashboard)
- Startups / SMBs with existing PostgreSQL databases
- Finance teams in mid-size companies wanting AI analytics without SQL

**Tech stack:** TypeScript MCP Server, Claude API, Next.js 14, Supabase (PostgreSQL + Auth), Chart.js, PDFKit, ExcelJS

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Next.js Web  │  │Claude Desktop│  │ Any MCP      │  │
│  │ Dashboard    │  │   (direct)   │  │ Client       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│              MCP FINANCE SERVER (TypeScript)             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              MCP Tool Registry                   │    │
│  │                                                  │    │
│  │  PRE-BUILT TOOLS        DYNAMIC TOOLS            │    │
│  │  ├─ get_revenue          ├─ run_custom_query     │    │
│  │  ├─ get_expenses         ├─ explain_query        │    │
│  │  ├─ get_profit_loss      └─ discover_schema      │    │
│  │  ├─ get_invoices                                 │    │
│  │  ├─ get_cash_flow       OUTPUT TOOLS             │    │
│  │  ├─ get_top_vendors      ├─ generate_chart       │    │
│  │  ├─ get_overdue          ├─ create_report_pdf    │    │
│  │  └─ get_account_balances └─ detect_anomalies     │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│  ┌──────────────────────┼──────────────────────────┐    │
│  │           CORE SERVICES                          │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │    │
│  │  │  Query    │ │  Chart    │ │  Report       │  │    │
│  │  │  Engine   │ │  Generator│ │  Generator    │  │    │
│  │  │(SQL+valid)│ │(Chart.js) │ │(PDFKit)       │  │    │
│  │  └───────────┘ └───────────┘ └───────────────┘  │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │    │
│  │  │  Anomaly  │ │  Schema   │ │  CSV          │  │    │
│  │  │  Detector │ │  Inspector│ │  Parser       │  │    │
│  │  └───────────┘ └───────────┘ └───────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 SUPABASE (PostgreSQL)                    │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Auth     │ │ Orgs &   │ │ Financial│ │ Connected │  │
│  │ (GoTrue) │ │ Members  │ │ Data     │ │ Databases │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                                                         │
│  RLS policies isolate data per organization             │
└─────────────────────────────────────────────────────────┘
```

**Three access modes:**
1. **Web Dashboard** — Users chat in Next.js app, which calls Claude API with MCP tools attached
2. **Claude Desktop** — Power users add MCP server to Claude Desktop config
3. **Any MCP client** — Developers integrate via MCP protocol

---

## Data Model

### organizations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text | |
| slug | text, unique | |
| plan | text | free/pro/enterprise |
| created_at | timestamptz | |

### org_members
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| user_id | uuid, FK → auth.users | |
| role | text | admin/member |
| created_at | timestamptz | |

### connected_databases
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| name | text | Display name |
| connection_string | text | AES-256 encrypted |
| schema_cache | jsonb | Cached table/column info |
| last_synced_at | timestamptz | |
| status | text | active/error/disconnected |
| created_at | timestamptz | |

### transactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| date | date | |
| description | text | |
| amount | numeric | |
| type | text | income/expense |
| category | text | |
| account | text | |
| vendor | text | |
| reference_number | text | |
| source | text | csv_upload/manual/sync |
| metadata | jsonb | |
| created_at | timestamptz | |

### invoices
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| invoice_number | text | |
| client_name | text | |
| amount | numeric | |
| status | text | draft/sent/paid/overdue |
| issue_date | date | |
| due_date | date | |
| paid_date | date | Nullable |
| line_items | jsonb | |
| created_at | timestamptz | |

### csv_uploads
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| uploaded_by | uuid, FK → auth.users | |
| filename | text | |
| row_count | integer | |
| column_mapping | jsonb | Maps CSV cols → transaction fields |
| status | text | pending/processing/completed/failed |
| created_at | timestamptz | |

### chat_history
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| user_id | uuid, FK → auth.users | |
| role | text | user/assistant |
| content | text | |
| tool_calls | jsonb | MCP tools used |
| charts | jsonb | Generated chart configs |
| created_at | timestamptz | |

### anomaly_alerts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| org_id | uuid, FK → organizations | |
| type | text | spike/drop/overdue/unusual |
| severity | text | info/warning/critical |
| title | text | |
| description | text | |
| data | jsonb | Supporting numbers |
| is_read | boolean | |
| created_at | timestamptz | |

**Two data paths:**
- **CSV upload:** User uploads CSV → parse → map columns → insert into `transactions` → Claude queries `transactions`
- **Connected DB:** User provides connection string → cache schema → Claude generates SQL → MCP server queries their DB directly (read-only)

---

## MCP Tools

### Pre-Built Finance Tools (8)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `get_revenue` | `period`, `start_date`, `end_date`, `group_by` (month/category/vendor) | Revenue totals + breakdown |
| `get_expenses` | `period`, `start_date`, `end_date`, `group_by`, `top_n` | Expense totals + breakdown |
| `get_profit_loss` | `period`, `start_date`, `end_date` | Revenue - expenses, margin %, period comparison |
| `get_cash_flow` | `period`, `start_date`, `end_date` | Inflows, outflows, net cash flow by period |
| `get_invoices` | `status`, `client_name`, `date_range` | Invoice list with totals |
| `get_overdue_invoices` | `days_threshold` (default 30) | Overdue invoices + aging breakdown (30/60/90) |
| `get_top_vendors` | `period`, `top_n`, `min_amount` | Top vendors by spend |
| `get_account_balances` | `as_of_date` | Account-wise balance summary |

### Dynamic Query Tools (3)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `discover_schema` | `source` (internal/connected), `connection_id` | Table names, columns, types, sample rows |
| `run_custom_query` | `sql`, `source`, `connection_id` | Query results (max 500 rows). Read-only enforced. 10s timeout. |
| `explain_query` | `sql` | Human-readable explanation of what the SQL does |

### Output Tools (2)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `generate_chart` | `type` (bar/line/pie/area), `title`, `labels[]`, `datasets[]`, `options` | Chart.js config JSON — frontend renders it |
| `create_report` | `title`, `sections[]`, `format` (pdf/excel) | Download URL for generated report |

### Anomaly Detection (1)

| Tool | Parameters | Returns |
|------|-----------|---------|
| `detect_anomalies` | `lookback_days` (default 90), `sensitivity` (low/medium/high) | Anomaly list: spikes, drops, overdue, unusual transactions |

### Security Guardrails
- `run_custom_query`: SQL parsed through whitelist. Only `SELECT` passes. Blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `EXEC`, `GRANT`, comments, semicolons.
- Connected DBs: read-only PostgreSQL role enforced. Connection string AES-256 encrypted at rest.
- Org isolation: pre-built tools auto-inject `WHERE org_id = :org_id`. `org_id` from session, never from Claude.
- Rate limits: 20 messages/min per user, 10 custom queries/min per org, 50MB/100K row CSV limit, 10 reports/hr per org.

---

## Frontend Pages

### 1. Chat Interface (`/dashboard`)
Full-screen chat with Claude. Charts render inline when `generate_chart` is called. Report download buttons appear inline. Anomaly alerts as dismissible cards above chat. Suggested starter questions displayed.

### 2. Data Sources (`/dashboard/sources`)
- **CSV Upload tab:** Drag-and-drop, column mapping UI, upload history
- **Connected DBs tab:** Add connection form, schema preview, health status

### 3. Transactions (`/dashboard/transactions`)
Sortable/filterable table. Filters: date range, type, category, vendor, source. Bulk categorize/delete. Manual entry form.

### 4. Invoices (`/dashboard/invoices`)
Invoice list with status badges. Aging report view (30/60/90 day buckets). Create/edit form. Mark as paid.

### 5. Reports (`/dashboard/reports`)
Pre-built templates: Monthly P&L, Cash Flow, Expense Report, Invoice Aging. Generate via Claude → PDF/Excel download. Report history.

### 6. Settings (`/dashboard/settings`)
Org profile, team management (invite/roles), billing, MCP connection config JSON snippet for Claude Desktop users.

### Layout
Left sidebar (nav + org switcher), top bar (avatar, notifications, plan badge). Responsive for tablet, functional on mobile.

---

## Key Flows

### CSV Upload → Chat Query
```
Upload CSV → detect columns → column mapping UI → confirm → parse → insert into transactions
→ User asks question → Claude API + MCP tools → get_expenses() → generate_chart()
→ Frontend renders text + chart inline
```

### Connect External DB → Dynamic Query
```
Enter connection string → test (read-only) → cache schema
→ User asks question → discover_schema() → Claude generates SQL
→ run_custom_query() (validated, 10s timeout) → generate_chart()
→ Frontend renders table + chart
```

### Anomaly Detection
```
On-demand or daily cron → detect_anomalies()
→ Statistical checks: category spikes (>2 std dev), revenue drops (>20% MoM), overdue invoices, outlier amounts
→ Claude explains in plain English → alert cards + chat response
```

### Report Generation
```
User asks "Generate Q2 P&L" → Claude calls get_profit_loss + get_revenue + get_expenses
→ generate_chart() for visuals → create_report(format=pdf)
→ MCP server builds PDF with tables + charts + narrative → download URL
```

### Multi-Tenant Org Switching
```
Sidebar org switcher → updates active org_id in session
→ All MCP tools scoped to new org via RLS → chat/data/sources switch
→ Zero cross-org data leakage
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| SQL validation fails | "Query blocked: only SELECT statements allowed" |
| External DB unreachable | Connection error message + mark status as `error` |
| Query timeout (>10s) | Kill query, suggest narrowing date range/adding filters |
| Row limit exceeded (>500) | Return first 500 + count message |
| CSV parse error | Show row-level errors, allow mapping fix + retry |
| Claude API error | Retry once (exponential backoff), then "AI temporarily unavailable" |
| Invalid chart config | Fallback to data table |
| PDF generation fails | Return data as JSON + error message |

All tool parameters validated with Zod schemas. Date ranges capped at 2 years. `top_n` capped at 100. User text inputs sanitized.

---

## Project Structure

```
financepal/
├── mcp-server/                    # TypeScript MCP Server
│   ├── src/
│   │   ├── index.ts               # MCP server entry point
│   │   ├── tools/
│   │   │   ├── revenue.ts
│   │   │   ├── expenses.ts
│   │   │   ├── profit-loss.ts
│   │   │   ├── cash-flow.ts
│   │   │   ├── invoices.ts
│   │   │   ├── vendors.ts
│   │   │   ├── balances.ts
│   │   │   ├── custom-query.ts
│   │   │   ├── schema.ts
│   │   │   ├── charts.ts
│   │   │   ├── reports.ts
│   │   │   └── anomalies.ts
│   │   ├── services/
│   │   │   ├── query-engine.ts
│   │   │   ├── chart-generator.ts
│   │   │   ├── report-generator.ts
│   │   │   ├── anomaly-detector.ts
│   │   │   ├── csv-parser.ts
│   │   │   ├── schema-inspector.ts
│   │   │   └── encryption.ts
│   │   ├── db/
│   │   │   ├── supabase.ts
│   │   │   └── external.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # Next.js 14 (App Router)
│   ├── app/
│   │   ├── page.tsx               # Landing page
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Chat interface
│   │   │   ├── sources/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── invoices/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── chat/route.ts
│   │       ├── upload/route.ts
│   │       └── reports/[id]/route.ts
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChartRenderer.tsx
│   │   │   └── ReportCard.tsx
│   │   ├── data/
│   │   │   ├── CSVUploader.tsx
│   │   │   ├── ColumnMapper.tsx
│   │   │   ├── DBConnector.tsx
│   │   │   └── TransactionTable.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── OrgSwitcher.tsx
│   │   │   └── TopBar.tsx
│   │   └── ui/                    # shadcn/ui
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── api.ts
│   │   └── hooks/
│   │       ├── useChat.ts
│   │       └── useOrg.ts
│   ├── package.json
│   └── tailwind.config.ts
│
├── supabase/
│   └── migrations/
│
├── seed/
│   ├── transactions.sql
│   ├── invoices.sql
│   └── sample-bank-statement.csv
│
├── docker-compose.yml
├── .env.example
└── README.md
```

**Key dependencies:**
- **MCP Server:** `@modelcontextprotocol/sdk`, `pg`, `pdfkit`, `exceljs`, `papaparse`, `zod`
- **Frontend:** `next@14`, `@supabase/supabase-js`, `chart.js`, `react-chartjs-2`, `tailwindcss`, `shadcn/ui`, `react-dropzone`

---

## Seed Data

**Sample company: "Apex Digital Agency"** — 12 months of financial data.

- **~500 transactions:** Client payments ($2K-$15K), salaries, AWS/hosting, SaaS subscriptions, office rent, freelancer payments, marketing, travel. Categories: Engineering, Design, Marketing, Operations, Sales, Admin.
- **~40 invoices:** 25 paid, 8 overdue, 4 draft, 3 sent. Clients: TechCorp, StartupXYZ, GreenEnergy Ltd, Fashion House, HealthFirst. Amounts $1,500-$25,000.
- **Built-in anomalies:** Marketing spike in March (3x), revenue drop in December, 3 invoices 60+ days overdue from StartupXYZ, unusual $8,500 equipment expense in June.

**Demo script:**
1. "Show me revenue by month for the last 6 months" → line chart
2. "Which client owes me the most money?" → overdue invoice table
3. "Are there any unusual expenses this quarter?" → anomaly detection
4. "Generate my Q2 profit and loss report" → PDF download
5. "Compare expenses this quarter vs last quarter" → bar chart
6. Connect external DB → schema discovery → dynamic SQL query
