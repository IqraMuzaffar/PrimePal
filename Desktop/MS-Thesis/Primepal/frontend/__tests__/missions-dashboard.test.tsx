import { render, screen } from '@testing-library/react';
import MissionsDashboard from '@/components/student/MissionsDashboard';

describe('Student Missions Dashboard - 2x2 Grid', () => {
  it('should render 4 pillar cards in a grid', () => {
    render(<MissionsDashboard />);

    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('Speaking')).toBeInTheDocument();
  });

  it('should have correct colors for each pillar', () => {
    const { container } = render(<MissionsDashboard />);

    const readingCard = screen.getByText('Reading').closest('div')?.closest('div')?.closest('div');
    expect(readingCard).toHaveClass('bg-red-600');

    const writingCard = screen.getByText('Writing').closest('div')?.closest('div')?.closest('div');
    expect(writingCard).toHaveClass('bg-blue-600');

    const listeningCard = screen.getByText('Listening').closest('div')?.closest('div')?.closest('div');
    expect(listeningCard).toHaveClass('bg-yellow-500');

    const speakingCard = screen.getByText('Speaking').closest('div')?.closest('div')?.closest('div');
    expect(speakingCard).toHaveClass('bg-green-600');
  });

  it('should navigate to pillar gameplay on card click', () => {
    render(<MissionsDashboard />);

    const readingLink = screen.getByRole('link', { name: /reading/i });
    expect(readingLink).toHaveAttribute('href', expect.stringContaining('reading'));

    const writingLink = screen.getByRole('link', { name: /writing/i });
    expect(writingLink).toHaveAttribute('href', expect.stringContaining('writing'));

    const listeningLink = screen.getByRole('link', { name: /listening/i });
    expect(listeningLink).toHaveAttribute('href', expect.stringContaining('listening'));

    const speakingLink = screen.getByRole('link', { name: /speaking/i });
    expect(speakingLink).toHaveAttribute('href', expect.stringContaining('speaking'));
  });

  it('should have large icons for each pillar', () => {
    const { container } = render(<MissionsDashboard />);

    // Check for SVG elements (Lucide icons render as svg)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });
});
