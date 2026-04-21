'use client';

import PillarCard from '@/components/student/PillarCard';
import { BookOpen, Edit3, Headphones, Mic } from 'lucide-react';

type PillarType = 'reading' | 'writing' | 'listening' | 'speaking';

export default function MissionsDashboard() {
  const pillars: Array<{
    id: PillarType;
    name: string;
    icon: React.ReactNode;
    bgColor: string;
  }> = [
    {
      id: 'reading',
      name: 'Reading',
      icon: <BookOpen size={48} />,
      bgColor: 'bg-red-600',
    },
    {
      id: 'writing',
      name: 'Writing',
      icon: <Edit3 size={48} />,
      bgColor: 'bg-blue-600',
    },
    {
      id: 'listening',
      name: 'Listening',
      icon: <Headphones size={48} />,
      bgColor: 'bg-yellow-500',
    },
    {
      id: 'speaking',
      name: 'Speaking',
      icon: <Mic size={48} />,
      bgColor: 'bg-green-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">Learning Missions</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-12">Choose a pillar to start practicing</p>

        {/* 2x2 Grid (responsive: 1 col mobile, 2x2 tablet+) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {pillars.map((pillar) => (
            <PillarCard
              key={pillar.id}
              pillar={pillar.id}
              bgColor={pillar.bgColor}
              icon={pillar.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
