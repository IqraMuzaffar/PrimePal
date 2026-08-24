'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, isLoggedIn } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { DepartmentPicker } from '@/components/booking/DepartmentPicker';
import { DoctorPicker } from '@/components/booking/DoctorPicker';
import { SlotPicker } from '@/components/booking/SlotPicker';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';
import { type Doctor } from '@/components/booking/DoctorPicker';
import { CheckCircle, ArrowLeft, Heart, CalendarCheck, Calendar } from 'lucide-react';

export default function BookAppointment() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    reference_number: string;
    doctor_name: string;
    date: string;
    time_slot: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/chat');
    }
  }, [router]);

  function handleDepartmentSelect(_id: string, name: string) {
    setSelectedDepartmentName(name);
    setStep(2);
  }

  function handleDoctorSelect(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setStep(3);
  }

  function handleSlotSelect(date: string, slot: string) {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setStep(4);
  }

  async function handleConfirm() {
    if (!selectedDoctor) return;
    setBooking(true);
    setError('');
    try {
      const result = await apiFetch('/api/patient/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: selectedDoctor.id,
          date: selectedDate,
          time_slot: selectedSlot,
          reason: 'Booked via portal',
        }),
      });
      setBookingResult(result);
      setStep(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  }

  function downloadCalendar() {
    if (!bookingResult || !selectedDoctor) return;
    const dateStr = bookingResult.date.replace(/-/g, '');
    const timeStr = bookingResult.time_slot.replace(/:/g, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${dateStr}T${timeStr}00`,
      'DURATION:PT30M',
      `SUMMARY:Dr. ${bookingResult.doctor_name} - City Health Clinic`,
      `DESCRIPTION:Booking Ref: ${bookingResult.reference_number}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointment-${bookingResult.reference_number}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setStep(1);
    setSelectedDepartmentName('');
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedSlot('');
    setError('');
    setBookingResult(null);
  }

  const stepLabels = ['Department', 'Doctor', 'Date & Time', 'Confirm'];

  return (
    <div className="min-h-screen bg-white">
      {/* Glassmorphic Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-600/20">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold text-gray-900 tracking-tight">CareBot</span>
            </div>
            <Link href="/portal">
              <Button
                variant="outline"
                className="border-gray-100/60 text-gray-500 hover:text-gray-900 hover:border-gray-100 gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Portal
              </Button>
            </Link>
          </div>

          {/* Step Indicator */}
          {step <= 4 && (
            <div className="mt-6 mb-1">
              <div className="flex gap-3">
                {stepLabels.map((label, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = stepNum < step;
                  const isCurrent = stepNum === step;
                  return (
                    <div key={label} className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold shrink-0 transition-all duration-300 ${
                            isCompleted
                              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                              : isCurrent
                              ? 'bg-white border-2 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/20'
                              : 'bg-gray-50 text-gray-500/50'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            stepNum
                          )}
                        </div>
                        {idx < stepLabels.length - 1 && (
                          <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-gray-50">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                isCompleted ? 'w-full bg-teal-600' : 'w-0'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-xs font-semibold transition-colors ${
                          isCurrent
                            ? 'text-gray-900'
                            : isCompleted
                            ? 'text-teal-600'
                            : 'text-gray-500/50'
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-8">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="opacity-0 animate-fade-in-up">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm rounded-2xl p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500 mb-2">Step 1</p>
              <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">
                Select a <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">Department</span>
              </h2>
              <DepartmentPicker onSelect={handleDepartmentSelect} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="opacity-0 animate-fade-in-up">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm rounded-2xl p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500 mb-2">Step 2</p>
              <h2 className="font-heading text-2xl font-bold text-gray-900 mb-1">
                Choose Your <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">Doctor</span>
              </h2>
              <p className="text-gray-500 mb-6">{selectedDepartmentName}</p>
              <DoctorPicker
                departmentName={selectedDepartmentName}
                onSelect={handleDoctorSelect}
                onBack={() => setStep(1)}
              />
            </div>
          </div>
        )}

        {step === 3 && selectedDoctor && (
          <div className="opacity-0 animate-fade-in-up">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm rounded-2xl p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500 mb-2">Step 3</p>
              <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">
                Pick a <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">Date & Time</span>
              </h2>
              <SlotPicker
                doctor={selectedDoctor}
                onSelect={handleSlotSelect}
                onBack={() => setStep(2)}
              />
            </div>
          </div>
        )}

        {step === 4 && selectedDoctor && (
          <div className="opacity-0 animate-fade-in-up">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm rounded-2xl p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-500 mb-2">Step 4</p>
              <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">
                Review & <span className="bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent">Confirm</span>
              </h2>
              <BookingConfirmation
                doctor={selectedDoctor}
                date={selectedDate}
                timeSlot={selectedSlot}
                onConfirm={handleConfirm}
                onBack={() => setStep(3)}
                loading={booking}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="opacity-0 animate-fade-in-up text-center py-10">
            {/* Success state */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm rounded-2xl p-10 max-w-lg mx-auto">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-600/20 mb-6">
                <CalendarCheck className="h-10 w-10 text-white" />
              </div>
              <h2 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                Appointment <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">Booked!</span>
              </h2>
              <p className="text-gray-500 mb-4">Your appointment has been confirmed.</p>

              {/* Reference number pill */}
              {bookingResult?.reference_number && (
                <div className="mb-8">
                  <span className="bg-teal-50 text-teal-700 px-4 py-2 rounded-full font-mono text-lg font-bold">
                    {bookingResult.reference_number}
                  </span>
                </div>
              )}

              {/* Booking details grid */}
              <div className="bg-gray-50/50 rounded-2xl p-6 text-left mb-8 border border-gray-100/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Doctor</span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {bookingResult?.doctor_name || selectedDoctor?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {bookingResult?.date || selectedDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Time</span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {bookingResult?.time_slot || selectedSlot}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Department</span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {selectedDepartmentName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={downloadCalendar}
                  variant="outline"
                  className="border-teal-600 text-teal-600 hover:bg-teal-50 rounded-xl px-6 gap-2 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Calendar className="h-4 w-4" />
                  Add to Calendar
                </Button>
                <Link href="/portal">
                  <Button className="bg-amber-500 hover:bg-amber-400 text-white font-semibold shadow-lg shadow-amber-500/20 rounded-xl px-6 w-full transition-all duration-300 hover:-translate-y-0.5">
                    View Portal
                  </Button>
                </Link>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-gray-100/60 hover:border-gray-100 rounded-xl px-6 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Book Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
