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
  const [error, setError] = useState("");

  const loading = statusLoading || (!!evalType && questionsLoading);

  // Redirect if not logged in
  useEffect(() => {
    if (!getToken()) {
      router.push("/student/play");
    }
  }, [router]);

  // Determine eval type from status
  useEffect(() => {
    if (!evalStatus) return;
    if (evalStatus.needs_pre_test) {
      setEvalType("pre");
    } else if (evalStatus.needs_post_test) {
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
      await studentMutate("/evaluations/submit", {
        evaluation_type: evalType,
        answers: Array.from(answers.values()),
      });
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [evalType, answers]);

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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Thank you!</h2>
          <p className="text-slate-600 mb-6">
            You have completed the{" "}
            {evalType === "pre" ? "pre" : "post"}-test evaluation. Great job!
          </p>
          <button
            onClick={() => router.push("/student/missions")}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold
                       shadow-[0_4px_0_#3730a3] hover:brightness-110
                       active:translate-y-[4px] active:shadow-none
                       transition-all duration-100"
          >
            Continue to Missions
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isLikert = currentQuestion.task_type === "likert_emoji";
  const options: Option[] = currentQuestion.options ?? [];
  const selectedAnswer = answers.get(currentQuestion.id);
  const isLastQuestion = currentIdx === questions.length - 1;
  const allAnswered = questions.every((q) => answers.has(q.id));

  return (
    <div className="max-w-lg mx-auto py-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {evalType === "pre" ? "Pre" : "Post"}-Test Evaluation
          </span>
          <span className="text-xs font-bold text-indigo-600">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIdx + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        {/* Section badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              currentQuestion.section === "psychometric"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {currentQuestion.section === "psychometric"
              ? "How You Feel"
              : currentQuestion.pillar
              ? currentQuestion.pillar.charAt(0).toUpperCase() +
                currentQuestion.pillar.slice(1)
              : "Academic"}
          </span>
        </div>

        {/* Question text */}
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          {currentQuestion.question_text}
        </h2>
        {currentQuestion.question_text_ur && (
          <p className="text-sm text-slate-500 mb-4 text-right" dir="rtl">
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
        <div className={`mt-4 ${isLikert ? "flex justify-center gap-6" : "space-y-3"}`}>
          {options.map((opt) => {
            const isSelected = selectedAnswer?.student_answer === opt.value;

            if (isLikert) {
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
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 min-w-[90px] ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 shadow-md scale-105"
                      : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  <span className="text-4xl">{opt.emoji}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {opt.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={opt.value}
                onClick={() => selectAnswer(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
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
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white
                       shadow-[0_3px_0_#047857] hover:brightness-110
                       active:translate-y-[3px] active:shadow-none
                       transition-all duration-100
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0"
          >
            {submitting ? "Submitting..." : "Finish"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!selectedAnswer}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white
                       shadow-[0_3px_0_#3730a3] hover:brightness-110
                       active:translate-y-[3px] active:shadow-none
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
