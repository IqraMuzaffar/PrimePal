import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import QuestionTimer from '@/components/student/QuestionTimer';

describe('QuestionTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should count down from 15 seconds', () => {
    const onTimeUp = jest.fn();
    render(<QuestionTimer initialSeconds={15} onTimeUp={onTimeUp} />);

    expect(screen.getByText('15')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('should call onTimeUp when timer reaches zero', () => {
    const onTimeUp = jest.fn();
    render(<QuestionTimer initialSeconds={2} onTimeUp={onTimeUp} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onTimeUp).toHaveBeenCalled();
  });

  it('should show red progress bar when < 5 seconds', () => {
    const { container } = render(<QuestionTimer initialSeconds={4} onTimeUp={() => {}} />);
    const redBar = container.querySelector('[class*="bg-red"]');
    expect(redBar).toBeInTheDocument();
  });

  it('should show green progress bar when >= 5 seconds', () => {
    const { container } = render(<QuestionTimer initialSeconds={10} onTimeUp={() => {}} />);
    const greenBar = container.querySelector('[class*="bg-green"]');
    expect(greenBar).toBeInTheDocument();
  });
});
