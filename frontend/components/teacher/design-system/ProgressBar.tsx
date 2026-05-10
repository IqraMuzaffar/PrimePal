// frontend/components/teacher/design-system/ProgressBar.tsx

interface ProgressBarProps {
  value: number; // 0-100
  color: string;
  height?: number;
  bgColor?: string;
}

export function ProgressBar({
  value,
  color,
  height = 8,
  bgColor = '#f0f2f8',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{
        height: `${height}px`,
        backgroundColor: bgColor,
      }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${clampedValue}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
