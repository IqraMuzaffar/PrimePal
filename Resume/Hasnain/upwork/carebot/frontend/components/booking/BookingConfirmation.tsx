'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface DoctorSummary {
  name: string;
  department: string;
  fee: number | string;
}

interface BookingConfirmationProps {
  doctor: DoctorSummary;
  date: string;
  timeSlot: string;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}

export function BookingConfirmation({
  doctor,
  date,
  timeSlot,
  onConfirm,
  onBack,
  loading,
}: BookingConfirmationProps) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} disabled={loading} className="text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Slots
      </Button>

      <div className="max-w-md bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-xl shadow-sm">
        <div className="px-6 pt-6 pb-3">
          <h3 className="font-heading text-xl text-gray-900">Confirm Appointment</h3>
        </div>
        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100/20">
              <span className="text-gray-500">Doctor</span>
              <span className="font-medium text-gray-900">{doctor.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100/20">
              <span className="text-gray-500">Department</span>
              <span className="font-medium text-gray-900">{doctor.department}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100/20">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">{date}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100/20">
              <span className="text-gray-500">Time</span>
              <span className="font-medium text-gray-900">{timeSlot}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Fee</span>
              <span className="font-medium text-amber-500">PKR {doctor.fee}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/20 font-medium rounded-xl transition-all"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              disabled={loading}
              className="border-gray-100/50 text-gray-500 hover:text-gray-900 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
