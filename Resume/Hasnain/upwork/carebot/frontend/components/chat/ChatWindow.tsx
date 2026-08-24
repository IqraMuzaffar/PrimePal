'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, LogOut, Stethoscope, Calendar, Pill, FlaskConical, HelpCircle, Heart, Home, Menu, X, Plus, MessageSquare, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, setToken, clearToken, isLoggedIn as checkLoggedIn } from '@/lib/api';
import { useChat } from '@/lib/hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { EmergencyBanner } from './EmergencyBanner';
import { NotificationBell } from '@/components/shared/NotificationBell';

const STARTER_CHIPS = [
  { label: 'Check my symptoms', icon: Stethoscope, color: 'text-teal-600 bg-teal-600/5 border-teal-600/20 hover:bg-teal-600/10 hover:border-teal-600/30' },
  { label: 'Book appointment', icon: Calendar, color: 'text-amber-500 bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30' },
  { label: 'View medications', icon: Pill, color: 'text-teal-400 bg-teal-400/5 border-teal-400/20 hover:bg-teal-400/10 hover:border-teal-400/30' },
  { label: 'View lab results', icon: FlaskConical, color: 'text-amber-300 bg-amber-300/5 border-amber-300/20 hover:bg-amber-300/10 hover:border-amber-300/30' },
  { label: 'Health question', icon: HelpCircle, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30' },
];

function formatSessionDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ChatWindow() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [patientName, setPatientName] = useState('Patient');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, loading, sessionId, sessions, sendMessage, clearChat, loadSessions, loadSessionMessages } = useChat();

  useEffect(() => {
    setLoggedIn(checkLoggedIn());
  }, []);

  useEffect(() => {
    if (loggedIn) {
      loadSessions();
    }
  }, [loggedIn, loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasEmergency = messages.some(m => m.emergency);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await apiFetch('/api/auth/patient/login', {
        method: 'POST',
        body: JSON.stringify({ email, date_of_birth: dob }),
      });
      setToken(data.token);
      setPatientName(data.name || 'Patient');
      setLoggedIn(true);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleSignOut() {
    clearToken();
    setLoggedIn(false);
    setPatientName('Patient');
    clearChat();
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewChat() {
    clearChat();
    setSidebarOpen(false);
  }

  // --- Login Gate ---
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
        {/* Ambient glows */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-teal-600/10 blur-3xl rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/10 blur-3xl rounded-full" />
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm w-full max-w-md rounded-2xl animate-fade-in-up">
          <div className="text-center pt-8 pb-4 px-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center mb-5 shadow-lg shadow-teal-600/20">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Welcome to CareBot</h1>
            <p className="text-sm text-gray-500">
              Sign in to access your health assistant
            </p>
          </div>
          <div className="px-8 pb-8 pt-2">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1.5 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white border-gray-100 focus:border-teal-600 focus:ring-teal-600/20 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1.5 block">Date of Birth</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  required
                  className="h-11 bg-white border-gray-100 focus:border-teal-600 focus:ring-teal-600/20 rounded-xl"
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-500 bg-red-500/5 px-4 py-2.5 rounded-xl border border-red-500/10">{loginError}</p>
              )}
              <Button type="submit" className="w-full h-11 bg-teal-600 hover:bg-teal-400 text-white text-base shadow-lg shadow-teal-600/20 transition-all hover:shadow-lg rounded-xl" disabled={loginLoading}>
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Demo: hamza@email.com / 1981-03-15
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Chat Interface ---
  return (
    <div className="flex h-screen bg-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} md:relative md:flex flex-col w-[260px] bg-gray-50 border-r border-gray-100`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3 md:hidden">
            <span className="text-sm font-semibold text-gray-900">Chat History</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-gray-200 text-gray-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No past conversations</p>
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  loadSessionMessages(session);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  sessionId === session.id
                    ? 'bg-teal-50 border-l-2 border-teal-500'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-900 truncate">
                    {formatSessionDate(session.started_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 ml-5.5">
                  <Clock className="h-3 w-3 text-gray-300" />
                  <span className="text-xs text-gray-400">
                    {session.message_count} message{session.message_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100/30 backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-gray-900 leading-none">CareBot</h1>
              <p className="text-xs text-gray-500 mt-0.5">{patientName} &middot; City Health Clinic</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/" className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors">
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link href="/portal" className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-50 transition-colors">
              <Calendar className="h-3.5 w-3.5" />
              Portal
            </Link>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-500 hover:text-gray-900 transition-colors">
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Emergency Banner */}
        {hasEmergency && (
          <div className="px-4 pt-3">
            <EmergencyBanner />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-teal-600/10 flex items-center justify-center mx-auto mb-5">
                  <Bot className="h-8 w-8 text-teal-600" />
                </div>
                <h2 className="font-heading text-xl font-bold text-gray-900">How can I help you today?</h2>
                <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
                  Ask about your health, medications, appointments, or lab results. I&apos;m here to help.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 max-w-lg">
                {STARTER_CHIPS.map(chip => {
                  const Icon = chip.icon;
                  return (
                    <Button
                      key={chip.label}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(chip.label)}
                      className={`gap-2 rounded-full border px-4 py-2 transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${chip.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {chip.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              emergency={msg.emergency}
            />
          ))}

          {loading && (
            <div className="flex gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-teal-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-xl rounded-bl-md shadow-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100/30 px-4 py-3 backdrop-blur-md bg-white/80">
          <div className="flex gap-2.5 items-end max-w-3xl mx-auto">
            <Textarea
              placeholder="Describe your symptoms or ask a health question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-white/80 backdrop-blur-sm border-gray-100/50 focus:border-teal-600 focus:ring-teal-600/20 text-gray-900 placeholder:text-gray-500 shadow-sm"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="shrink-0 rounded-2xl h-[44px] w-[44px] bg-amber-500 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-2">
            CareBot provides guidance only and does not replace professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
