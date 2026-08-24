'use client';
import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LabResultCardProps {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
}

export function LabResultCard({ testName, value, unit, referenceRange, status }: LabResultCardProps) {
  const statusStyles = {
    normal: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    abnormal: 'bg-amber-300/30 text-amber-500 border-amber-500/30',
    critical: 'bg-red-100 text-red-800 border-red-300',
  };

  const borderColors = {
    normal: 'border-l-emerald-500',
    abnormal: 'border-l-amber-500',
    critical: 'border-l-red-500',
  };

  return (
    <div className={cn(
      'my-2 max-w-sm bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-xl shadow-sm border-l-4',
      borderColors[status]
    )}>
      <div className="px-4 pt-4 pb-2">
        <div className="text-sm font-heading font-semibold flex items-center gap-2 text-gray-900">
          <div className="w-7 h-7 rounded-lg bg-teal-600/10 flex items-center justify-center">
            <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
          </div>
          {testName}
        </div>
      </div>
      <div className="px-4 pb-4 text-sm space-y-1.5">
        <p className="text-lg font-semibold text-gray-900">
          {value}
          {unit && <span className="text-gray-500 text-sm ml-1">{unit}</span>}
        </p>
        {referenceRange && (
          <p className="text-gray-500 text-xs">
            Reference: {referenceRange}
          </p>
        )}
        <Badge className={cn('mt-1', statusStyles[status])} variant="outline">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>
    </div>
  );
}
