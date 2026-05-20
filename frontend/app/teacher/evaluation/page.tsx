"use client";

import React, { useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useSubmitTeacherEvaluation } from "@/lib/hooks/teacher-queries";

// ── Types ────────────────────────────────────────────────────────────────────

type Timepoint = "pre" | "post";
type GroupType = "treatment" | "control";

interface FormData {
  timepoint: Timepoint;
  group_type: GroupType;
  // Section 1: Teacher Background
  teacher_name: string;
  teacher_email: string;
  gender: string;
  qualification: string;
  years_teaching_primary: string;
  grades_taught: number[];
  received_snc_training: boolean | null;
  received_ai_training: boolean | null;
  // Section 2: Classroom Context
  avg_class_size: string;
  student_home_device_access: string;
  internet_stability: string;
  main_constraints: string[];
  // Section 3: Student English Skills (Likert 1-5)
  listening_speaking_ability: number | null;
  reading_writing_ability: number | null;
  vocabulary_sentence_formation: number | null;
  overall_english_confidence: number | null;
  // Section 4: Student Learning Readiness (Likert 1-5)
  students_hesitate_english: number | null;
  students_fear_mistakes: number | null;
  students_avoid_english: number | null;
  urdu_english_support_helps: number | null;
  // Section 5: Pedagogical Visibility (Likert 1-5)
  can_identify_weaknesses: number | null;
  enough_info_personalize: number | null;
  can_monitor_beyond_classroom: number | null;
  // Section 6: Teaching Confidence (Likert 1-5)
  can_explain_concepts: number | null;
  can_design_mixed_activities: number | null;
  can_create_safe_environment: number | null;
  // Section 7: PrimePal Usefulness (post-only, Likert 1-5)
  approach_improves_learning: number | null;
  approach_helps_notice_weaknesses: number | null;
  home_use_realistic: number | null;
  // Section 8: PrimePal Impact Assessment (post-only)
  primepal_helped_improve: number | null;
  primepal_helped_identify: number | null;
  would_recommend: number | null;
  most_valuable_aspects: string[];
  improvements_suggested: string[];
}

const INITIAL_FORM: FormData = {
  timepoint: "pre",
  group_type: "treatment",
  teacher_name: "",
  teacher_email: "",
  gender: "",
  qualification: "",
  years_teaching_primary: "",
  grades_taught: [],
  received_snc_training: null,
  received_ai_training: null,
  avg_class_size: "",
  student_home_device_access: "",
  internet_stability: "",
  main_constraints: [],
  listening_speaking_ability: null,
  reading_writing_ability: null,
  vocabulary_sentence_formation: null,
  overall_english_confidence: null,
  students_hesitate_english: null,
  students_fear_mistakes: null,
  students_avoid_english: null,
  urdu_english_support_helps: null,
  can_identify_weaknesses: null,
  enough_info_personalize: null,
  can_monitor_beyond_classroom: null,
  can_explain_concepts: null,
  can_design_mixed_activities: null,
  can_create_safe_environment: null,
  approach_improves_learning: null,
  approach_helps_notice_weaknesses: null,
  home_use_realistic: null,
  primepal_helped_improve: null,
  primepal_helped_identify: null,
  would_recommend: null,
  most_valuable_aspects: [],
  improvements_suggested: [],
};

// ── Reusable Components ──────────────────────────────────────────────────────

function SectionCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
          {number}
        </span>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LikertRow({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
        <span className="text-xs text-gray-400 w-24 hidden sm:block">
          {lowLabel}
        </span>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
              value === n
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
            }`}
          >
            <input
              type="radio"
              name={label}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
          </label>
        ))}
        <span className="text-xs text-gray-400 w-24 hidden sm:block text-right">
          {highLabel}
        </span>
      </div>
      {/* Mobile labels */}
      <div className="flex justify-between sm:hidden mt-1">
        <span className="text-xs text-gray-400">{lowLabel}</span>
        <span className="text-xs text-gray-400">{highLabel}</span>
      </div>
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
            selected.includes(opt)
              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="sr-only"
          />
          <span
            className={`flex items-center justify-center w-4 h-4 rounded border ${
              selected.includes(opt)
                ? "bg-indigo-600 border-indigo-600"
                : "border-gray-300"
            }`}
          >
            {selected.includes(opt) && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </span>
          {opt}
        </label>
      ))}
    </div>
  );
}

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <span className="text-sm font-medium text-gray-700 sm:w-56">{label}</span>
      <div className="flex gap-2">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              value === opt
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {opt ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherEvaluationPage() {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useSubmitTeacherEvaluation();

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isPost = form.timepoint === "post";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!form.teacher_name.trim()) {
      setError("Teacher name is required.");
      return;
    }

    try {
      await submitMutation.mutateAsync(form as unknown as Record<string, unknown>);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  }

  function handleReset() {
    setForm({ ...INITIAL_FORM });
    setSubmitted(false);
    setError(null);
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Evaluation Submitted
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for completing the {form.timepoint === "pre" ? "Pre-Test" : "Post-Test"} evaluation.
            Your response has been recorded.
          </p>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Submit Another Evaluation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Teacher Evaluation Form
        </h1>
        <p className="text-gray-600 mt-1">
          PrimePal: AI-Assisted English Learning Study
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Timepoint Toggle */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Timepoint
              </label>
              <div className="flex gap-2">
                {(["pre", "post"] as Timepoint[]).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => set("timepoint", tp)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      form.timepoint === tp
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {tp === "pre" ? "Pre-Test" : "Post-Test"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Group
              </label>
              <div className="flex gap-2">
                {(["treatment", "control"] as GroupType[]).map((g) => (
                  <label
                    key={g}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer text-sm font-bold transition-all ${
                      form.group_type === g
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="group_type"
                      value={g}
                      checked={form.group_type === g}
                      onChange={() => set("group_type", g)}
                      className="sr-only"
                    />
                    {g === "treatment" ? "Treatment" : "Control"}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Teacher Background */}
        <SectionCard number={1} title="Teacher Background">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Teacher Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.teacher_name}
                onChange={(e) => set("teacher_name", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Enter your name"
                required
              />
            </div>
            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Teacher Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={form.teacher_email}
                onChange={(e) => set("teacher_email", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="you@school.edu.pk"
              />
            </div>
            {/* Gender */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Gender
              </label>
              <div className="flex gap-2 flex-wrap">
                {["Female", "Male", "Prefer not to say"].map((g) => (
                  <label
                    key={g}
                    className={`px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all ${
                      form.gender === g
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={form.gender === g}
                      onChange={() => set("gender", g)}
                      className="sr-only"
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
            {/* Qualification */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Qualification
              </label>
              <select
                value={form.qualification}
                onChange={(e) => set("qualification", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="">Select qualification</option>
                {["Inter", "Bachelor", "Master", "MPhil", "PhD", "Other"].map(
                  (q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  )
                )}
              </select>
            </div>
            {/* Years Teaching */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Years Teaching Primary
              </label>
              <select
                value={form.years_teaching_primary}
                onChange={(e) => set("years_teaching_primary", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="">Select range</option>
                {["<1", "1-2", "3-5", "6-10", "10+"].map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </div>
            {/* Grades Taught */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Grades Taught in Study
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((g) => (
                  <label
                    key={g}
                    className={`flex items-center justify-center w-12 h-10 rounded-lg border cursor-pointer text-sm font-bold transition-all ${
                      form.grades_taught.includes(g)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.grades_taught.includes(g)}
                      onChange={() =>
                        set(
                          "grades_taught",
                          form.grades_taught.includes(g)
                            ? form.grades_taught.filter((x) => x !== g)
                            : [...form.grades_taught, g]
                        )
                      }
                      className="sr-only"
                    />
                    G{g}
                  </label>
                ))}
              </div>
            </div>
            {/* Training toggles */}
            <div className="space-y-3">
              <YesNoToggle
                label="Received SNC Training?"
                value={form.received_snc_training}
                onChange={(v) => set("received_snc_training", v)}
              />
              <YesNoToggle
                label="Received AI Training?"
                value={form.received_ai_training}
                onChange={(v) => set("received_ai_training", v)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Classroom Context */}
        <SectionCard number={2} title="Classroom Context">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Average Class Size
              </label>
              <select
                value={form.avg_class_size}
                onChange={(e) => set("avg_class_size", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="">Select size</option>
                {["<20", "20-30", "31-40", "41-50", "50+"].map((s) => (
                  <option key={s} value={s}>
                    {s} students
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Student Home Device Access
              </label>
              <div className="flex gap-2 flex-wrap">
                {["Most", "Some", "Few"].map((opt) => (
                  <label
                    key={opt}
                    className={`px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all ${
                      form.student_home_device_access === opt
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="device_access"
                      value={opt}
                      checked={form.student_home_device_access === opt}
                      onChange={() => set("student_home_device_access", opt)}
                      className="sr-only"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Internet Stability
              </label>
              <div className="flex gap-2">
                {["Stable", "Unstable"].map((opt) => (
                  <label
                    key={opt}
                    className={`px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all ${
                      form.internet_stability === opt
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="internet"
                      value={opt}
                      checked={form.internet_stability === opt}
                      onChange={() => set("internet_stability", opt)}
                      className="sr-only"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Main Constraints
              </label>
              <CheckboxGroup
                options={[
                  "Class Size",
                  "Time",
                  "Devices",
                  "Internet",
                  "Electricity",
                  "Parents",
                ]}
                selected={form.main_constraints}
                onChange={(v) => set("main_constraints", v)}
              />
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Student English Skills */}
        <SectionCard number={3} title="Student English Skills">
          <LikertRow
            label="Listening / Speaking ability"
            value={form.listening_speaking_ability}
            onChange={(v) => set("listening_speaking_ability", v)}
            lowLabel="1 = Very Weak"
            highLabel="5 = Very Strong"
          />
          <LikertRow
            label="Reading / Writing ability"
            value={form.reading_writing_ability}
            onChange={(v) => set("reading_writing_ability", v)}
            lowLabel="1 = Very Weak"
            highLabel="5 = Very Strong"
          />
          <LikertRow
            label="Vocabulary / Sentence formation"
            value={form.vocabulary_sentence_formation}
            onChange={(v) => set("vocabulary_sentence_formation", v)}
            lowLabel="1 = Very Weak"
            highLabel="5 = Very Strong"
          />
          <LikertRow
            label="Overall English confidence"
            value={form.overall_english_confidence}
            onChange={(v) => set("overall_english_confidence", v)}
            lowLabel="1 = Very Weak"
            highLabel="5 = Very Strong"
          />
        </SectionCard>

        {/* Section 4: Student Learning Readiness */}
        <SectionCard number={4} title="Student Learning Readiness">
          <LikertRow
            label="Most students hesitate when using English"
            value={form.students_hesitate_english}
            onChange={(v) => set("students_hesitate_english", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="Most students fear making mistakes in English"
            value={form.students_fear_mistakes}
            onChange={(v) => set("students_fear_mistakes", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="Most students avoid using English unless asked"
            value={form.students_avoid_english}
            onChange={(v) => set("students_avoid_english", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="Urdu-English support helps students learn English"
            value={form.urdu_english_support_helps}
            onChange={(v) => set("urdu_english_support_helps", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
        </SectionCard>

        {/* Section 5: Pedagogical Visibility */}
        <SectionCard number={5} title="Pedagogical Visibility">
          <LikertRow
            label="I can identify students' specific English weaknesses"
            value={form.can_identify_weaknesses}
            onChange={(v) => set("can_identify_weaknesses", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="I have enough info to personalize support"
            value={form.enough_info_personalize}
            onChange={(v) => set("enough_info_personalize", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="I can monitor English learning beyond the classroom"
            value={form.can_monitor_beyond_classroom}
            onChange={(v) => set("can_monitor_beyond_classroom", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
        </SectionCard>

        {/* Section 6: Teaching Confidence */}
        <SectionCard number={6} title="Teaching Confidence">
          <LikertRow
            label="I can explain English concepts clearly to students"
            value={form.can_explain_concepts}
            onChange={(v) => set("can_explain_concepts", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="I can design activities for mixed ability levels"
            value={form.can_design_mixed_activities}
            onChange={(v) => set("can_design_mixed_activities", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
          <LikertRow
            label="I can create a safe environment for using English"
            value={form.can_create_safe_environment}
            onChange={(v) => set("can_create_safe_environment", v)}
            lowLabel="1 = Strongly Disagree"
            highLabel="5 = Strongly Agree"
          />
        </SectionCard>

        {/* Section 7: PrimePal Usefulness (post-only) */}
        {isPost && (
          <SectionCard number={7} title="PrimePal Usefulness">
            <LikertRow
              label="This approach improves overall English learning"
              value={form.approach_improves_learning}
              onChange={(v) => set("approach_improves_learning", v)}
              lowLabel="1 = Strongly Disagree"
              highLabel="5 = Strongly Agree"
            />
            <LikertRow
              label="This approach helps teachers notice weaknesses faster"
              value={form.approach_helps_notice_weaknesses}
              onChange={(v) => set("approach_helps_notice_weaknesses", v)}
              lowLabel="1 = Strongly Disagree"
              highLabel="5 = Strongly Agree"
            />
            <LikertRow
              label="Home use is realistic for most of my students"
              value={form.home_use_realistic}
              onChange={(v) => set("home_use_realistic", v)}
              lowLabel="1 = Strongly Disagree"
              highLabel="5 = Strongly Agree"
            />
          </SectionCard>
        )}

        {/* Section 8: PrimePal Impact Assessment (post-only) */}
        {isPost && (
          <SectionCard number={8} title="PrimePal Impact Assessment">
            <LikertRow
              label="PrimePal helped my students improve their English skills"
              value={form.primepal_helped_improve}
              onChange={(v) => set("primepal_helped_improve", v)}
              lowLabel="1 = Strongly Disagree"
              highLabel="5 = Strongly Agree"
            />
            <LikertRow
              label="PrimePal helped me identify students' specific English weaknesses"
              value={form.primepal_helped_identify}
              onChange={(v) => set("primepal_helped_identify", v)}
              lowLabel="1 = Strongly Disagree"
              highLabel="5 = Strongly Agree"
            />
            <LikertRow
              label="I would recommend PrimePal to other teachers"
              value={form.would_recommend}
              onChange={(v) => set("would_recommend", v)}
              lowLabel="1 = Strongly Disagree"
              highLabel="5 = Strongly Agree"
            />

            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                What was the most valuable aspect of PrimePal for your
                classroom?{" "}
                <span className="text-gray-400">(select all that apply)</span>
              </label>
              <CheckboxGroup
                options={[
                  "Speaking practice opportunities",
                  "Gamified student engagement",
                  "Bilingual (Urdu-English) support",
                  "Automatic progress tracking",
                  "AI-generated student reports",
                  "Curriculum-aligned content (SNC)",
                  "Reduced teacher workload",
                  "Student confidence building",
                ]}
                selected={form.most_valuable_aspects}
                onChange={(v) => set("most_valuable_aspects", v)}
              />
            </div>

            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                What would you improve about PrimePal?{" "}
                <span className="text-gray-400">(select all that apply)</span>
              </label>
              <CheckboxGroup
                options={[
                  "Better internet/offline support",
                  "More content per grade level",
                  "Simpler interface for younger students",
                  "More teacher control over content",
                  "Better speaking recognition accuracy",
                  "Support for more languages",
                  "Longer session time needed",
                  "Nothing — it works well as is",
                ]}
                selected={form.improvements_suggested}
                onChange={(v) => set("improvements_suggested", v)}
              />
            </div>
          </SectionCard>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {submitMutation.isPending ? "Submitting..." : "Submit Evaluation"}
          </button>
        </div>
      </form>
    </div>
  );
}
