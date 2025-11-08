import { Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

export const StreakIndicator = () => {
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from streak service when backend is ready
    // For now, use localStorage for demo
    const savedStreak = localStorage.getItem('practice-streak');
    if (savedStreak) {
      setStreak(parseInt(savedStreak, 10));
    }
    setIsLoading(false);
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
