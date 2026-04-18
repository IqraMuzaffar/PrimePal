"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Props {
  studentName: string;
  currentStyle: string;
  currentColor: string;
  onSave: (style: string, color: string) => void;
  onClose: () => void;
}

const STYLES = [
  { id: "adventurer", label: "Adventurer" },
  { id: "bottts",     label: "Robots" },
  { id: "fun-emoji",  label: "Fun Emoji" },
  { id: "pixel-art",  label: "Pixel Art" },
  { id: "lorelei",    label: "Lorelei" },
];

const COLORS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#f43f5e", label: "Rose" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#ec4899", label: "Pink" },
];

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export default function AvatarCustomizeModal({
  studentName,
  currentStyle,
  currentColor,
  onSave,
  onClose,
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("primepal_student_token")
        : null;
    try {
      await apiFetch("/auth/student/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({
          avatar_style: selectedStyle,
          theme_color: selectedColor,
        }),
      });
      // Update cached avatar URL in localStorage
      const newAvatarUrl = dicebearUrl(selectedStyle, studentName);
      if (typeof window !== "undefined") {
        localStorage.setItem("primepal_student_avatar", newAvatarUrl);
      }
      onSave(selectedStyle, selectedColor);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800">Edit Character</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Live preview */}
        <div className="flex justify-center">
          <div
            className="w-24 h-24 rounded-full ring-4 ring-offset-2 overflow-hidden bg-slate-50 transition-all duration-300"
            style={{ ringColor: selectedColor }}
          >
            <Image
              src={dicebearUrl(selectedStyle, studentName)}
              alt="Avatar preview"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Style picker */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Avatar Style
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={[
                  "flex flex-col items-center gap-1 p-2 rounded-xl shrink-0 border-2 transition-all duration-150",
                  selectedStyle === s.id
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300"
                    : "border-slate-200 bg-white hover:border-slate-300",
                ].join(" ")}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100">
                  <Image
                    src={dicebearUrl(s.id, studentName)}
                    alt={s.label}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Profile Color
          </p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex)}
                className={[
                  "w-9 h-9 rounded-full border-2 transition-all duration-150",
                  selectedColor === c.hex
                    ? "border-slate-700 ring-4 ring-offset-2 ring-slate-400 scale-110"
                    : "border-white shadow-sm hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: c.hex }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
            😬 {error}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white font-extrabold text-lg py-4 rounded-2xl
                     shadow-[0_4px_0_#3730a3] hover:brightness-110
                     active:translate-y-1 active:shadow-none
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0
                     transition-all duration-100"
        >
          {saving ? "Saving…" : "Save Character ✓"}
        </button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
