"use client";

import PrimePalAvatar from "./PrimePalAvatar";
import { useState } from "react";

/**
 * Avatar Showcase — Development/Testing Component
 *
 * Display all avatar sentiment states side-by-side for visual testing.
 * Remove this component in production.
 */

export function AvatarShowcase() {
  const [selectedSize, setSelectedSize] = useState<"sm" | "md" | "lg">("md");
  const [selectedSentiment, setSelectedSentiment] = useState<"neutral" | "happy" | "encouraging" | "celebratory">("neutral");

  const sentiments = [
    { key: "neutral" as const, label: "Neutral", desc: "Default resting state" },
    { key: "happy" as const, label: "Happy", desc: "Student progressing well" },
    { key: "encouraging" as const, label: "Encouraging", desc: "Student needs support" },
    { key: "celebratory" as const, label: "Celebratory", desc: "Student answered correctly" },
  ];

  const sizes = [
    { key: "sm" as const, label: "Small" },
    { key: "md" as const, label: "Medium" },
    { key: "lg" as const, label: "Large" },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">PrimePal Avatar Showcase</h1>
        <p className="text-slate-600">Dynamic Sentiment & Avatar Empathy — All states and sizes</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-50 rounded-xl p-6 space-y-4 border border-slate-200">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Size</label>
          <div className="flex gap-2">
            {sizes.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedSize(s.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedSize === s.key
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-300 hover:border-slate-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Sentiment</label>
          <div className="flex flex-wrap gap-2">
            {sentiments.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedSentiment(s.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedSentiment === s.key
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-300 hover:border-slate-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Large Selected Avatar */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-12 border border-indigo-200 flex flex-col items-center justify-center min-h-96">
        <div className="mb-6">
          <PrimePalAvatar
            sentiment={selectedSentiment}
            size={selectedSize}
            showSpeechBubble={true}
            speechText={
              selectedSentiment === "neutral"
                ? "Hello! Ready to learn?"
                : selectedSentiment === "happy"
                  ? "You're doing great! 🌟"
                  : selectedSentiment === "encouraging"
                    ? "Take a deep breath, you got this! 💪"
                    : "Amazing! Fantastic work! 🎉"
            }
          />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {sentiments.find((s) => s.key === selectedSentiment)?.label}
          </h2>
          <p className="text-slate-600">
            {sentiments.find((s) => s.key === selectedSentiment)?.desc}
          </p>
        </div>
      </div>

      {/* Grid of All States */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">All States</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {sentiments.map((sentiment) => (
            <div
              key={sentiment.key}
              className="bg-slate-50 rounded-xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedSentiment(sentiment.key)}
            >
              <div className="flex justify-center mb-4 min-h-[140px]">
                <PrimePalAvatar sentiment={sentiment.key} size="md" />
              </div>
              <h3 className="font-semibold text-slate-900 text-center mb-1">{sentiment.label}</h3>
              <p className="text-xs text-slate-600 text-center">{sentiment.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Size Comparison */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Size Comparison</h2>
        <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 space-y-6">
          {sizes.map((s) => (
            <div key={s.key} className="flex items-center gap-8">
              <div className="w-24">
                <p className="font-semibold text-slate-900">{s.label}</p>
              </div>
              <div className="flex gap-12">
                {sentiments.map((sent) => (
                  <div key={sent.key} className="flex flex-col items-center gap-2">
                    <PrimePalAvatar sentiment={sent.key} size={s.key} />
                    <span className="text-xs text-slate-500 text-center">{sent.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
