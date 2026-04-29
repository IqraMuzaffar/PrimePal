"use client";

import { useState } from "react";
import { Volume2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface PronunciationWord {
  word: string;
  status: "correct" | "incorrect" | "omitted";
}

interface Props {
  pronunciationData: PronunciationWord[];
  pronunciationScore: number; // 0-100
  feedback: string;
  pointsAwarded: number;
}

export default function SpeakingPronunciationFeedback({
  pronunciationData,
  pronunciationScore,
  feedback,
  pointsAwarded,
}: Props) {
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  const speakWord = async (word: string) => {
    setPlayingWord(word);

    // Use browser's native SpeechSynthesis API
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8; // Slow down for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setPlayingWord(null);
    };

    window.speechSynthesis.cancel(); // Stop any previous speech
    window.speechSynthesis.speak(utterance);
  };

  const getStatusColor = (
    status: "correct" | "incorrect" | "omitted"
  ): string => {
    if (status === "correct") return "bg-emerald-100 text-emerald-700";
    if (status === "omitted") return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const getStatusBorderColor = (
    status: "correct" | "incorrect" | "omitted"
  ): string => {
    if (status === "correct") return "border-emerald-300";
    if (status === "omitted") return "border-orange-300";
    return "border-red-300";
  };

  const correctCount = pronunciationData.filter(
    (p) => p.status === "correct"
  ).length;
  const incorrectCount = pronunciationData.filter(
    (p) => p.status === "incorrect"
  ).length;
  const omittedCount = pronunciationData.filter(
    (p) => p.status === "omitted"
  ).length;

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const wordVariants: any = {
    hidden: { opacity: 0, y: 10, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border-2 p-6 ${
          pronunciationScore >= 70
            ? "bg-emerald-50 border-emerald-200"
            : pronunciationScore >= 50
            ? "bg-amber-50 border-amber-200"
            : "bg-rose-50 border-rose-200"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Pronunciation Score
            </p>
            <p
              className={`text-4xl font-bold ${
                pronunciationScore >= 70
                  ? "text-emerald-600"
                  : pronunciationScore >= 50
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {pronunciationScore}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pronunciationScore >= 70 && (
              <>
                <Zap className="w-6 h-6 text-emerald-600 fill-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-200 px-2 py-1 rounded-full">
                  +{pointsAwarded} points
                </span>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-700 font-medium italic">{feedback}</p>

        {/* Word Count Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-lg p-2">
            <p className="text-2xl font-bold text-emerald-600">{correctCount}</p>
            <p className="text-xs text-gray-500">Correct</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="text-2xl font-bold text-red-600">{incorrectCount}</p>
            <p className="text-xs text-gray-500">Mispronounced</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="text-2xl font-bold text-orange-600">{omittedCount}</p>
            <p className="text-xs text-gray-500">Omitted</p>
          </div>
        </div>
      </motion.div>

      {/* Word-Level Breakdown */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Word-by-Word Feedback
        </p>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2"
        >
          {pronunciationData.map((item, idx) => (
            <motion.div
              key={`${item.word}-${idx}`}
              variants={wordVariants}
              className="relative group"
            >
              <button
                className={`px-3 py-2 rounded-lg font-medium text-sm border-2 transition-all ${getStatusColor(
                  item.status
                )} ${getStatusBorderColor(item.status)}`}
              >
                {item.word}
              </button>

              {/* Status icon on top-right */}
              {item.status === "correct" && (
                <CheckCircle className="absolute -top-2 -right-2 w-5 h-5 text-emerald-600 bg-white rounded-full" />
              )}
              {item.status === "incorrect" && (
                <AlertCircle className="absolute -top-2 -right-2 w-5 h-5 text-red-600 bg-white rounded-full" />
              )}
              {item.status === "omitted" && (
                <AlertCircle className="absolute -top-2 -right-2 w-5 h-5 text-orange-600 bg-white rounded-full" />
              )}

              {/* Listen button for incorrect/omitted words */}
              {(item.status === "incorrect" || item.status === "omitted") && (
                <button
                  onClick={() => speakWord(item.word)}
                  disabled={playingWord === item.word}
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50 disabled:opacity-60"
                  title={`Listen to correct pronunciation of "${item.word}"`}
                >
                  <Volume2
                    className={`w-4 h-4 ${
                      playingWord === item.word
                        ? "text-indigo-600 animate-pulse"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-600">Correct</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Incorrect</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-600">Omitted</span>
        </div>
      </div>

      {/* Hint for learners */}
      {pronunciationData.some(
        (p) => p.status === "incorrect" || p.status === "omitted"
      ) && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200"
        >
          💡 Hover over any mispronounced word to hear the correct pronunciation.
          Then try saying it again!
        </motion.p>
      )}
    </div>
  );
}
