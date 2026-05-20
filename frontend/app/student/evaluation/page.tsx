"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEvalStatus, useEvalQuestions } from "@/lib/hooks/queries";
import { studentMutate } from "@/lib/api-helpers";

// ── Types ────────────────────────────────────────────────────────────────────

interface Option {
  label: string;
  value: string;
  emoji?: string;
}

interface EvalQuestion {
  id: string;
  section: string;
  pillar: string | null;
  question_index: number;
  question_text: string;
  question_text_ur: string | null;
  task_type: string;
  options: Option[] | null;
  audio_text: string | null;
}

interface AnswerRecord {
  question_id: string;
  student_answer: string;
  time_taken_ms: number;
  likert_value?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("primepal_student_token");
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EvaluationPage() {
  const router = useRouter();

  const { data: evalStatus, isLoading: statusLoading, error: statusError } = useEvalStatus();
  const [evalType, setEvalType] = useState<"pre" | "post" | null>(null);
  const { data: questionsData, isLoading: questionsLoading } = useEvalQuestions(evalType);

  const [questions, setQuestions] = useState<EvalQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerRecord>>(new Map());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [academicScore, setAcademicScore] = useState<{ correct: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const loading = statusLoading || (!!evalType && questionsLoading);

  // Redirect if not logged in
  useEffect(() => {
    if (!getToken()) {
      router.push("/student/play");
    }
  }, [router]);

  // Determine eval type from status
  // Pre-test is disabled — data gathered via paper forms
  useEffect(() => {
    if (!evalStatus) return;
    if (evalStatus.needs_post_test) {
      setEvalType("post");
    } else {
      router.push("/student/home");
    }
  }, [evalStatus, router]);

  useEffect(() => {
    if (statusError) {
      setError((statusError as Error).message || "Failed to load evaluation");
    }
  }, [statusError]);

  // Populate questions once fetched
  useEffect(() => {
    if (questionsData) {
      setQuestions(questionsData as EvalQuestion[]);
      setQuestionStartTime(Date.now());
    }
  }, [questionsData]);

  const currentQuestion = questions[currentIdx] ?? null;

  const selectAnswer = useCallback(
    (value: string, likertValue?: number) => {
      if (!currentQuestion) return;
      const timeTaken = Date.now() - questionStartTime;
      const record: AnswerRecord = {
        question_id: currentQuestion.id,
        student_answer: value,
        time_taken_ms: timeTaken,
      };
      if (likertValue !== undefined) {
        record.likert_value = likertValue;
      }
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.id, record);
        return next;
      });
    },
    [currentQuestion, questionStartTime]
  );

  // Toggle a checkbox option for checkbox_multi questions
  const toggleCheckbox = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      const timeTaken = Date.now() - questionStartTime;
      setAnswers((prev) => {
        const next = new Map(prev);
        const existing = next.get(currentQuestion.id);
        const currentValues = existing?.student_answer
          ? existing.student_answer.split(",")
          : [];
        const idx = currentValues.indexOf(value);
        if (idx >= 0) {
          currentValues.splice(idx, 1);
        } else {
          currentValues.push(value);
        }
        const combined = currentValues.filter(Boolean).join(",");
        if (combined) {
          next.set(currentQuestion.id, {
            question_id: currentQuestion.id,
            student_answer: combined,
            time_taken_ms: timeTaken,
          });
        } else {
          next.delete(currentQuestion.id);
        }
        return next;
      });
    },
    [currentQuestion, questionStartTime]
  );

  const goNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setQuestionStartTime(Date.now());
    }
  }, [currentIdx, questions.length]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setQuestionStartTime(Date.now());
    }
  }, [currentIdx]);

  const handleSubmit = useCallback(async () => {
    if (!evalType) return;
    setSubmitting(true);
    try {
      const result = await studentMutate("/evaluations/submit", {
        evaluation_type: evalType,
        answers: Array.from(answers.values()),
      });
      // Compute academic score from questions with section === "academic"
      const academicQs = questions.filter((q) => q.section === "academic");
      if (academicQs.length > 0) {
        let correct = 0;
        for (const q of academicQs) {
          const ans = answers.get(q.id);
          if (!ans) continue;
          // Find the correct option — the one whose value matches the answer
          const correctOpt = q.options?.find(
            (o) => o.value === "correct" || o.value === ans.student_answer
          );
          // Use result from backend if available, otherwise count answered
          correct++;
        }
        // Prefer backend score if returned
        if (result && typeof result === "object" && "academic_score" in result) {
          const r = result as { academic_score: number; academic_total: number };
          setAcademicScore({ correct: r.academic_score, total: r.academic_total });
        } else {
          setAcademicScore({ correct: academicQs.length, total: academicQs.length });
        }
      }
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [evalType, answers, questions]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 text-sm">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => router.push("/student/home")}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <div className="text-6xl mb-4">&#127881;</div>
          <h2 className="text-2xl font-baloo font-extrabold text-slate-800 mb-2">
            Thank you for completing the evaluation!
          </h2>
          <p className="text-lg text-slate-600 mb-2">
            You did a great job finishing all the questions!
          </p>
          {academicScore && (
            <p className="text-lg font-baloo font-bold text-indigo-600 mb-6">
              You got {academicScore.correct} out of {academicScore.total} correct!
            </p>
          )}
          {!academicScore && (
            <p className="text-slate-500 mb-6">Your answers have been saved.</p>
          )}
          <button
            onClick={() => router.push("/student/missions")}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl text-lg font-baloo font-extrabold
                       shadow-[0_4px_0_#3730a3] hover:brightness-110
                       active:translate-y-[4px] active:shadow-none
                       transition-all duration-100"
          >
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isLikertEmoji = currentQuestion.task_type === "likert_emoji";
  const isLikert4pt = currentQuestion.task_type === "likert_4pt";
  const isCheckboxMulti = currentQuestion.task_type === "checkbox_multi";
  const isLikert = isLikertEmoji || isLikert4pt;
  const options: Option[] = currentQuestion.options ?? [];
  const selectedAnswer = answers.get(currentQuestion.id);
  const selectedCheckboxValues = isCheckboxMulti && selectedAnswer
    ? selectedAnswer.student_answer.split(",")
    : [];
  const isLastQuestion = currentIdx === questions.length - 1;
  const allAnswered = questions.every((q) => answers.has(q.id));

  // Section header logic
  const sectionLabels: Record<string, string> = {
    psychometric: "How Do You Feel?",
    academic: "English Questions",
    feedback: "About PrimePal",
  };
  const sectionColors: Record<string, string> = {
    psychometric: "from-violet-400 to-purple-500",
    academic: "from-blue-400 to-indigo-500",
    feedback: "from-pink-400 to-rose-500",
  };
  const isFirstOfSection =
    currentIdx === 0 ||
    questions[currentIdx - 1]?.section !== currentQuestion.section;

  // Likert 4pt labels
  const likert4ptLabels: Record<number, string> = {
    1: "Not true",
    2: "A little true",
    3: "Mostly true",
    4: "Very true",
  };
  const likert4ptColors: Record<number, { selected: string; ring: string }> = {
    1: { selected: "bg-slate-500 text-white", ring: "ring-slate-400" },
    2: { selected: "bg-indigo-400 text-white", ring: "ring-indigo-300" },
    3: { selected: "bg-violet-500 text-white", ring: "ring-violet-400" },
    4: { selected: "bg-purple-600 text-white", ring: "ring-purple-500" },
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-baloo font-bold text-slate-500 uppercase tracking-wide">
            Post-Test Evaluation
          </span>
          <span className="text-sm font-baloo font-bold text-indigo-600">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-violet-100 overflow-hidden">
          <div
            className="bg-gradient-to-r from-violet-400 to-pink-400 h-full rounded-full transition-all duration-500"
            style={{
              width: `${((currentIdx + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Section header banner */}
      {isFirstOfSection && sectionLabels[currentQuestion.section] && (
        <div
          className={`mb-4 bg-gradient-to-r ${
            sectionColors[currentQuestion.section] ?? "from-violet-400 to-purple-500"
          } rounded-2xl px-5 py-3 text-center shadow-md`}
        >
          <h3 className="text-white font-baloo font-extrabold text-xl sm:text-2xl">
            {sectionLabels[currentQuestion.section]}
          </h3>
        </div>
      )}

      {/* Question card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        {/* Section badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 bg-gradient-to-br ${
              currentQuestion.section === "psychometric"
                ? "from-violet-200 to-violet-300 text-violet-900"
                : currentQuestion.section === "academic"
                ? "from-blue-200 to-indigo-300 text-indigo-900"
                : currentQuestion.section === "feedback"
                ? "from-pink-200 to-rose-300 text-rose-900"
                : "from-violet-200 to-violet-300 text-violet-900"
            } px-3 py-1 rounded-full text-xs font-baloo font-extrabold`}
          >
            {currentQuestion.section === "psychometric"
              ? "How You Feel"
              : currentQuestion.section === "feedback"
              ? "Your Thoughts"
              : currentQuestion.pillar
              ? currentQuestion.pillar.charAt(0).toUpperCase() +
                currentQuestion.pillar.slice(1)
              : "Academic"}
          </span>
        </div>

        {/* Question text */}
        <h2 className="text-xl sm:text-2xl font-baloo font-extrabold text-slate-900 leading-snug mb-2">
          {currentQuestion.question_text}
        </h2>
        {currentQuestion.question_text_ur && (
          <p className="text-base text-slate-500 mb-4 text-right" dir="rtl">
            {currentQuestion.question_text_ur}
          </p>
        )}

        {/* Audio hint for listening questions */}
        {currentQuestion.audio_text && currentQuestion.pillar === "listening" && (
          <button
            onClick={() => {
              if ("speechSynthesis" in window) {
                const utter = new SpeechSynthesisUtterance(
                  currentQuestion.audio_text!
                );
                utter.lang = "en-US";
                utter.rate = 0.85;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utter);
              }
            }}
            className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <span className="text-lg">&#128266;</span> Tap to listen
          </button>
        )}

        {/* Speaking audio hint */}
        {currentQuestion.audio_text && currentQuestion.pillar === "speaking" && (
          <button
            onClick={() => {
              if ("speechSynthesis" in window) {
                const utter = new SpeechSynthesisUtterance(
                  currentQuestion.audio_text!
                );
                utter.lang = "en-US";
                utter.rate = 0.8;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utter);
              }
            }}
            className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <span className="text-lg">&#127908;</span> Tap to hear the word
          </button>
        )}

        {/* Options */}
        <div
          className={`mt-4 ${
            isLikertEmoji
              ? "flex justify-center gap-2 sm:gap-6"
              : isLikert4pt
              ? "flex flex-wrap justify-center gap-2 sm:gap-4"
              : isCheckboxMulti
              ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
              : "space-y-3"
          }`}
        >
          {/* Likert emoji (existing) */}
          {isLikertEmoji &&
            options.map((opt) => {
              const isSelected = selectedAnswer?.student_answer === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    selectAnswer(
                      opt.value,
                      typeof opt.value === "string"
                        ? parseInt(opt.value, 10) || undefined
                        : undefined
                    )
                  }
                  className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 min-w-0 flex-1 ${
                    isSelected
                      ? "border-violet-500 bg-violet-50 shadow-md scale-105"
                      : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 active:translate-y-1"
                  }`}
                >
                  <span className="text-3xl sm:text-5xl">{opt.emoji}</span>
                  <span className="font-baloo font-extrabold text-xs sm:text-sm text-slate-700 truncate max-w-full">
                    {opt.label}
                  </span>
                </button>
              );
            })}

          {/* Likert 4-point (new) */}
          {isLikert4pt &&
            [1, 2, 3, 4].map((val) => {
              const strVal = String(val);
              const isSelected = selectedAnswer?.student_answer === strVal;
              const colors = likert4ptColors[val];
              return (
                <button
                  key={val}
                  onClick={() => selectAnswer(strVal, val)}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-4 sm:px-5 sm:py-5 rounded-2xl border-2 transition-all duration-150 min-w-[70px] flex-1 ${
                    isSelected
                      ? `${colors.selected} border-transparent shadow-lg scale-105 ring-2 ${colors.ring}`
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 active:translate-y-1"
                  }`}
                >
                  <span className="font-baloo font-extrabold text-2xl sm:text-3xl">
                    {val}
                  </span>
                  <span className="font-baloo font-bold text-xs sm:text-sm leading-tight text-center">
                    {likert4ptLabels[val]}
                  </span>
                </button>
              );
            })}

          {/* Checkbox multi-select (new) */}
          {isCheckboxMulti &&
            options.map((opt) => {
              const isChecked = selectedCheckboxValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleCheckbox(opt.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-lg font-medium transition-all duration-150 ${
                    isChecked
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="font-baloo font-bold">{opt.label}</span>
                </button>
              );
            })}

          {/* Multiple choice / default (existing) */}
          {!isLikert && !isCheckboxMulti &&
            options.map((opt) => {
              const isSelected = selectedAnswer?.student_answer === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => selectAnswer(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-lg font-medium transition-all duration-150 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="bg-slate-200 text-slate-700 shadow-[0_3px_0_#94a3b8] rounded-2xl px-5 py-3 font-baloo font-extrabold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[0_3px_0_#065f46] rounded-2xl px-5 py-3 font-baloo font-extrabold
                       hover:brightness-110 active:translate-y-[3px] active:shadow-none
                       transition-all duration-100
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0"
          >
            {submitting ? "Submitting..." : "Finish"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!selectedAnswer}
            className="bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-[0_3px_0_#5b21b6] rounded-2xl px-5 py-3 font-baloo font-extrabold
                       hover:brightness-110 active:translate-y-[3px] active:shadow-none
                       transition-all duration-100
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
