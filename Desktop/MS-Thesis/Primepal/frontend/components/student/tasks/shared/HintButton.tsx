'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface HintButtonProps {
  urduHint: string;
  onUsed?: () => void;
}

export default function HintButton({ urduHint, onUsed }: HintButtonProps) {
  const [showHint, setShowHint] = useState(false);

  if (!urduHint) return null;

  const handleClick = () => {
    if (!showHint) {
      setShowHint(true);
      onUsed?.();
    } else {
      setShowHint(false);
    }
  };

  return (
    <div className="mt-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
      >
        <HelpCircle size={14} />
        {showHint ? 'Hide Hint' : 'Hint (اشارہ)'}
      </motion.button>
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-urdu text-right" dir="rtl">
              {urduHint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
