'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import React from 'react';

interface PillarCardProps {
  pillar: 'reading' | 'writing' | 'listening' | 'speaking';
  bgColor: string;
  icon: React.ReactNode;
}

export default function PillarCard({ pillar, bgColor, icon }: PillarCardProps) {
  const pillarName = pillar.charAt(0).toUpperCase() + pillar.slice(1);

  return (
    <Link href={`/student/missions/${pillar}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`${bgColor} rounded-2xl p-8 h-64 flex flex-col items-center justify-center cursor-pointer shadow-lg transition-all hover:shadow-2xl`}
      >
        <motion.div
          initial={{ y: 0 }}
          whileHover={{ y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-white mb-4"
        >
          <div className="text-6xl">{icon}</div>
        </motion.div>
        <h2 className="text-3xl font-bold text-white text-center">{pillarName}</h2>
        <p className="text-white text-sm mt-2 opacity-90 text-center">Tap to practice</p>
      </motion.div>
    </Link>
  );
}
