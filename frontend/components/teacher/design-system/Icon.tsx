// frontend/components/teacher/design-system/Icon.tsx

import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function Icon({
  icon: LucideIcon,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
  className = '',
}: IconProps) {
  return (
    <LucideIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
