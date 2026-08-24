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
        id: s.id as string,
        started_at: s.started_at as string,
        message_count: (s.message_count as number) || 0,
        tools_used: (s.tools_used as string[]) || [],
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
      if (found && Array.isArray((found as Record<string, unknown>).messages)) {
        const msgs: Message[] = ((found as Record<string, unknown>).messages as Record<string, unknown>[])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
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
