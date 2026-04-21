/**
 * frontend/__tests__/classroom-settings.test.tsx
 * Test suite for Classroom Settings – Current Week Topic
 *
 * Note: This test file is a specification for the feature.
 * To run these tests, install: npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
 *
 * Setup required in jest.config.js:
 * - Configure Jest with Next.js preset
 * - Mock next/image
 * - Mock next/navigation
 * - Configure @testing-library/react
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClassroomPage from '@/app/teacher/classroom/[id]/page';

// Mock the API and auth utilities
jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@/lib/teacherAuth', () => ({
  getTeacherHeaders: jest.fn(() => ({ 'Authorization': 'Bearer token' })),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock('@/components/teacher/BulkAddStudentsModal', () => {
  return function MockBulkAddModal() {
    return <div>Bulk Add Modal</div>;
  };
});

describe('Classroom Settings – Current Week Topic', () => {
  const mockClassroom = {
    id: 'class-123',
    class_name: 'Grade 3A',
    class_code: 'ABC123',
    grade_level: 3,
    current_week_topic: 'Week 2: Past Tense Nouns',
    students: [
      {
        id: 'student-1',
        student_name: 'Alice',
        avatar_url: 'https://api.dicebear.com/8.x/adventurer/svg?seed=Alice',
        secret_pin: '1234',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the current_week_topic value in the curriculum settings section', async () => {
    const { apiFetch } = require('@/lib/api');
    apiFetch.mockResolvedValueOnce(mockClassroom);

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
    });
  });

  it('should allow editing the current_week_topic', async () => {
    const { apiFetch } = require('@/lib/api');
    apiFetch.mockResolvedValueOnce(mockClassroom);

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText(/e\.g\., Week 2/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Week 2: Past Tense Nouns');

    // Change the value
    fireEvent.change(input, { target: { value: 'Week 3: Present Progressive' } });
    expect(input.value).toBe('Week 3: Present Progressive');
  });

  it('should save the current_week_topic via PATCH API call', async () => {
    const { apiFetch } = require('@/lib/api');
    apiFetch
      .mockResolvedValueOnce(mockClassroom)
      .mockResolvedValueOnce({ ...mockClassroom, current_week_topic: 'Week 3: Present Progressive' });

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
    });

    // Open edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Modify the input
    const input = screen.getByPlaceholderText(/e\.g\., Week 2/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Week 3: Present Progressive' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    // Verify API was called with correct payload
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/classroom/class-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            current_week_topic: 'Week 3: Present Progressive',
          }),
        })
      );
    });
  });

  it('should display a success message after saving', async () => {
    const { apiFetch } = require('@/lib/api');
    apiFetch
      .mockResolvedValueOnce(mockClassroom)
      .mockResolvedValueOnce({ ...mockClassroom, current_week_topic: 'Week 3: Present Progressive' });

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText(/e\.g\., Week 2/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Week 3: Present Progressive' } });

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
    });
  });

  it('should display an error message if save fails', async () => {
    const { apiFetch } = require('@/lib/api');
    apiFetch
      .mockResolvedValueOnce(mockClassroom)
      .mockRejectedValueOnce(new Error('Network error'));

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText(/e\.g\., Week 2/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Week 3: Present Progressive' } });

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should cancel editing and revert changes', async () => {
    const { apiFetch } = require('@/lib/api');
    apiFetch.mockResolvedValueOnce(mockClassroom);

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const input = screen.getByPlaceholderText(/e\.g\., Week 2/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Week 3: Present Progressive' } });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Should revert to the original value and exit edit mode
    await waitFor(() => {
      expect(screen.getByText('Week 2: Past Tense Nouns')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/e\.g\., Week 2/i)).not.toBeInTheDocument();
    });
  });

  it('should display "No topic set yet" when current_week_topic is empty', async () => {
    const { apiFetch } = require('@/lib/api');
    const classroomWithoutTopic = { ...mockClassroom, current_week_topic: null };
    apiFetch.mockResolvedValueOnce(classroomWithoutTopic);

    render(<ClassroomPage params={{ id: 'class-123' }} />);

    await waitFor(() => {
      expect(screen.getByText(/no topic set yet/i)).toBeInTheDocument();
    });
  });
});
