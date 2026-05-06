// frontend/components/teacher/design-system/LineChart.tsx

import { designTokens } from '@/lib/design-tokens';

interface Dataset {
  values: number[];
  color: string;
  label?: string;
}

interface LineChartProps {
  labels: string[];
  datasets: Dataset[];
  height?: number;
}

export function LineChart({ labels, datasets, height = 180 }: LineChartProps) {
  const padding = 20;
  const width = 600;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  // Find min and max values across all datasets
  const allValues = datasets.flatMap(d => d.values);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue || 1;

  // Calculate points for each dataset
  const getPath = (values: number[]) => {
    const points = values.map((value, index) => {
      const x = padding + (index / (values.length - 1)) * chartWidth;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <div>
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
          const y = height - padding - percent * chartHeight;
          return (
            <line
              key={percent}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={designTokens.colors.slate[100]}
              strokeWidth="1"
            />
          );
        })}

        {/* Lines */}
        {datasets.map((dataset, index) => (
          <path
            key={index}
            d={getPath(dataset.values)}
            fill="none"
            stroke={dataset.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Points */}
        {datasets.map((dataset, datasetIndex) =>
          dataset.values.map((value, pointIndex) => {
            const x = padding + (pointIndex / (dataset.values.length - 1)) * chartWidth;
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            return (
              <circle
                key={`${datasetIndex}-${pointIndex}`}
                cx={x}
                cy={y}
                r="4"
                fill={dataset.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })
        )}

        {/* X-axis labels */}
        {labels.map((label, index) => {
          const x = padding + (index / (labels.length - 1)) * chartWidth;
          return (
            <text
              key={index}
              x={x}
              y={height - 5}
              textAnchor="middle"
              fill={designTokens.colors.slate[600]}
              fontSize="11"
              fontFamily={designTokens.typography.body}
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      {datasets.some(d => d.label) && (
        <div className="flex gap-4 mt-2 justify-center">
          {datasets.map((dataset, index) =>
            dataset.label ? (
              <div key={index} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: dataset.color }}
                />
                <span
                  className="text-xs"
                  style={{
                    color: designTokens.colors.slate[600],
                    fontFamily: designTokens.typography.body,
                    fontSize: designTokens.typography.sizes.xs,
                  }}
                >
                  {dataset.label}
                </span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
