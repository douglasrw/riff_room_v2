import { Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { streakService } from '../../services/streakService';

export const StreakIndicator = () => {
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // FIXED: Fetch from backend streak service with cleanup to prevent race conditions
    let isMounted = true;

    const fetchStreak = async () => {
      try {
        const currentStreak = await streakService.getCurrentStreak();
        if (isMounted) {
          setStreak(currentStreak);
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error);
        // Fallback to localStorage for offline support
        const savedStreak = localStorage.getItem('practice-streak');
        if (isMounted && savedStreak) {
          setStreak(parseInt(savedStreak, 10));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStreak();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) return null;

  if (streak === 0) return null; // Don't show if no streak

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-full border border-orange-500/30">
      <Flame className="w-4 h-4 text-orange-500" />
      <span className="text-sm font-medium text-orange-500">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  );
};
