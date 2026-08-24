'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

interface DoctorRef {
  id: string;
  name: string;
  specialization: string;
}

interface SlotPickerProps {
  doctor: DoctorRef;
  onSelect: (date: string, slot: string) => void;
  onBack: () => void;
}

export function SlotPicker({ doctor, onSelect, onBack }: SlotPickerProps) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  async function handleDateChange(newDate: string) {
    setDate(newDate);
    setError('');
    setSlots([]);
    setFetched(false);

    if (!newDate) return;

    setLoading(true);
    try {
      const data = await apiFetch(
        `/api/booking/slots?doctor_id=${doctor.id}&date=${newDate}`
      );
      setSlots(data);
      setFetched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Doctors
      </Button>

      <div>
        <p className="font-heading font-medium text-gray-900 mb-1">Booking with: {doctor.name}</p>
        <p className="text-sm text-gray-500">{doctor.specialization}</p>
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-900 mb-2">Select Date</label>
        <Input
          type="date"
          min={minDate}
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="bg-white border-gray-100/50 focus:border-teal-600 focus:ring-teal-600/30 rounded-xl"
        />
      </div>

      {loading && (
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white/60 backdrop-blur-sm rounded-full h-10 w-24 border border-gray-100/30" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {fetched && !loading && slots.length === 0 && (
        <p className="text-gray-500">No available slots for this date.</p>
      )}

      {slots.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Available Slots</label>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <Button
                key={slot}
                variant="outline"
                className="rounded-full border-gray-100/50 bg-white/60 hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-sm transition-all"
                onClick={() => onSelect(date, slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
