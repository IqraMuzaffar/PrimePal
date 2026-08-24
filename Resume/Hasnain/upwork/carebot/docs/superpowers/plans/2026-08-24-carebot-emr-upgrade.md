# CareBot EMR Upgrade — Demo-Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform CareBot from basic CRUD pages into a polished, demo-ready clinic management system with proper chat UI, patient notifications, booking confirmations, upgraded portal, admin visit workflows, and impressive demo features.

**Architecture:** Incremental upgrades to existing FastAPI backend (2 new endpoints, 1 modified) and Next.js frontend (1 new package, 6 page rewrites, 3 new components). No schema changes needed — all tables already exist.

**Tech Stack:** FastAPI, Next.js 14, Tailwind CSS (standard colors only), react-markdown, Chart.js, PostgreSQL

---

## File Map

### Backend (New/Modified)
- **Create:** `backend/app/routers/patient_notifications.py` — GET notifications, PATCH mark-read
- **Modify:** `backend/app/routers/patient.py` — add booking reference number to appointment creation response
- **Modify:** `backend/app/main.py` — register new router

### Frontend (New/Modified)
- **Install:** `react-markdown` npm package
- **Create:** `frontend/components/chat/MarkdownContent.tsx` — markdown renderer component
- **Create:** `frontend/components/shared/NotificationBell.tsx` — bell icon with dropdown
- **Create:** `frontend/components/admin/VisitNotesModal.tsx` — visit notes completion modal
- **Rewrite:** `frontend/components/chat/MessageBubble.tsx` — use MarkdownContent
- **Rewrite:** `frontend/components/chat/ChatWindow.tsx` — add session sidebar, typing indicator, new chat
- **Rewrite:** `frontend/app/portal/page.tsx` — tabbed layout with timeline
- **Rewrite:** `frontend/app/book/page.tsx` — enhanced confirmation with booking number
- **Rewrite:** `frontend/app/admin/appointments/page.tsx` — visit workflow with notes modal
- **Rewrite:** `frontend/app/admin/patients/[id]/page.tsx` — 360° view with timeline

---

## Task 1: Backend — Patient Notifications Endpoint

**Files:**
- Create: `backend/app/routers/patient_notifications.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the notifications router**

```python
# backend/app/routers/patient_notifications.py
from fastapi import APIRouter, Depends
from app.auth import get_current_patient
from app.database import query, execute

router = APIRouter(
    prefix="/api/patient/notifications",
    tags=["patient-notifications"],
    dependencies=[Depends(get_current_patient)],
)


@router.get("")
async def get_notifications(user: dict = Depends(get_current_patient)):
    """Get all notifications for the current patient, newest first."""
    rows = await query(
        """SELECT id, type, channel, subject, body, status, sent_at, created_at
           FROM notifications
           WHERE patient_id = $1
           ORDER BY created_at DESC
           LIMIT 50""",
        user["sub"],
    )
    unread = sum(1 for r in rows if r["status"] == "sent")
    return {"notifications": rows, "unread_count": unread}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str, user: dict = Depends(get_current_patient)
):
    """Mark a notification as read (status -> 'read')."""
    await execute(
        """UPDATE notifications SET status = 'read'
           WHERE id = $1 AND patient_id = $2 AND status = 'sent'""",
        notification_id, user["sub"],
    )
    return {"ok": True}


@router.patch("/read-all")
async def mark_all_read(user: dict = Depends(get_current_patient)):
    """Mark all notifications as read."""
    await execute(
        """UPDATE notifications SET status = 'read'
           WHERE patient_id = $1 AND status = 'sent'""",
        user["sub"],
    )
    return {"ok": True}
```

- [ ] **Step 2: Add 'read' to notification status in schema**

The notifications table CHECK constraint currently only allows `pending`, `sent`, `failed`. We need to add `read`.

```sql
-- Run against the database (Docker postgres on port 5434):
-- psql -h localhost -p 5434 -U carebot -d carebot
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'read'));
```

Also update the migration file for future rebuilds:

In `supabase/migrations/001_schema.sql`, find the notifications table and change:
```sql
status TEXT CHECK (status IN ('pending','sent','failed','read')) DEFAULT 'pending',
```

- [ ] **Step 3: Register the router in main.py**

In `backend/app/main.py`, add:
```python
from app.routers.patient_notifications import router as patient_notifications_router
```

And in the router registration block:
```python
app.include_router(patient_notifications_router)
```

- [ ] **Step 4: Test the endpoint**

```bash
# Get patient token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/patient/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hamza@email.com","date_of_birth":"1981-03-15"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Get notifications
curl -s http://localhost:8000/api/patient/notifications -H "Authorization: Bearer $TOKEN" | python -m json.tool | head -20
```

Expected: JSON with `notifications` array and `unread_count` number.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/patient_notifications.py backend/app/main.py
git commit -m "feat: add patient notifications endpoint with read/read-all"
```

---

## Task 2: Backend — Booking Reference Number

**Files:**
- Modify: `backend/app/routers/patient.py`

- [ ] **Step 1: Modify the appointment creation endpoint to return a booking reference**

In `backend/app/routers/patient.py`, find the `POST /appointments` endpoint. After the appointment is created and `appt_id` is available, generate a reference number and include it in the response.

Find the return statement at the end of the create appointment endpoint and replace it. The reference format is `APT-{YEAR}-{sequential_number}`. We'll use the last 4 chars of the UUID for simplicity:

```python
# After the appointment INSERT, before the return, add:
ref_number = f"APT-{body.date.year}-{appt_id[-4:].upper()}"
```

Then update the return dict to include:
```python
return {
    "id": appt_id,
    "reference_number": ref_number,
    "doctor_id": body.doctor_id,
    "doctor_name": doctor["name"],
    "date": str(body.date),
    "time_slot": str(body.time_slot),
    "status": "scheduled",
    "message": f"Appointment booked successfully. Reference: {ref_number}",
}
```

- [ ] **Step 2: Test**

```bash
curl -s -X POST http://localhost:8000/api/patient/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"doctor_id":"b0000000-0000-0000-0000-000000000001","date":"2026-09-01","time_slot":"10:00","reason":"Test booking"}' | python -m json.tool
```

Expected: Response includes `reference_number` like `APT-2026-A1B2`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/patient.py
git commit -m "feat: add booking reference number to appointment creation"
```

---

## Task 3: Frontend — Install react-markdown + Create MarkdownContent Component

**Files:**
- Create: `frontend/components/chat/MarkdownContent.tsx`

- [ ] **Step 1: Install react-markdown**

```bash
cd frontend && npm install react-markdown
```

- [ ] **Step 2: Create MarkdownContent component**

```tsx
// frontend/components/chat/MarkdownContent.tsx
'use client';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      className={`prose prose-sm max-w-none ${className}`}
      components={{
        strong: ({ children }) => (
          <strong className="font-semibold text-inherit">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-inherit leading-relaxed">{children}</li>
        ),
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-inherit mt-3 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-semibold text-inherit mt-2 mb-1">{children}</h4>
        ),
        code: ({ children }) => (
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-200">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 border-b border-gray-100">{children}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-teal-400 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 3: Update MessageBubble to use MarkdownContent**

Replace the content of `frontend/components/chat/MessageBubble.tsx`:

```tsx
'use client';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  emergency?: boolean;
  toolsUsed?: string[];
}

export function MessageBubble({ role, content, emergency, toolsUsed }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600/10 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-teal-600" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-shadow',
          isUser
            ? 'bg-gradient-to-br from-teal-600 to-teal-400 text-white rounded-br-md shadow-lg shadow-teal-600/10'
            : 'bg-white border border-gray-100 rounded-xl shadow-sm text-gray-900 rounded-bl-md',
          emergency && 'border-2 border-red-500 bg-red-50 text-red-900 shadow-red-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <MarkdownContent
            content={content}
            className={cn(
              emergency && '[&_*]:text-red-900'
            )}
          />
        )}
        {toolsUsed && toolsUsed.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100">
            {toolsUsed.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-600 border border-teal-100"
              >
                {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/chat/MarkdownContent.tsx frontend/components/chat/MessageBubble.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add markdown rendering in chat messages with tool badges"
```

---

## Task 4: Frontend — Chat UI Upgrade (Session Sidebar + Typing + New Chat)

**Files:**
- Rewrite: `frontend/components/chat/ChatWindow.tsx`
- Modify: `frontend/lib/hooks/useChat.ts`

- [ ] **Step 1: Update useChat hook to support session loading**

Replace `frontend/lib/hooks/useChat.ts`:

```tsx
'use client';
import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  emergency?: boolean;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  started_at: string;
  message_count: number;
  tools_used: string[];
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch('/api/patient/chat/history');
      const sessionList: ChatSession[] = data.map((s: Record<string, unknown>) => ({
        id: s.id,
        started_at: s.started_at,
        message_count: s.message_count,
        tools_used: s.tools_used || [],
      }));
      setSessions(sessionList);
      return sessionList;
    } catch {
      return [];
    }
  }, []);

  const loadSessionMessages = useCallback(async (session: ChatSession) => {
    try {
      const data = await apiFetch('/api/patient/chat/history');
      const found = data.find((s: Record<string, unknown>) => s.id === session.id);
      if (found && Array.isArray(found.messages)) {
        const msgs: Message[] = found.messages
          .filter((m: Record<string, unknown>) => m.role === 'user' || m.role === 'assistant')
          .map((m: Record<string, unknown>) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content as string,
            created_at: m.created_at as string,
          }));
        setMessages(msgs);
        setSessionId(session.id);
      }
    } catch {
      // ignore
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await apiFetch('/api/patient/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        toolsUsed: data.tools_used,
        emergency: data.emergency,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setSessionId(data.session_id);
    } catch {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return { messages, loading, sessionId, sessions, sendMessage, clearChat, loadSessions, loadSessionMessages };
}
```

- [ ] **Step 2: Rewrite ChatWindow with session sidebar and typing indicator**

This is a large file. Replace the entire contents of `frontend/components/chat/ChatWindow.tsx` with the upgraded version that includes:
- Left sidebar with past chat sessions (collapsible)
- "New Chat" button
- Typing indicator (3 bouncing dots)
- Session list loaded on mount
- Click session to load its messages
- Notification bell in header (links to notifications)
- Home and Portal links in header

The full component code should be written by the implementing agent, following these specifications:
- Sidebar: 280px wide, `bg-gray-50 border-r border-gray-100`, shows sessions sorted newest first
- Each session card: date formatted, message count badge, click to load
- Active session highlighted with `bg-teal-50 border-l-2 border-teal-500`
- New Chat button: `bg-teal-600 text-white` at top of sidebar
- Typing indicator: 3 dots with staggered `animate-bounce` (delays 0ms, 150ms, 300ms)
- Mobile: sidebar hidden, hamburger toggle
- Header: CareBot logo left, Home/Portal/Notifications/SignOut right
- Keep ALL existing login flow, starter chips, send functionality

- [ ] **Step 3: Build and test**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/chat/ChatWindow.tsx frontend/lib/hooks/useChat.ts
git commit -m "feat: chat UI upgrade with session sidebar, typing indicator, markdown"
```

---

## Task 5: Frontend — Notification Bell Component

**Files:**
- Create: `frontend/components/shared/NotificationBell.tsx`

- [ ] **Step 1: Create NotificationBell component**

```tsx
// frontend/components/shared/NotificationBell.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  appointment_confirmation: '📅',
  appointment_reminder_24h: '⏰',
  appointment_reminder_2h: '🔔',
  appointment_cancelled: '❌',
  lab_results_ready: '🧪',
  critical_lab_alert: '🚨',
  follow_up_reminder: '📋',
  prescription_refill: '💊',
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const data = await apiFetch('/api/patient/notifications');
      setNotifications(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch {
      // ignore
    }
  }

  async function markRead(id: string) {
    await apiFetch(`/api/patient/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await apiFetch('/api/patient/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    setUnread(0);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-500 font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => n.status === 'sent' && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    n.status === 'sent' ? 'bg-teal-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-base mt-0.5">{TYPE_ICONS[n.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${n.status === 'sent' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {n.subject}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    {n.status === 'sent' && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add NotificationBell to ChatWindow and Portal headers**

Import and add `<NotificationBell />` next to the Home/Portal links in both ChatWindow header and Portal header.

- [ ] **Step 3: Build and test**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/shared/NotificationBell.tsx frontend/components/chat/ChatWindow.tsx frontend/app/portal/page.tsx
git commit -m "feat: add notification bell with dropdown, unread count, mark-read"
```

---

## Task 6: Frontend — Booking Confirmation with Reference Number

**Files:**
- Modify: `frontend/app/book/page.tsx`
- Modify: `frontend/components/booking/BookingConfirmation.tsx`

- [ ] **Step 1: Update booking page to capture reference number from API response**

In `frontend/app/book/page.tsx`, add state for booking result:
```tsx
const [bookingResult, setBookingResult] = useState<{
  reference_number: string;
  doctor_name: string;
  date: string;
  time_slot: string;
} | null>(null);
```

In the `handleConfirm` function, capture the response:
```tsx
const result = await apiFetch('/api/patient/appointments', { ... });
setBookingResult(result);
setStep(5);
```

- [ ] **Step 2: Upgrade the success screen (step 5)**

Replace the step 5 rendering with a rich confirmation card:
- Large green checkmark icon
- Reference number displayed prominently (e.g., `APT-2026-A1B2`)
- Doctor name, date, time in a clean grid
- "Add to Calendar" button (generates a downloadable .ics text blob)
- "View in Portal" button linking to `/portal`
- "Book Another" button to reset

The .ics generation:
```tsx
function generateICS(doctor: string, date: string, time: string, ref: string) {
  const start = `${date.replace(/-/g, '')}T${time.replace(/:/g, '')}00`;
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DURATION:PT30M
SUMMARY:Doctor Appointment - ${doctor}
DESCRIPTION:Booking Ref: ${ref}
END:VEVENT
END:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${ref}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Build and test**

- [ ] **Step 4: Commit**

```bash
git add frontend/app/book/page.tsx
git commit -m "feat: booking confirmation with reference number, calendar download"
```

---

## Task 7: Frontend — Patient Portal Upgrade (Tabbed Layout + Timeline)

**Files:**
- Rewrite: `frontend/app/portal/page.tsx`

- [ ] **Step 1: Rewrite portal with tabbed layout**

The new portal should have:
- **Dark navbar** matching the landing page (`bg-gray-900`)
- **Welcome section** with patient name
- **Quick stats row**: Next Appointment, Active Meds, Pending Labs, Unread Notifications (4 cards)
- **Tab bar**: Overview | Appointments | Medications | Lab Results
- **Overview tab**: Recent activity timeline (merge appointments, labs, prescriptions by date, show last 10 events as a vertical timeline with colored dots and cards)
- **Appointments tab**: Upcoming (with cancel button) + Past (with status badges), each in a card
- **Medications tab**: Active meds in cards showing drug name, dosage, frequency, doctor, instructions
- **Lab Results tab**: Results with status indicators (green=normal, amber=abnormal, red=critical), panel name, date, expandable results table

The implementing agent should write the full page following existing patterns:
- Auth guard: `if (!isLoggedIn()) { router.push('/chat'); return; }`
- Parallel fetch: `Promise.all([appointments, medications, labs, notifications])`
- Add `<NotificationBell />` in header
- Use Tabs from shadcn/ui: `<Tabs defaultValue="overview">`
- Tailwind: light theme, `bg-white`, `border-gray-100`, `text-gray-900`

- [ ] **Step 2: Build and test**

- [ ] **Step 3: Commit**

```bash
git add frontend/app/portal/page.tsx
git commit -m "feat: patient portal upgrade with tabs, timeline, quick stats"
```

---

## Task 8: Frontend — Admin Visit Notes Modal + Workflow

**Files:**
- Create: `frontend/components/admin/VisitNotesModal.tsx`
- Modify: `frontend/app/admin/appointments/page.tsx`

- [ ] **Step 1: Create VisitNotesModal component**

```tsx
// frontend/components/admin/VisitNotesModal.tsx
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheck } from 'lucide-react';

interface VisitNotesModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (notes: VisitNotes) => Promise<void>;
  patientName: string;
}

export interface VisitNotes {
  chief_complaint: string;
  examination_findings: string;
  diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  follow_up_days: number | null;
}

export function VisitNotesModal({ open, onClose, onSubmit, patientName }: VisitNotesModalProps) {
  const [notes, setNotes] = useState<VisitNotes>({
    chief_complaint: '',
    examination_findings: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    follow_up_days: null,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(notes);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <ClipboardCheck className="h-5 w-5 text-teal-400" />
            Complete Visit — {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Chief Complaint</label>
            <Textarea
              value={notes.chief_complaint}
              onChange={(e) => setNotes({ ...notes, chief_complaint: e.target.value })}
              placeholder="Patient's primary concern..."
              className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Examination Findings</label>
            <Textarea
              value={notes.examination_findings}
              onChange={(e) => setNotes({ ...notes, examination_findings: e.target.value })}
              placeholder="Clinical observations..."
              className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Diagnosis</label>
            <Input
              value={notes.diagnosis}
              onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })}
              placeholder="e.g., Type 2 Diabetes Mellitus, controlled"
              className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Treatment Plan</label>
            <Textarea
              value={notes.treatment_plan}
              onChange={(e) => setNotes({ ...notes, treatment_plan: e.target.value })}
              placeholder="Medications, lifestyle changes, referrals..."
              className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Follow-up Instructions</label>
              <Input
                value={notes.follow_up_instructions}
                onChange={(e) => setNotes({ ...notes, follow_up_instructions: e.target.value })}
                placeholder="e.g., Return in 2 weeks"
                className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Follow-up (days)</label>
              <Input
                type="number"
                value={notes.follow_up_days || ''}
                onChange={(e) => setNotes({ ...notes, follow_up_days: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 14"
                className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !notes.chief_complaint || !notes.diagnosis}
            className="px-5 py-2 text-sm font-medium bg-teal-500 hover:bg-teal-400 text-white rounded-lg disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Complete Visit'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update admin appointments page to use VisitNotesModal**

In the admin appointments page, when the "Complete" action is clicked:
1. Instead of immediately calling the API, open the VisitNotesModal
2. On modal submit, call `PATCH /api/admin/appointments/{id}` with `{ status: "completed", visit_notes: { ...notes } }`
3. Close modal and refresh the list

Add these to the appointments page:
```tsx
const [notesModalOpen, setNotesModalOpen] = useState(false);
const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
```

Modify the "Complete" action to open the modal instead of directly updating.

- [ ] **Step 3: Build and test**

- [ ] **Step 4: Commit**

```bash
git add frontend/components/admin/VisitNotesModal.tsx frontend/app/admin/appointments/page.tsx
git commit -m "feat: admin visit notes modal for completing appointments"
```

---

## Task 9: Frontend — Admin Patient 360° View with Timeline

**Files:**
- Modify: `frontend/app/admin/patients/[id]/page.tsx`

- [ ] **Step 1: Add a Timeline tab to the patient detail page**

Add a 4th tab "Timeline" to the existing tabs (Appointments, Medications, Labs).

The Timeline tab shows a chronological vertical timeline combining:
- Appointments (blue dot)
- Lab orders (purple dot)
- Prescriptions (amber dot)
- Chat sessions (teal dot)

Each entry shows: date, event type badge, description, doctor name.

Timeline data: merge all existing data (appointments, medications/prescriptions, lab results already fetched) into a single array, sort by date descending, render as vertical timeline with:
- Left: date + time
- Center: colored dot with connecting line
- Right: event card with details

```tsx
// Timeline entry type
interface TimelineEvent {
  date: string;
  type: 'appointment' | 'lab' | 'prescription' | 'chat';
  title: string;
  description: string;
  status?: string;
}
```

Colors per type:
- appointment: `bg-blue-500` dot, `border-l-blue-500` card
- lab: `bg-purple-500` dot, `border-l-purple-500` card
- prescription: `bg-amber-500` dot, `border-l-amber-500` card

- [ ] **Step 2: Build and test**

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/patients/[id]/page.tsx
git commit -m "feat: admin patient 360° view with chronological timeline"
```

---

## Task 10: Final Build + Production Server + Smoke Test

- [ ] **Step 1: Full production build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: All pages compile, no errors.

- [ ] **Step 2: Start production server**

```bash
# Kill existing
taskkill //F //PID $(netstat -ano | grep ":3000" | grep LISTEN | head -1 | awk '{print $5}') 2>/dev/null
# Start
cd frontend && npm start -- -p 3000 &
```

- [ ] **Step 3: Smoke test all pages**

```bash
for route in / /chat /portal /book /admin /admin/patients /admin/doctors /admin/appointments /admin/faqs /admin/audit /admin/labs /admin/prescriptions; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  echo "$STATUS $route"
done
```

Expected: All 200.

- [ ] **Step 4: Test new API endpoints**

```bash
# Patient notifications
curl -s http://localhost:8000/api/patient/notifications -H "Authorization: Bearer $TOKEN" | python -m json.tool | head -10

# Mark read
NOTIF_ID=$(curl -s http://localhost:8000/api/patient/notifications -H "Authorization: Bearer $TOKEN" | python -c "import sys,json;n=json.load(sys.stdin)['notifications'];print(n[0]['id'] if n else '')")
curl -s -X PATCH "http://localhost:8000/api/patient/notifications/$NOTIF_ID/read" -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: CareBot EMR upgrade — chat markdown, notifications, booking refs, portal tabs, visit notes, timeline"
```

---

## Summary

| Task | Feature | Backend | Frontend |
|------|---------|---------|----------|
| 1 | Patient Notifications API | 1 new router, 3 endpoints | — |
| 2 | Booking Reference Number | 1 endpoint modified | — |
| 3 | Markdown in Chat | — | 1 new component, 1 modified |
| 4 | Chat UI (Sidebar + Typing) | — | 2 files rewritten |
| 5 | Notification Bell | — | 1 new component |
| 6 | Booking Confirmation | — | 1 page modified |
| 7 | Portal Upgrade (Tabs + Timeline) | — | 1 page rewritten |
| 8 | Visit Notes Modal | — | 1 new component, 1 page modified |
| 9 | Patient 360° Timeline | — | 1 page modified |
| 10 | Build + Test | — | Production build |
