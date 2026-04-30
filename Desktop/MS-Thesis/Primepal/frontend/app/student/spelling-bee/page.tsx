"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Volume2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

interface SpellingWord {
  word: string;
  emoji: string;
}

interface WordsResponse {
  words: SpellingWord[];
  topic: string;
  week_number: number;
}

type GameState = "loading" | "playing" | "result" | "finished";

export default function SpellingBeePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("loading");
  const [words, setWords] = useState<SpellingWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [attemptCount, setAttemptCount] = useState(1);
  const [resultMessage, setResultMessage] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [score, setScore] = useState({ correct: 0, totalPoints: 0 });
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [_weekNumber, setWeekNumber] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Get token from localStorage
  function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("primepal_student_token");
  }

  // Fetch words on mount
  useEffect(() => {
    fetchWords();
  }, []);

  async function fetchWords() {
    try {
      setGameState("loading");
      const token = getToken();
      if (!token) {
        router.push("/student/play");
        return;
      }

      const data = await apiFetch<WordsResponse>("/spelling-bee/words", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWords(data.words);
      setTopic(data.topic);
      setWeekNumber(data.week_number);
      setGameState("playing");
      setCurrentWordIndex(0);
      setUserInput("");
      setAttemptCount(1);

      // Auto-play first word
      setTimeout(() => speakWord(data.words[0].word), 500);
    } catch (err) {
      console.error("Failed to fetch words:", err);
      setError("Failed to load spelling words. Please try again.");
      setGameState("loading");
    }
  }

  function speakWord(word: string) {
    if (!window.speechSynthesis || isSpeaking) return;

    setIsSpeaking(true);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.8; // Slower for children
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  async function submitSpelling() {
    if (!userInput.trim()) return;

    setIsSubmitting(true);
    try {
      const token = getToken();
      const currentWord = words[currentWordIndex];
      const isCorrect =
        userInput.toLowerCase().trim() === currentWord.word.toLowerCase();

      // Submit to backend
      const response = await apiFetch<{
        points_awarded: number;
        new_total: number;
      }>("/spelling-bee/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          word: currentWord.word,
          student_spelling: userInput,
          correct: isCorrect,
          attempt_number: attemptCount,
        }),
      });

      const pointsAwarded = response.points_awarded;

      // Update score
      setScore((prev) => ({
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        totalPoints: prev.totalPoints + pointsAwarded,
      }));

      setPointsAwarded(pointsAwarded);

      if (isCorrect) {
        // Correct! Show result and advance
        setResultMessage(
          attemptCount === 1 ? "✅ Perfect! +10 stars" : "✅ Great! +5 stars"
        );
        setGameState("result");
        setTimeout(advanceToNextWord, 2000);
      } else if (attemptCount < 2) {
        // Wrong, but one retry left
        setResultMessage("❌ Not quite. Try again!");
        setUserInput("");
        setAttemptCount(2);
        setGameState("playing");
      } else {
        // Both attempts wrong
        setResultMessage(
          `❌ The correct spelling is: "${currentWord.word}"`
        );
        setGameState("result");
        setTimeout(advanceToNextWord, 3000);
      }
    } catch (err) {
      console.error("Failed to submit spelling:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function advanceToNextWord() {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setUserInput("");
      setAttemptCount(1);
      setGameState("playing");
      setTimeout(() => speakWord(words[currentWordIndex + 1].word), 500);
    } else {
      setGameState("finished");
    }
  }

  // Handle Enter key in input
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isSubmitting) {
      submitSpelling();
    }
  }

  if (gameState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🐝</div>
          <p className="text-gray-600 font-semibold">Loading your words...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 px-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push("/student/home")}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentWordIndex];
  const progress = Math.round(((currentWordIndex + 1) / words.length) * 100);

  if (gameState === "finished") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl border-4 border-amber-300 p-8 max-w-md text-center"
        >
          <div className="text-6xl mb-4">🐝</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Spelling Bee Complete!
          </h1>
          <p className="text-gray-600 mb-6">
            You got <span className="font-bold text-amber-600">{score.correct} / {words.length}</span> words
            correct
          </p>
          <div className="bg-amber-50 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-gray-600 mb-1">Stars earned today</p>
            <p className="text-4xl font-bold text-amber-600">
              {score.totalPoints} ⭐
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setScore({ correct: 0, totalPoints: 0 });
                fetchWords();
              }}
              className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => router.push("/student/home")}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors"
            >
              🏠 Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-yellow-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/student/home")}
            className="flex items-center gap-2 text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🐝 Spelling Bee</h1>
              <p className="text-sm text-white/80">{topic}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/80">Score</p>
              <p className="text-3xl font-bold">{score.totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">
              Word {currentWordIndex + 1} of {words.length}
            </p>
            <p className="text-sm font-semibold text-amber-600">{progress}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-400 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          key={currentWordIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Word display (hidden until revealed) */}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-widest">
              Hear & Spell
            </p>
            <div className="text-6xl font-bold text-gray-300 tracking-widest">
              {currentWord.word
                .split("")
                .map((_, _i) => "_")
                .join(" ")}
            </div>
          </div>

          {/* Emoji hint */}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 mb-2">Hint</p>
            <div className="text-6xl">{currentWord.emoji}</div>
          </div>

          {/* Speak button */}
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => speakWord(currentWord.word)}
              disabled={isSpeaking}
              className={[
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white",
                "transition-all",
                isSpeaking
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
              ].join(" ")}
            >
              <Volume2 size={20} />
              {isSpeaking ? "Listening..." : "🔊 Hear Word"}
            </motion.button>
          </div>

          {/* Input field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {attemptCount === 1 ? "Type the spelling:" : "Try again (last chance!):"}
            </label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={gameState !== "playing" || isSubmitting}
              autoFocus
              placeholder="Type here..."
              className={[
                "w-full px-4 py-3 rounded-xl border-2 text-lg font-semibold",
                "focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all",
                gameState === "playing"
                  ? "border-gray-300 bg-white text-gray-900"
                  : "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed",
              ].join(" ")}
            />
          </div>

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={submitSpelling}
            disabled={!userInput.trim() || isSubmitting || gameState !== "playing"}
            className={[
              "w-full py-3 rounded-xl font-bold text-white text-lg",
              "transition-all",
              userInput.trim() && gameState === "playing"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:from-amber-700 active:to-yellow-700"
                : "bg-gray-300 cursor-not-allowed",
            ].join(" ")}
          >
            {isSubmitting ? "Checking..." : "Check Spelling"}
          </motion.button>

          {/* Result message (shown during result state) */}
          {gameState === "result" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={[
                "p-4 rounded-xl text-center font-semibold text-white",
                resultMessage.includes("Perfect")
                  ? "bg-green-500"
                  : resultMessage.includes("Great")
                  ? "bg-green-500"
                  : "bg-red-500",
              ].join(" ")}
            >
              {resultMessage}
              {pointsAwarded > 0 && (
                <p className="text-sm mt-2">+{pointsAwarded} stars</p>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
