'use client';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AppointmentCardProps {
  doctor: string;
  date: string;
  time: string;
  status: string;
  reason?: string;
}

export function AppointmentCard({ doctor, date, time, status, reason }: AppointmentCardProps) {
  const statusVariant =
    status === 'confirmed'
      ? 'default'
      : status === 'cancelled'
        ? 'destructive'
        : 'secondary';

  return (
    <div className="my-2 max-w-sm bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-xl shadow-sm border-l-4 border-l-teal-600">
      <div className="px-4 pt-4 pb-2">
        <div className="text-sm font-heading font-semibold flex items-center gap-2 text-gray-900">
          <div className="w-7 h-7 rounded-lg bg-teal-600/10 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-teal-600" />
          </div>
          Appointment
        </div>
      </div>
      <div className="px-4 pb-4 text-sm space-y-1.5">
        <p>
          <span className="font-medium text-gray-500">Doctor:</span>{' '}
          <span className="text-gray-900">{doctor}</span>
        </p>
        <p>
          <span className="font-medium text-gray-500">Date:</span>{' '}
          <span className="text-gray-900">{date} at {time}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-500">Status:</span>
          <Badge variant={statusVariant}>{status}</Badge>
        </div>
        {reason && (
          <p>
            <span className="font-medium text-gray-500">Reason:</span>{' '}
            <span className="text-gray-900">{reason}</span>
          </p>
        )}
      </div>
    </div>
  );
}
