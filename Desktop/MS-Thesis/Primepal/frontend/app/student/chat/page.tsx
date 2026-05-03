"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";

interface Message {
  id: number;
  role: "student" | "tutor";
  text: string;
  englishReply?: string;  // only present on tutor messages
}

export default function ChatPage() {
  const [studentName, setStudentName] = useState<string>("there");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEnglish, setShowEnglish] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);

  // Read student name from localStorage and seed welcome message
  useEffect(() => {
    const name = localStorage.getItem("primepal_student_name");
    const displayName = name && name.trim() ? name.trim() : "there";
    setStudentName(displayName);
    setMessages([
      {
        id: nextId.current++,
        role: "tutor",
        text: `Hi ${displayName}! I'm PrimePal 🌟 Ask me anything about English!`,
      },
    ]);
  }, []);

  // Auto-scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea up to 3 rows
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    const lineHeight = 24; // ~text-base line-height
    const maxHeight = lineHeight * 3 + 16; // 3 rows + padding
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    // Add student message immediately
    const studentMsg: Message = { id: nextId.current++, role: "student", text };
    setMessages((prev) => [...prev, studentMsg]);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setLoading(true);

    // Add empty tutor message that will be filled token by token
    const tutorMsgId = nextId.current++;
    setMessages((prev) => [
      ...prev,
      { id: tutorMsgId, role: "tutor", text: "" },
    ]);

    const BASE_URL =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const token = localStorage.getItem("primepal_student_token");

    try {
      const response = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Only process complete lines (ending with \n)
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
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tutorMsgId
                    ? { ...msg, text: msg.text + data.content }
                    : msg
                )
              );
            }
          } catch {
            // Skip malformed JSON chunks gracefully
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
      setLoading(false);
    }
  }

  function toggleEnglish(id: number) {
    setShowEnglish((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-yellow-50">
      {/* Page title row */}
      <div className="py-3 px-4 border-b border-yellow-200 flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <span className="text-lg font-bold text-gray-700">Chat with PrimePal</span>
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
            {/* Label */}
            <span className="text-xs text-gray-400 mb-1 px-1">
              {msg.role === "tutor" ? "PrimePal 🤖" : studentName}
            </span>

            {/* Bubble */}
            <div
              className={
                msg.role === "tutor"
                  ? "bg-white border-2 border-yellow-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] self-start shadow-sm text-base leading-relaxed text-gray-800"
                  : "bg-orange-400 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] self-end shadow-sm text-base leading-relaxed"
              }
            >
              {showEnglish.has(msg.id) && msg.englishReply ? msg.englishReply : msg.text}
            </div>

            {/* English toggle button — only for tutor messages with englishReply */}
            {msg.role === "tutor" && msg.englishReply && (
              <motion.button
                onClick={() => toggleEnglish(msg.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-xs text-gray-400 hover:text-orange-500 mt-1 ml-1 transition-colors"
                aria-label={showEnglish.has(msg.id) ? "Switch to bilingual mode" : "Switch to English only"}
              >
                {showEnglish.has(msg.id) ? "🔄 Bilingual" : "🇬🇧 English only"}
              </motion.button>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex flex-col items-start">
            <span className="text-xs text-gray-400 mb-1 px-1">PrimePal 🤖</span>
            <div className="bg-white border-2 border-yellow-200 rounded-2xl rounded-tl-sm shadow-sm self-start">
              <div className="flex gap-1 items-center px-4 py-3">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-yellow-200 bg-white px-4 py-3 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask me anything in English or Roman Urdu!"
          className="flex-1 resize-none rounded-2xl border-2 border-yellow-300 px-4 py-2 text-base focus:outline-none focus:border-orange-400 disabled:opacity-50 transition-all leading-6"
          style={{ minHeight: "40px", maxHeight: "88px" }}
          aria-label="Chat message input"
        />
        <motion.button
          onClick={sendMessage}
          disabled={loading || input.trim().length === 0}
          whileHover={!loading && input.trim().length > 0 ? { scale: 1.05 } : undefined}
          whileTap={!loading && input.trim().length > 0 ? { scale: 0.95 } : undefined}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2 rounded-2xl disabled:opacity-50 transition-all whitespace-nowrap"
          aria-label="Send message"
        >
          {loading ? (
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
