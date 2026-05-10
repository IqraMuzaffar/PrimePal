// frontend/components/teacher/classrooms/StudentTable.tsx

import { designTokens } from '@/lib/design-tokens';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  grade_level: number;
  missions_completed?: number;
  accuracy?: number;
}

interface StudentTableProps {
  students: Student[];
  onStudentClick: (studentId: string) => void;
}

export function StudentTable({ students, onStudentClick }: StudentTableProps) {
  const getStatusForAccuracy = (accuracy: number) => {
    if (accuracy >= 80) {
      return {
        label: 'Excellent',
        color: designTokens.colors.success,
        bg: designTokens.colors.successBg,
      };
    } else if (accuracy >= 65) {
      return {
        label: 'Good',
        color: designTokens.colors.warning,
        bg: designTokens.colors.warningBg,
      };
    } else {
      return {
        label: 'Needs Help',
        color: designTokens.colors.danger,
        bg: designTokens.colors.dangerBg,
      };
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return designTokens.colors.success;
    if (accuracy >= 65) return designTokens.colors.warning;
    return designTokens.colors.danger;
  };

  const getGradeColor = (gradeLevel: number) => {
    return designTokens.colors.grade[gradeLevel as keyof typeof designTokens.colors.grade] || designTokens.colors.primary;
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-2">🔍</div>
        <div
          className="text-sm font-semibold"
          style={{
            color: designTokens.colors.slate[900],
            fontWeight: designTokens.typography.weights.semibold,
          }}
        >
          No students found
        </div>
        <div
          className="text-xs mt-1"
          style={{
            color: designTokens.colors.slate[500],
            fontSize: designTokens.typography.sizes.xs,
          }}
        >
          Try a different name, roll number, or grade
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
      {/* Table Header */}
      <div
        className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_110px] gap-4 px-3 py-2 rounded-lg mb-1"
        style={{ backgroundColor: '#f8f9fc' }}
      >
        {['Student Name', 'Roll Number', 'Grade', 'Missions', 'Accuracy', 'Status'].map((header) => (
          <span
            key={header}
            className="text-xs font-bold uppercase tracking-wide"
            style={{
              color: designTokens.colors.slate[500],
              fontSize: '11px',
              fontWeight: designTokens.typography.weights.bold,
              fontFamily: designTokens.typography.body,
              letterSpacing: '0.5px',
            }}
          >
            {header}
          </span>
        ))}
      </div>

      {/* Table Rows */}
      {students.map((student, index) => {
        const accuracy = Math.round((student.accuracy || 0) * 100);
        const status = getStatusForAccuracy(accuracy);
        const gradeColor = getGradeColor(student.grade_level);

        return (
          <div
            key={student.id}
            onClick={() => onStudentClick(student.id)}
            className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_110px] gap-4 px-3 py-3 items-center cursor-pointer hover:bg-gray-50 transition-colors"
            style={{
              borderBottom: index < students.length - 1 ? `1px solid ${designTokens.colors.slate[100]}` : 'none',
            }}
          >
            {/* Name with avatar */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  backgroundColor: `${gradeColor}18`,
                  color: gradeColor,
                  fontFamily: designTokens.typography.heading,
                }}
              >
                {student.name[0]?.toUpperCase() || 'S'}
              </div>
              <span
                className="font-semibold"
                style={{
                  color: designTokens.colors.slate[900],
                  fontSize: designTokens.typography.sizes.base,
                  fontWeight: designTokens.typography.weights.semibold,
                }}
              >
                {student.name}
              </span>
            </div>

            {/* Roll Number */}
            <span
              className="font-medium"
              style={{
                color: designTokens.colors.slate[600],
                fontSize: designTokens.typography.sizes.sm,
                fontWeight: designTokens.typography.weights.medium,
                fontFamily: designTokens.typography.heading,
              }}
            >
              {student.roll_number}
            </span>

            {/* Grade badge */}
            <span className="inline-flex">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: `${gradeColor}18`,
                  color: gradeColor,
                  fontSize: '11px',
                  fontWeight: designTokens.typography.weights.bold,
                  fontFamily: designTokens.typography.heading,
                }}
              >
                Grade {student.grade_level}
              </span>
            </span>

            {/* Missions */}
            <span
              style={{
                color: designTokens.colors.slate[600],
                fontSize: designTokens.typography.sizes.base,
              }}
            >
              {student.missions_completed || 0}
            </span>

            {/* Accuracy */}
            <span
              className="font-extrabold"
              style={{
                color: getAccuracyColor(accuracy),
                fontSize: designTokens.typography.sizes.base,
                fontWeight: designTokens.typography.weights.extrabold,
                fontFamily: designTokens.typography.heading,
              }}
            >
              {accuracy}%
            </span>

            {/* Status badge */}
            <span className="inline-flex">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  color: status.color,
                  backgroundColor: status.bg,
                  fontSize: '11px',
                  fontWeight: designTokens.typography.weights.semibold,
                }}
              >
                {status.label}
              </span>
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}
