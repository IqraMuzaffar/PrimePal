'use client';
import { Pill } from 'lucide-react';

interface MedicationListProps {
  medications: Array<{
    drug_name: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
  }>;
}

export function MedicationList({ medications }: MedicationListProps) {
  return (
    <div className="my-2 max-w-sm bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-xl shadow-sm border-l-4 border-l-amber-500">
      <div className="px-4 pt-4 pb-2">
        <div className="text-sm font-heading font-semibold flex items-center gap-2 text-gray-900">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Pill className="h-3.5 w-3.5 text-amber-500" />
          </div>
          Medications
        </div>
      </div>
      <div className="px-4 pb-4 text-sm">
        <ul className="space-y-3">
          {medications.map((med, i) => (
            <li key={i} className="border-b border-gray-100/30 last:border-b-0 pb-2.5 last:pb-0">
              <p className="font-semibold text-gray-900">{med.drug_name}</p>
              {med.dosage && (
                <p className="text-gray-500 text-xs mt-0.5">Dosage: {med.dosage}</p>
              )}
              {med.frequency && (
                <p className="text-gray-500 text-xs">Frequency: {med.frequency}</p>
              )}
              {med.instructions && (
                <p className="text-gray-500 text-xs italic mt-0.5">{med.instructions}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
