'use client';

import { Calendar, DollarSign, UserPlus, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    appointments_today: number;
    revenue_this_month: number;
    no_show_rate: number;
    new_patients_this_month: number;
  };
}

interface StatCardItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards: StatCardItem[] = [
    {
      label: 'Appointments Today',
      value: String(stats.appointments_today),
      icon: Calendar,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/10',
    },
    {
      label: 'Revenue This Month',
      value: formatPKR(stats.revenue_this_month),
      icon: DollarSign,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
    },
    {
      label: 'No-Show Rate',
      value: `${stats.no_show_rate.toFixed(1)}%`,
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
    {
      label: 'New Patients',
      value: String(stats.new_patients_this_month),
      icon: UserPlus,
      iconColor: 'text-teal-300',
      iconBg: 'bg-teal-300/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-gray-800/90 border border-gray-700/50 rounded-xl p-5 relative overflow-hidden backdrop-blur-xl rounded-2xl hover:border-white/[0.12] transition-all duration-300 animate-fade-in-up stagger-${index + 1}`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-gray-100 tracking-tight">
                  {card.value}
                </p>
              </div>
              <div className={`rounded-xl ${card.iconBg} p-3`}>
                <Icon className={`size-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
