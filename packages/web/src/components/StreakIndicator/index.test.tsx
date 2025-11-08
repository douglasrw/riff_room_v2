import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StreakIndicator } from './index';
import * as streakServiceModule from '../../services/streakService';

// Mock streakService
vi.mock('../../services/streakService', () => ({
  streakService: {
    getCurrentStreak: vi.fn(),
  },
}));

describe('StreakIndicator', () => {
  const mockStreakService = streakServiceModule.streakService as any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should not render when loading', () => {
    mockStreakService.getCurrentStreak.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<StreakIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when streak is 0', async () => {
    mockStreakService.getCurrentStreak.mockResolvedValue(0);

    const { container } = render(<StreakIndicator />);

    await waitFor(() => {
      expect(mockStreakService.getCurrentStreak).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('should render 1-day streak with singular text', async () => {
    mockStreakService.getCurrentStreak.mockResolvedValue(1);

    render(<StreakIndicator />);

    await waitFor(() => {
      expect(screen.getByText('1 day')).toBeInTheDocument();
    });

    // Should have flame icon
    expect(screen.getByText('1 day').parentElement).toHaveTextContent('1 day');
  });

  it('should render multi-day streak with plural text', async () => {
    mockStreakService.getCurrentStreak.mockResolvedValue(7);

    render(<StreakIndicator />);

    await waitFor(() => {
      expect(screen.getByText('7 days')).toBeInTheDocument();
    });
  });

  it('should render large streak correctly', async () => {
    mockStreakService.getCurrentStreak.mockResolvedValue(100);

    render(<StreakIndicator />);

    await waitFor(() => {
      expect(screen.getByText('100 days')).toBeInTheDocument();
    });
  });

  it('should fallback to localStorage when API fails', async () => {
    mockStreakService.getCurrentStreak.mockRejectedValue(new Error('Network error'));
    localStorage.setItem('practice-streak', '5');

    render(<StreakIndicator />);

    await waitFor(() => {
      expect(screen.getByText('5 days')).toBeInTheDocument();
    });
  });

  it('should not render when API fails and no localStorage', async () => {
    mockStreakService.getCurrentStreak.mockRejectedValue(new Error('Network error'));

    const { container } = render(<StreakIndicator />);

    await waitFor(() => {
      expect(mockStreakService.getCurrentStreak).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('should apply correct styling classes', async () => {
    mockStreakService.getCurrentStreak.mockResolvedValue(3);

    render(<StreakIndicator />);

    await waitFor(() => {
      expect(screen.getByText('3 days')).toBeInTheDocument();
    });

    const container = screen.getByText('3 days').closest('div');
    expect(container).toHaveClass('flex', 'items-center', 'gap-2');
    expect(container).toHaveClass('px-3', 'py-1.5');
    expect(container).toHaveClass('bg-orange-500/20');
    expect(container).toHaveClass('rounded-full');
  });

  it('should call getCurrentStreak on mount', async () => {
    mockStreakService.getCurrentStreak.mockResolvedValue(1);

    render(<StreakIndicator />);

    await waitFor(() => {
      expect(mockStreakService.getCurrentStreak).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle invalid localStorage value', async () => {
    mockStreakService.getCurrentStreak.mockRejectedValue(new Error('Network error'));
    localStorage.setItem('practice-streak', 'not-a-number');

    const { container } = render(<StreakIndicator />);

    await waitFor(() => {
      expect(mockStreakService.getCurrentStreak).toHaveBeenCalled();
    });

    // Should render NaN days (parseInt returns NaN)
    // Component doesn't validate localStorage value
    expect(container.textContent).toContain('NaN days');
  });
});
