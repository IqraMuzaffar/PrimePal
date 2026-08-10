import React, { useState, useRef, useEffect } from "react";

interface Message { role: "patient" | "ai"; content: string; }

const WS_URL = "ws://localhost:8000/ws/chat";

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! I'm TriageBot. How can I help you today? Please describe your symptoms." },
  ]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !wsRef.current) {
      const ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setMessages(prev => [...prev, { role: "ai", content: data.content }]);
      };
      wsRef.current = ws;
    }
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim() || !wsRef.current) return;
    setMessages(prev => [...prev, { role: "patient", content: input }]);
    wsRef.current.send(JSON.stringify({ message: input }));
    setInput("");
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      position: "fixed", bottom: 20, right: 20, width: 60, height: 60, borderRadius: "50%",
      background: "#2563eb", color: "#fff", border: "none", fontSize: 24, cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
    }}>{"\uD83D\uDCAC"}</button>
  );

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, width: 380, height: 520,
      border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff",
      display: "flex", flexDirection: "column", boxShadow: "0 8px 30px rgba(0,0,0,0.15)"
    }}>
      <div style={{ padding: "12px 16px", background: "#2563eb", color: "#fff",
        borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700 }}>TriageBot</span>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18
        }}>{"\u2715"}</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8, display: "flex",
            justifyContent: m.role === "patient" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 12,
              background: m.role === "patient" ? "#2563eb" : "#f3f4f6",
              color: m.role === "patient" ? "#fff" : "#111", fontSize: 14 }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Describe your symptoms..."
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db",
            borderRadius: 8, outline: "none", fontSize: 14 }} />
        <button onClick={send} style={{ padding: "8px 16px", background: "#2563eb",
          color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Send</button>
      </div>
    </div>
  );
}
