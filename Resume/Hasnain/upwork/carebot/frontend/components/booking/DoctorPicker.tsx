'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Stethoscope } from 'lucide-react';

export interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  qualification: string;
  fee: number;
  available_days: string[];
}

interface DoctorPickerProps {
  departmentName: string;
  onSelect: (doctor: Doctor) => void;
  onBack: () => void;
}

export function DoctorPicker({ departmentName, onSelect, onBack }: DoctorPickerProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/clinic/doctors');
        const filtered = data.filter(
          (d: Doctor) => d.department.toLowerCase() === departmentName.toLowerCase()
        );
        setDoctors(filtered);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load doctors');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentName]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-white/60 backdrop-blur-sm rounded-xl h-32 border border-gray-100/30" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Departments
      </Button>

      {doctors.length === 0 ? (
        <p className="text-gray-500">No doctors available in this department.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="cursor-pointer bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-xl shadow-sm hover:shadow-xl hover:translate-y-[-2px] hover:border-teal-600/30 transition-all duration-200"
              onClick={() => onSelect(doc)}
            >
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-600/10 flex items-center justify-center">
                    <Stethoscope className="h-4 w-4 text-teal-600" />
                  </div>
                  <p className="font-heading font-semibold text-lg text-gray-900">{doc.name}</p>
                </div>
                <Badge className="bg-teal-400/30 text-teal-600 border-teal-600/20 rounded-full text-xs">
                  {doc.specialization}
                </Badge>
                <p className="text-sm text-gray-500">{doc.qualification}</p>
                <p className="text-sm font-medium text-amber-500">Fee: PKR {doc.fee}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {doc.available_days?.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs rounded-full bg-white border border-gray-100/50">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
