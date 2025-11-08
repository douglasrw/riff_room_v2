/**
 * Streak tracking service.
 *
 * Tracks daily practice sessions, maintains streaks,
 * and manages achievement unlocks.
 */

import { differenceInDays, startOfDay } from 'date-fns';

export interface Session {
  id: number;
  songId: number;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  loopsPracticed: number;
  stemsUsed?: string[];
}

export interface Streak {
  date: Date;
  practiceTimeSeconds: number;
  songsPracticed: number;
  sessionsCount: number;
}

export interface Achievement {
  id: number;
  achievementType: string;
  achievedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface WeeklyStats {
  totalMinutes: number;
  totalSongs: number;
  avgSessionLength: number;
}

export class StreakService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    // FIXED: Use environment variable instead of hardcoded URL
    this.apiBaseUrl = apiBaseUrl || import.meta.env.VITE_API_URL || 'http://localhost:8007';
  }

  /**
   * Record a practice session.
   */
  async recordSession(
    songId: number,
    duration: number,
    loops: number = 0,
    stemsUsed?: string[]
  ): Promise<void> {
    const today = startOfDay(new Date());

    // Record session
    await fetch(`${this.apiBaseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId,
        startedAt: new Date().toISOString(),
        durationSeconds: duration,
        loopsPracticed: loops,
        stemsUsed: stemsUsed ? JSON.stringify(stemsUsed) : null,
      }),
    });

    // Update daily streak
    await fetch(`${this.apiBaseUrl}/api/streaks/${today.toISOString().split('T')[0]}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        practiceTimeSeconds: duration,
        songsPracticed: 1,
        sessionsCount: 1,
      }),
    });

    // Check achievements
    await this.checkAchievements();
  }

  /**
   * Get current practice streak (consecutive days).
   */
  async getCurrentStreak(): Promise<number> {
    const response = await fetch(`${this.apiBaseUrl}/api/streaks?limit=365`);
    const streaks: Streak[] = await response.json();

    if (streaks.length === 0) return 0;

    let consecutiveDays = 0;
    let expectedDate = startOfDay(new Date());

    for (const streak of streaks) {
      const streakDate = new Date(streak.date);
      const daysDiff = differenceInDays(expectedDate, streakDate);

      if (daysDiff === 0) {
        consecutiveDays++;
        expectedDate = new Date(expectedDate.getTime() - 86400000); // Go back 1 day
      } else if (daysDiff === 1 && consecutiveDays === 0) {
        // Allow for today not practiced yet
        expectedDate = streakDate;
        expectedDate.setDate(expectedDate.getDate() - 1);
        consecutiveDays = 1;
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  /**
   * Get weekly practice statistics.
   */
  async getWeeklyStats(): Promise<WeeklyStats> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const response = await fetch(
      `${this.apiBaseUrl}/api/streaks?since=${weekAgo.toISOString().split('T')[0]}`
    );
    const streaks: Streak[] = await response.json();

    const totalSeconds = streaks.reduce((sum, s) => sum + s.practiceTimeSeconds, 0);
    const totalSongs = streaks.reduce((sum, s) => sum + s.songsPracticed, 0);
    const totalSessions = streaks.reduce((sum, s) => sum + s.sessionsCount, 0);

    return {
      totalMinutes: Math.floor(totalSeconds / 60),
      totalSongs,
      avgSessionLength:
        totalSessions > 0 ? Math.floor(totalSeconds / totalSessions / 60) : 0,
    };
  }

  /**
   * Get all unlocked achievements.
   */
  async getAchievements(): Promise<Achievement[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/achievements`);
    return response.json();
  }

  /**
   * Check and unlock new achievements based on current stats.
   */
  private async checkAchievements(): Promise<void> {
    const streak = await this.getCurrentStreak();

    // Check milestone achievements
    const milestones = [7, 30, 100];
    for (const milestone of milestones) {
      if (streak === milestone) {
        await this.unlockAchievement(`streak_${milestone}`, {
          streak,
          date: new Date().toISOString(),
        });
      }
    }

    // Additional checks could be added here:
    // - Total hours practiced
    // - Total songs practiced
    // - Total loops practiced
  }

  /**
   * Unlock a specific achievement.
   */
  private async unlockAchievement(
    type: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/api/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievementType: type,
          metadata: JSON.stringify(metadata),
        }),
      });

      // Show notification to user
      this.notifyAchievement(type);
    } catch (error) {
      // Achievement might already exist - that's okay
      console.debug('Achievement already unlocked:', type);
    }
  }

  /**
   * Show achievement notification to user.
   */
  private notifyAchievement(type: string): void {
    const messages: Record<string, string> = {
      streak_7: '=% 7-day streak! You\'re on fire!',
      streak_30: '� 30-day streak! Legendary dedication!',
      streak_100: '<� 100-day streak! You\'re unstoppable!',
      songs_10: '<� 10 songs mastered!',
      songs_50: '<� 50 songs mastered! Rock star status!',
      songs_100: '< 100 songs! Musical legend!',
      hours_10: '� 10 hours of practice!',
      hours_50: '=� 50 hours! Serious dedication!',
      hours_100: '<� 100 hours! Elite musician!',
    };

    const message = messages[type] || 'Achievement unlocked!';

    // This would integrate with a toast/notification library
    // For now, just log it
    console.log('[Achievement]', message);

    // In a real app, you'd dispatch to a notification system:
    // toast.success(message);
  }
}

// Singleton instance
export const streakService = new StreakService();
