'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Clock, Users, BookOpen, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useGenerateDailyPlan } from '@/lib/hooks/teacher-queries';

import type { TeacherDailyPlan } from '@/lib/hooks/teacher-queries';

/* ── Helpers ───────────────────────────────────────────────────────────── */

const GRADES = [1, 2, 3, 4, 5] as const;

function pillarColor(pillar: string): string {
  const p = pillar.toLowerCase();
  if (p === 'reading') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (p === 'writing') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (p === 'listening') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (p === 'speaking') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function pillarDot(pillar: string): string {
  const p = pillar.toLowerCase();
  if (p === 'reading') return 'bg-blue-500';
  if (p === 'writing') return 'bg-purple-500';
  if (p === 'listening') return 'bg-amber-500';
  if (p === 'speaking') return 'bg-green-500';
  return 'bg-gray-500';
}

/* ── PDF Export ────────────────────────────────────────────────────────── */

async function exportPlanPDF(plan: TeacherDailyPlan, gradeLevel: number) {
  try {
    const jsPDFModule = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
    const autoTable = autoTableModule.default || autoTableModule;
    if (!jsPDF || !autoTable) return;

    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-PK');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(67, 56, 202);
    doc.text('PrimePal — Daily Teaching Plan', 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Grade: ${gradeLevel}  |  Date: ${date}`, 14, 28);
    doc.text(`Generated: ${new Date(plan.generated_at).toLocaleString()}`, 14, 35);

    // Summary
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('Summary', 14, 46);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(plan.summary, 180);
    doc.text(summaryLines, 14, 53);
    let y = 53 + summaryLines.length * 5 + 6;

    // Focus Areas
    if (plan.focus_areas.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text('Focus Areas', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Pillar', 'Topic', 'Reason']],
        body: plan.focus_areas.map(a => [a.pillar, a.topic, a.reason]),
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Suggested Activities
    if (plan.suggested_activities.length > 0) {
      if (y > 240) { doc.addPage(); y = 18; }
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text('Suggested Activities', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Activity', 'Pillar', 'Time', 'Description']],
        body: plan.suggested_activities.map(a => [
          a.title, a.target_pillar, `${a.estimated_minutes} min`, a.description,
        ]),
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 9 },
        columnStyles: { 3: { cellWidth: 70 } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Student Groups
    if (plan.student_groups.length > 0) {
      if (y > 240) { doc.addPage(); y = 18; }
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text('Student Groups', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Group', 'Students', 'Recommendation']],
        body: plan.student_groups.map(g => [
          g.group_name, g.student_names.join(', '), g.recommendation,
        ]),
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { cellWidth: 55 }, 2: { cellWidth: 65 } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // SNC References
    if (plan.snc_references.length > 0) {
      if (y > 250) { doc.addPage(); y = 18; }
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text('SNC Curriculum References', 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      for (const ref of plan.snc_references) {
        if (y > 275) { doc.addPage(); y = 18; }
        const refLines = doc.splitTextToSize(`• ${ref}`, 180);
        doc.text(refLines, 14, y);
        y += refLines.length * 4 + 2;
      }
    }

    const fileName = `teaching-plan-grade${gradeLevel}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Failed to export PDF. Please try again.');
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function TeacherAssistantPage() {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [plan, setPlan] = useState<TeacherDailyPlan | null>(null);
  const [sncOpen, setSncOpen] = useState(false);
  const generatePlan = useGenerateDailyPlan();
  const loading = generatePlan.isPending;
  const error = generatePlan.error instanceof Error ? generatePlan.error.message : null;

  async function handleGenerate() {
    if (selectedGrade === null) return;
    setPlan(null);
    try {
      const result = await generatePlan.mutateAsync(selectedGrade);
      setPlan(result);
    } catch {
      // error is handled via generatePlan.error
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Sparkles size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Teaching Assistant</h1>
          <p className="text-sm text-gray-500">Generate personalized daily teaching plans for your classes</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Grade Level
            </label>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={[
                    'w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-sm font-semibold transition-all',
                    selectedGrade === g
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={selectedGrade === null || loading}
            className={[
              'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
              selectedGrade !== null && !loading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Today&apos;s Plan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !plan && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to plan your day?</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Select a grade level above and click &quot;Generate Today&apos;s Plan&quot; to get an
            AI-powered teaching plan tailored to your students&apos; needs.
          </p>
        </div>
      )}

      {/* Plan display */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-6">
            <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">
              Daily Plan Summary
            </h2>
            <p className="text-gray-800 leading-relaxed">{plan.summary}</p>
          </div>

          {/* Focus Areas */}
          {plan.focus_areas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-gray-400" />
                Focus Areas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.focus_areas.map((area, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${pillarDot(area.pillar)}`} />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pillarColor(area.pillar)}`}
                      >
                        {area.pillar}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{area.topic}</h3>
                    <p className="text-xs text-gray-500">{area.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Activities */}
          {plan.suggested_activities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-gray-400" />
                Suggested Activities
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.suggested_activities.map((activity, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pillarColor(activity.target_pillar)}`}
                      >
                        {activity.target_pillar}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {activity.estimated_minutes} min
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{activity.title}</h3>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Groups */}
          {plan.student_groups.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                Student Groups
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.student_groups.map((group, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">{group.group_name}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {group.student_names.map((name, j) => (
                        <span
                          key={j}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{group.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SNC References */}
          {plan.snc_references.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setSncOpen(!sncOpen)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-400" />
                  SNC Curriculum References
                </h2>
                {sncOpen ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {sncOpen && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <ul className="space-y-2">
                    {plan.snc_references.map((ref, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Timestamp + Download */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              Generated at {new Date(plan.generated_at).toLocaleString()}
            </p>
            <button
              onClick={() => exportPlanPDF(plan, selectedGrade!)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
            >
              <Download size={14} />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
