'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  source?: string;
}

interface FAQFormState {
  category: string;
  question: string;
  answer: string;
  source: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'General',
  'Diabetes',
  'Heart',
  'Pregnancy',
  'Pediatrics',
  'Skin',
  'Mental Health',
];

const EMPTY_FORM: FAQFormState = {
  category: CATEGORIES[0],
  question: '',
  answer: '',
  source: '',
};

const CATEGORY_COLORS: Record<string, { badge: string; border: string; dot: string }> = {
  General: { badge: 'bg-blue-500/15 text-blue-400', border: 'border-l-blue-500', dot: 'bg-blue-400' },
  Diabetes: { badge: 'bg-amber-500/15 text-amber-400', border: 'border-l-amber-500', dot: 'bg-amber-400' },
  Heart: { badge: 'bg-red-500/15 text-red-400', border: 'border-l-red-500', dot: 'bg-red-400' },
  Pregnancy: { badge: 'bg-pink-500/15 text-pink-400', border: 'border-l-pink-500', dot: 'bg-pink-400' },
  Pediatrics: { badge: 'bg-purple-500/15 text-purple-400', border: 'border-l-purple-500', dot: 'bg-purple-400' },
  Skin: { badge: 'bg-orange-500/15 text-orange-400', border: 'border-l-orange-500', dot: 'bg-orange-400' },
  'Mental Health': { badge: 'bg-teal-500/15 text-teal-400-400', border: 'border-l-teal-500', dot: 'bg-teal-400' },
};

// ─── Dark Textarea ───────────────────────────────────────────────────────────

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <textarea
      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-400/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 resize-none transition-all duration-200"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
    />
  );
}

// ─── FAQ Form (shared by Add + Edit) ─────────────────────────────────────────

function FAQFormFields({
  form,
  onChange,
  onSubmit,
  loading,
  error,
  submitLabel,
}: {
  form: FAQFormState;
  onChange: (updated: FAQFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Category
        </label>
        <select
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
          value={form.category}
          onChange={(e) => onChange({ ...form, category: e.target.value })}
          required
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Question
        </label>
        <Input
          placeholder="What is...?"
          value={form.question}
          onChange={(e) => onChange({ ...form, question: e.target.value })}
          required
          className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-400/50 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Answer
        </label>
        <Textarea
          placeholder="Detailed answer..."
          value={form.answer}
          onChange={(e) => onChange({ ...form, answer: e.target.value })}
          rows={5}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Source (optional)
        </label>
        <Input
          placeholder="e.g. WHO Guidelines 2024"
          value={form.source}
          onChange={(e) => onChange({ ...form, source: e.target.value })}
          className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-400/50 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50 transition-all duration-200"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
          <div className="size-1.5 rounded-full bg-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <DialogFooter showCloseButton>
        <Button
          type="submit"
          disabled={loading}
          className="bg-teal-500 hover:bg-teal-300 text-white font-semibold rounded-lg px-5 transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Add FAQ Dialog ───────────────────────────────────────────────────────────

function AddFAQDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FAQFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/admin/faqs', { method: 'POST', body: JSON.stringify(form) });
      setOpen(false);
      setForm(EMPTY_FORM);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-300 text-gray-900 font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300">
            <Plus className="size-4" />
            Add FAQ
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="font-heading text-gray-100">Add FAQ</DialogTitle>
        </DialogHeader>
        <FAQFormFields
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel="Create FAQ"
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit FAQ Dialog ──────────────────────────────────────────────────────────

function EditFAQDialog({ faq, onUpdated }: { faq: FAQ; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FAQFormState>({
    category: faq.category,
    question: faq.question,
    answer: faq.answer,
    source: faq.source ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/api/admin/faqs/${faq.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 transition-all duration-200">
            <Pencil className="size-3.5" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-lg bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="font-heading text-gray-100">Edit FAQ</DialogTitle>
        </DialogHeader>
        <FAQFormFields
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          submitLabel="Update FAQ"
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteFAQButton({ faq, onDeleted }: { faq: FAQ; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/api/admin/faqs/${faq.id}`, { method: 'DELETE' });
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
            <Trash2 className="size-3.5" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="font-heading text-gray-100">Delete FAQ</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-400 mt-1">
          Are you sure you want to delete this FAQ? This action cannot be undone.
        </p>
        <p className="text-sm font-medium text-gray-100 truncate mt-1">{faq.question}</p>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
            <div className="size-1.5 rounded-full bg-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg font-semibold transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="size-4 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                Deleting...
              </span>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFAQs = () => {
    setLoading(true);
    apiFetch('/api/admin/faqs')
      .then((data: FAQ[]) => setFaqs(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFAQs(); }, []);

  // Group by category
  const grouped: Record<string, FAQ[]> = {};
  for (const faq of faqs) {
    const cat = faq.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(faq);
  }

  // Show categories in defined order, then any extras
  const orderedCategories = [
    ...CATEGORIES.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORIES.includes(c)),
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-500/10 p-2.5">
            <HelpCircle className="size-6 text-teal-400" />
          </div>
          <h1 className="text-2xl font-heading text-gray-100 tracking-tight">FAQs</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-500/10 p-2.5">
            <HelpCircle className="size-6 text-teal-400" />
          </div>
          <h1 className="text-2xl font-heading text-gray-100 tracking-tight">FAQs</h1>
        </div>
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/20 rounded-xl blur-lg" />
            <div className="relative rounded-xl bg-teal-500/10 p-2.5">
              <HelpCircle className="size-6 text-teal-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-heading text-gray-100 tracking-tight">
              FAQs
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {faqs.length} entries across {orderedCategories.length} categories
            </p>
          </div>
        </div>
        <AddFAQDialog onCreated={fetchFAQs} />
      </div>

      {/* Empty state */}
      {orderedCategories.length === 0 && (
        <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl py-16 text-center">
          <HelpCircle className="size-12 text-gray-400/20 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">No FAQs yet. Add your first one!</p>
        </div>
      )}

      {/* Category groups */}
      {orderedCategories.map((category) => {
        const colors = CATEGORY_COLORS[category] ?? {
          badge: 'bg-gray-700 text-gray-400',
          border: 'border-l-gray-500',
          dot: 'bg-gray-400',
        };
        return (
          <div key={category} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                <span className={`inline-block size-1.5 rounded-full ${colors.dot}`} />
                {category}
              </span>
              <span className="text-xs text-gray-400/60">{grouped[category].length} FAQs</span>
            </div>

            {/* FAQ items in glass card */}
            <div className={`bg-gray-800/90 backdrop-blur-xl border border-gray-700/50 shadow-lg rounded-xl border-l-4 ${colors.border} overflow-hidden`}>
              {grouped[category].map((faq, idx) => (
                <div
                  key={faq.id}
                  className={`group px-5 py-4 hover:bg-white/[0.03] transition-colors duration-150 ${
                    idx < grouped[category].length - 1 ? 'border-b border-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="font-semibold text-sm text-gray-100 leading-snug">
                        {faq.question}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {faq.answer.length > 120 ? `${faq.answer.slice(0, 120)}...` : faq.answer}
                      </p>
                      {faq.source && (
                        <p className="text-[11px] text-gray-400/50 italic">
                          Source: {faq.source}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <EditFAQDialog faq={faq} onUpdated={fetchFAQs} />
                      <DeleteFAQButton faq={faq} onDeleted={fetchFAQs} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
