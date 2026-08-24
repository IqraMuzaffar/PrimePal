'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Department {
  id: string;
  name: string;
}

interface DepartmentPickerProps {
  onSelect: (departmentId: string, departmentName: string) => void;
}

export function DepartmentPicker({ onSelect }: DepartmentPickerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/clinic/departments');
        setDepartments(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load departments');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse bg-white/60 backdrop-blur-sm rounded-xl h-24 border border-gray-100/30" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((dept) => (
        <div
          key={dept.id}
          className="cursor-pointer bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-xl shadow-sm hover:shadow-xl hover:translate-y-[-2px] hover:border-teal-600/30 transition-all duration-200"
          onClick={() => onSelect(dept.id, dept.name)}
        >
          <div className="p-6 text-center">
            <p className="font-heading font-semibold text-lg text-gray-900">{dept.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
