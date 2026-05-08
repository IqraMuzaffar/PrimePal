"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  role: "student" | "tutor";
  text: string;
  urduText?: string;
}

const CHAT_STORAGE_KEY = "primepal_chat_messages";
const CHAT_NEXTID_KEY = "primepal_chat_nextid";

export default function ChatPage() {
  const [studentName, setStudentName] = useState<string>("there");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "thinking" | "streaming">("idle");
  const [showUrdu, setShowUrdu] = useState<Set<number>>(new Set());
  const [loadingUrdu, setLoadingUrdu] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);

  // Restore chat history from sessionStorage on mount
  useEffect(() => {
    const name = localStorage.getItem("primepal_student_name");
    const displayName = name && name.trim() ? name.trim() : "there";
    setStudentName(displayName);

    const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const savedNextId = sessionStorage.getItem(CHAT_NEXTID_KEY);

    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
          nextId.current = savedNextId ? parseInt(savedNextId, 10) : parsed[parsed.length - 1].id + 1;
          return;
        }
      } catch {
        // Corrupted data — fall through to default
      }
    }

    // No saved history — show welcome message
    setMessages([
      {
        id: nextId.current++,
        role: "tutor",
        text: `Hi ${displayName}! I'm PrimePal 🌟 Ask me anything about English!`,
      },
    ]);
  }, []);

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      sessionStorage.setItem(CHAT_NEXTID_KEY, String(nextId.current));
    }
  }, [messages]);

  useEffect(() => {
    if (phase === "streaming") {
      const frame = requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, phase]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 3 + 16;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || phase !== "idle") return;

    const studentMsg: Message = { id: nextId.current++, role: "student", text };
    setMessages((prev) => [...prev, studentMsg]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setPhase("thinking");

    const tutorMsgId = nextId.current++;

    const BASE_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const token = localStorage.getItem("primepal_student_token");

    // Build history from recent messages (last 10, excluding the just-added student msg)
    const recentMessages = messages.slice(-10);
    const history = recentMessages.map((m) => ({
      role: m.role === "student" ? "student" : "tutor",
      content: m.text,
    }));

    try {
      const response = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lastNewline = buffer.lastIndexOf("\n");
        if (lastNewline === -1) continue;

        const complete = buffer.slice(0, lastNewline);
        buffer = buffer.slice(lastNewline + 1);

        const lines = complete
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              setPhase("streaming");
              setMessages((prev) => {
                const existing = prev.find((msg) => msg.id === tutorMsgId);
                if (existing) {
                  // Update existing message
                  return prev.map((msg) =>
                    msg.id === tutorMsgId
                      ? { ...msg, text: msg.text + data.content }
                      : msg
                  );
                } else {
                  // Create new tutor message on first token
                  return [...prev, { id: tutorMsgId, role: "tutor", text: data.content }];
                }
              });
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tutorMsgId
                    ? { ...msg, text: data.content }
                    : msg
                )
              );
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tutorMsgId && msg.text === ""
            ? { ...msg, text: "Oops! Something went wrong 😅 Try again!" }
            : msg
        )
      );
    } finally {
      setPhase("idle");
    }
  }

  async function fetchUrdu(msgId: number, text: string) {
    // If already loaded, just toggle
    const msg = messages.find((m) => m.id === msgId);
    if (msg?.urduText) {
      setShowUrdu((prev) => {
        const next = new Set(prev);
        if (next.has(msgId)) next.delete(msgId);
        else next.add(msgId);
        return next;
      });
      return;
    }

    setLoadingUrdu((prev) => new Set(prev).add(msgId));

    const BASE_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const token = localStorage.getItem("primepal_student_token");

    try {
      const resp = await fetch(`${BASE_URL}/chat/urdu`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!resp.ok) throw new Error("Translation failed");
      const data = await resp.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, urduText: data.urdu } : m
        )
      );
      setShowUrdu((prev) => new Set(prev).add(msgId));
    } catch {
      // silently fail
    } finally {
      setLoadingUrdu((prev) => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] sm:h-[calc(100vh-88px)] bg-student-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white border-b border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-card-pink flex items-center justify-center text-2xl shadow-[0_4px_12px_rgba(236,72,153,0.25)]">
          🌟
        </div>
        <div>
          <p className="font-baloo font-extrabold text-lg text-slate-900">PrimePal</p>
          <p className="font-nunito font-semibold text-xs text-slate-500">Your English Tutor</p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 flex flex-col">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "student" ? "items-end" : "items-start"
            }`}
          >
            {/* Avatar + label */}
            <div className={`flex items-center gap-1.5 mb-1 px-1 ${msg.role === "student" ? "flex-row-reverse" : ""}`}>
              {msg.role === "tutor" ? (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold">
                  P
                </div>
              ) : null}
              <span className="text-xs text-gray-400">
                {msg.role === "tutor" ? "PrimePal" : studentName}
              </span>
            </div>

            {/* Bubble */}
            <div
              className={
                msg.role === "tutor"
                  ? "bg-white border border-violet-100 text-slate-900 rounded-3xl rounded-tl-md px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] max-w-[85%] self-start text-sm sm:text-base font-nunito font-semibold leading-relaxed"
                  : "bg-gradient-to-br from-pink-200 to-pink-300 text-pink-950 rounded-3xl rounded-tr-md px-4 py-3 max-w-[85%] self-end text-sm sm:text-base font-nunito font-semibold leading-relaxed"
              }
            >
              {msg.role === "tutor" ? (
                showUrdu.has(msg.id) && msg.urduText ? (
                  <p className="text-right font-urdu leading-loose text-lg" dir="rtl">
                    {msg.urduText}
                  </p>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => (
                        <strong className="text-orange-600 font-bold">{children}</strong>
                      ),
                      ul: ({ children }) => <ul className="list-none space-y-0.5 my-1">{children}</ul>,
                      li: ({ children }) => <li className="flex gap-1">{children}</li>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )
              ) : (
                msg.text
              )}
            </div>

            {/* Action buttons for tutor messages */}
            {msg.role === "tutor" && msg.text && (
              <div className="flex gap-2 mt-1 ml-1">
                <motion.button
                  onClick={() => fetchUrdu(msg.id, msg.text)}
                  disabled={loadingUrdu.has(msg.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50"
                >
                  {loadingUrdu.has(msg.id)
                    ? "⏳ Translating…"
                    : showUrdu.has(msg.id)
                    ? "🔄 Original"
                    : "اردو"}
                </motion.button>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {phase === "thinking" && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold">
                P
              </div>
              <span className="text-xs text-gray-400">PrimePal is thinking...</span>
            </div>
            <div className="bg-white border-2 border-yellow-200 rounded-2xl rounded-tl-sm shadow-sm self-start">
              <div className="flex gap-1 items-center px-4 py-3">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 sm:px-6 py-4 bg-white border-t border-slate-100 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={phase !== "idle"}
          placeholder="Ask me anything in English or Roman Urdu!"
          className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm sm:text-base focus:outline-none focus:border-pink-400 disabled:opacity-50 transition-all leading-6"
          style={{ minHeight: "40px", maxHeight: "88px" }}
          aria-label="Chat message input"
        />
        <motion.button
          onClick={sendMessage}
          disabled={phase !== "idle" || input.trim().length === 0}
          whileHover={phase === "idle" && input.trim().length > 0 ? { scale: 1.05 } : undefined}
          whileTap={phase === "idle" && input.trim().length > 0 ? { scale: 0.95 } : undefined}
          className="rounded-2xl bg-card-pink text-white px-5 py-3 font-baloo font-extrabold shadow-[0_6px_14px_rgba(219,39,119,0.25)] disabled:opacity-50 transition-all whitespace-nowrap"
          aria-label="Send message"
        >
          {phase !== "idle" ? (
            <span className="flex items-center gap-1">
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Sending…
            </span>
          ) : (
            "Send 🚀"
          )}
        </motion.button>
      </div>
    </div>
  );
}
