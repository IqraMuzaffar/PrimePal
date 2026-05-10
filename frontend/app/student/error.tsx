'use client';

import { useEffect } from 'react';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Student page error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="font-baloo font-extrabold text-2xl text-slate-900 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-slate-600 mb-6 font-nunito">
          Don&apos;t worry — your progress is saved. Let&apos;s try again!
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl font-baloo font-extrabold shadow-lg hover:shadow-xl transition-all"
          >
            Try Again
          </button>
          <a
            href="/student/home"
            className="px-6 py-3 bg-white text-slate-700 rounded-2xl font-baloo font-extrabold border-2 border-slate-200 hover:border-slate-300 transition-all"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
