'use client';
import { AlertTriangle, Phone } from 'lucide-react';

export function EmergencyBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm p-4 text-center font-semibold shadow-lg shadow-amber-500/20">
      <div className="flex items-center justify-center gap-3 text-gray-900">
        <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
        <span className="font-heading tracking-wide">EMERGENCY: Call 1122 (Rescue) or go to the nearest ER immediately</span>
        <Phone className="h-5 w-5 text-amber-500" />
      </div>
    </div>
  );
}
