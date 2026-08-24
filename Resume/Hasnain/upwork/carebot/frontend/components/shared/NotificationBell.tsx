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
      // ignore - user may not be logged in
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
