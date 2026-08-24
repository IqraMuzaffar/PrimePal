'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheck } from 'lucide-react';

interface VisitNotesModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (notes: VisitNotes) => Promise<void>;
  patientName: string;
}

export interface VisitNotes {
  chief_complaint: string;
  examination_findings: string;
  diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  follow_up_days: number | null;
}

export function VisitNotesModal({ open, onClose, onSubmit, patientName }: VisitNotesModalProps) {
  const [notes, setNotes] = useState<VisitNotes>({
    chief_complaint: '',
    examination_findings: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    follow_up_days: null,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(notes);
      onClose();
      setNotes({ chief_complaint: '', examination_findings: '', diagnosis: '', treatment_plan: '', follow_up_instructions: '', follow_up_days: null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <ClipboardCheck className="h-5 w-5 text-teal-400" />
            Complete Visit — {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Chief Complaint *</label>
            <Textarea value={notes.chief_complaint} onChange={(e) => setNotes({ ...notes, chief_complaint: e.target.value })} placeholder="Patient's primary concern..." className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50" rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Examination Findings</label>
            <Textarea value={notes.examination_findings} onChange={(e) => setNotes({ ...notes, examination_findings: e.target.value })} placeholder="Clinical observations..." className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50" rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Diagnosis *</label>
            <Input value={notes.diagnosis} onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })} placeholder="e.g., Type 2 Diabetes Mellitus, controlled" className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Treatment Plan</label>
            <Textarea value={notes.treatment_plan} onChange={(e) => setNotes({ ...notes, treatment_plan: e.target.value })} placeholder="Medications, lifestyle changes, referrals..." className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Follow-up Instructions</label>
              <Input value={notes.follow_up_instructions} onChange={(e) => setNotes({ ...notes, follow_up_instructions: e.target.value })} placeholder="e.g., Return in 2 weeks" className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5 block">Follow-up (days)</label>
              <Input type="number" value={notes.follow_up_days || ''} onChange={(e) => setNotes({ ...notes, follow_up_days: e.target.value ? parseInt(e.target.value) : null })} placeholder="14" className="bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus:border-teal-500/50" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !notes.chief_complaint || !notes.diagnosis} className="px-5 py-2 text-sm font-medium bg-teal-500 hover:bg-teal-400 text-white rounded-lg disabled:opacity-50 transition-all">
            {saving ? 'Saving...' : 'Complete Visit'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
