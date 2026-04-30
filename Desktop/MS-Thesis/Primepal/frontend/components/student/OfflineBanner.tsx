'use client';

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/lib/use-network-status';
import { getPendingAnswers } from '@/lib/network-queue';

/**
 * A non-alarming banner shown at the top of the student layout when offline.
 * Displays pending answer count and animates in/out.
 */
export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  // Track pending answers count
  useEffect(() => {
    if (!isOnline) {
      setPendingCount(getPendingAnswers().length);
    }
  }, [isOnline]);

  // Animate in/out with a slight delay
  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
    } else {
      // Small delay before hiding to let animation play
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!visible && isOnline) return null;

  return (
    <div
      className={`w-full transition-all duration-300 ease-in-out overflow-hidden ${
        !isOnline ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
        <p className="text-amber-700 text-sm font-medium">
          You are offline — your answers are saved locally
          {pendingCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center bg-amber-200 text-amber-800 text-xs font-bold rounded-full px-2 py-0.5">
              {pendingCount} saved
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
